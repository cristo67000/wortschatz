/*
 * Un pilote Chrome minimal, par le protocole DevTools.
 *
 * Node 24 porte un WebSocket natif : aucune dépendance n'est nécessaire pour
 * lancer un vrai Chrome, y exécuter du JavaScript et l'observer. C'est ce qu'il
 * faut ici, parce que le navigateur intégré à l'atelier refuse d'enregistrer un
 * service worker — et qu'un mode hors ligne qu'on n'a pas vu marcher n'est pas
 * un mode hors ligne.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* Où trouver un Chrome. La variable d'environnement `CHROME` l'emporte, pour
 * qui l'a installé ailleurs ou veut essayer avec un autre Chromium. */
const CHEMINS = [
  process.env.CHROME,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

function trouverChrome() {
  for (const chemin of CHEMINS) {
    if (existsSync(chemin)) return chemin;
  }
  throw new Error('Chrome introuvable. Indiquez-le par la variable CHROME.');
}

export async function lancerChrome({ port = 9222, profil = null, telechargements = null } = {}) {
  const dossier = profil || mkdtempSync(path.join(tmpdir(), 'wortschatz-profil-'));
  const arguments_ = [
    '--headless=new',
    '--remote-debugging-port=' + port,
    '--user-data-dir=' + dossier,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    // Chrome refuse le stockage persistant dans un profil neuf sans cela.
    '--enable-features=NetworkService',
    'about:blank',
  ];
  if (telechargements) arguments_.push('--disable-features=DownloadBubble');
  const processus = spawn(trouverChrome(), arguments_, { stdio: 'ignore', detached: false });

  // On attend que le point d'entrée réponde.
  let version = null;
  for (let essai = 0; essai < 60; essai += 1) {
    try {
      version = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json());
      break;
    } catch (erreur) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  if (!version) throw new Error('Chrome n’a pas répondu sur le port ' + port);
  /* Un autre navigateur peut déjà écouter ce port — l'atelier en ouvre un pour
   * son propre aperçu. S'y attacher par mégarde donnerait une épreuve qui ne
   * prouve rien : on vérifie donc qu'on parle bien à celui qu'on vient de
   * lancer. */
  if (!/^Chrome\//.test(version.Browser || '')) {
    throw new Error('Le port ' + port + ' est tenu par ' + version.Browser
      + ' — choisissez-en un autre.');
  }
  return { processus, port, dossier, version, ephemere: !profil };
}

export function fermerChrome(chrome) {
  try { chrome.processus.kill(); } catch (e) { /* déjà parti */ }
  if (chrome.ephemere) {
    try { rmSync(chrome.dossier, { recursive: true, force: true }); } catch (e) { /* tant pis */ }
  }
}

/* Une session attachée à un onglet. `evaluer()` rend la valeur JSON du dernier
 * calcul, en attendant les promesses — c'est tout ce dont les épreuves ont
 * besoin. */
export async function ouvrirOnglet(chrome, url) {
  const cible = await fetch(
    `http://127.0.0.1:${chrome.port}/json/new?${encodeURIComponent(url)}`,
    { method: 'PUT' }).then((r) => r.json());
  const prise = new WebSocket(cible.webSocketDebuggerUrl);
  await new Promise((resoudre, rejeter) => {
    prise.onopen = resoudre;
    prise.onerror = () => rejeter(new Error('WebSocket refusé'));
  });

  let numero = 0;
  const attentes = new Map();
  prise.onmessage = (message) => {
    const donnees = JSON.parse(message.data);
    if (donnees.id && attentes.has(donnees.id)) {
      const { resoudre, rejeter } = attentes.get(donnees.id);
      attentes.delete(donnees.id);
      if (donnees.error) rejeter(new Error(JSON.stringify(donnees.error)));
      else resoudre(donnees.result);
    }
  };

  function envoyer(methode, parametres) {
    numero += 1;
    const id = numero;
    return new Promise((resoudre, rejeter) => {
      attentes.set(id, { resoudre, rejeter });
      prise.send(JSON.stringify({ id, method: methode, params: parametres || {} }));
      setTimeout(() => {
        if (attentes.has(id)) {
          attentes.delete(id);
          rejeter(new Error('délai dépassé : ' + methode));
        }
      }, 120000);
    });
  }

  async function evaluer(source) {
    const resultat = await envoyer('Runtime.evaluate', {
      expression: `(async () => { ${source} })()`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (resultat.exceptionDetails) {
      throw new Error('JS : ' + JSON.stringify(resultat.exceptionDetails.exception
        && resultat.exceptionDetails.exception.description || resultat.exceptionDetails));
    }
    return resultat.result.value;
  }

  async function naviguer(vers) {
    await envoyer('Page.enable');
    await envoyer('Page.navigate', { url: vers });
    // On attend que le document soit prêt, puis que l'application se branche.
    for (let essai = 0; essai < 120; essai += 1) {
      await new Promise((r) => setTimeout(r, 250));
      try {
        const pret = await evaluer('return document.readyState');
        if (pret === 'complete') return true;
      } catch (erreur) { /* la page change sous nos pieds */ }
    }
    return false;
  }

  await envoyer('Runtime.enable');
  await envoyer('Page.enable');
  return { envoyer, evaluer, naviguer, fermer: () => prise.close() };
}
