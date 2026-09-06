/*
 * Le mode hors ligne, éprouvé pour de vrai.
 *
 * On lance un Chrome complet, on le laisse installer son service worker et
 * pré-cacher le noyau, on ajoute « FFI » avec sa note, puis **on arrête le
 * serveur**. Il n'y a alors plus rien à l'autre bout : ce n'est pas une
 * émulation de coupure, c'est une coupure. On recharge, et on regarde.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { lancerChrome, fermerChrome, ouvrirOnglet } from './pilote_chrome.mjs';

const RACINE = 'C:\\wz\\wortschatz';
const PORT_WEB = 8143;
const ORIGINE = 'http://localhost:' + PORT_WEB + '/';

let fautes = 0;
let passees = 0;
function verifier(condition, message, detail) {
  if (condition) { passees += 1; console.log('  ok  ' + message); return true; }
  fautes += 1;
  console.log('  NON ' + message + (detail === undefined ? '' : '  → ' + JSON.stringify(detail)));
  return false;
}
function titre(t) { console.log(''); console.log(t); }

function demarrerServeur() {
  const p = spawn('python', ['-m', 'http.server', String(PORT_WEB), '--directory', RACINE],
                  { stdio: 'ignore' });
  return p;
}

async function attendreServeur(present) {
  for (let essai = 0; essai < 40; essai += 1) {
    try {
      await fetch(ORIGINE + 'index.html', { cache: 'no-store' });
      if (present) return true;
    } catch (erreur) {
      if (!present) return true;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function principal() {
  let serveur = demarrerServeur();
  await attendreServeur(true);
  const chrome = await lancerChrome({ port: 9411 });
  console.log('Chrome : ' + chrome.version.Browser);
  const onglet = await ouvrirOnglet(chrome, 'about:blank');

  try {
    titre('1. Installation : service worker et pré-cache du noyau');
    await onglet.naviguer(ORIGINE);
    const install = await onglet.evaluer(`
      const r = await navigator.serviceWorker.register('sw.js').catch(e => ({ erreur: e.message }));
      if (r.erreur) return { erreur: r.erreur };
      // On attend l'activation, puis la fin du pré-cache.
      for (let i = 0; i < 200; i++) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.active) break;
        await new Promise(x => setTimeout(x, 250));
      }
      let fichiers = 0;
      for (let i = 0; i < 240; i++) {
        const noms = await caches.keys();
        const coquille = noms.find(n => n.startsWith('wortschatz-coquille-'));
        if (coquille) {
          const c = await caches.open(coquille);
          fichiers = (await c.keys()).length;
          const manifeste = await fetch('data/manifeste.json').then(x => x.json());
          const attendus = manifeste.paquets.noyau.fichiers.length + 30;
          if (fichiers >= attendus) break;
        }
        await new Promise(x => setTimeout(x, 500));
      }
      const noms = await caches.keys();
      const coquille = noms.find(n => n.startsWith('wortschatz-coquille-'));
      const c = await caches.open(coquille);
      const cles = (await c.keys()).map(q => new URL(q.url).pathname);
      return { scope: r.scope, caches: noms, fichiers: cles.length,
               aIndex: cles.includes('/index.html'),
               aPerso: cles.includes('/js/perso.js'),
               aNotes: cles.includes('/js/notes.js'),
               aMesMots: cles.includes('/js/mesmots.js'),
               aSauvegarde: cles.includes('/js/sauvegarde.js'),
               fichiersNoyau: cles.filter(k => k.startsWith('/data/noyau/')).length };
    `);
    if (install.erreur) {
      console.log('  ÉCHEC d’enregistrement : ' + install.erreur);
      fautes += 1;
    } else {
      verifier(true, 'service worker enregistré (' + install.scope + ')');
      verifier(install.fichiers > 90, install.fichiers + ' fichiers en cache', install);
      verifier(install.fichiersNoyau >= 70,
        install.fichiersNoyau + ' fichiers du noyau pré-cachés');
      verifier(install.aIndex && install.aPerso && install.aNotes
               && install.aMesMots && install.aSauvegarde,
        'les quatre modules de la version 3 sont pré-cachés', install);
    }

    titre('2. On ajoute « FFI », sa note, et on l’apprend');
    const ajout = await onglet.evaluer(`
      await new Promise(x => setTimeout(x, 500));
      const mot = await Perso.creer({
        mot: 'FFI', langue: 'fr', nature: '',
        traductions: 'Widerstandsbewegung, Résistance intérieure française',
      });
      await Notes.ecrire({ perso: mot.id, langue: 'fr', mot: 'FFI' },
        'Forces françaises de l’intérieur.\\nLes maquis, 1944.');
      const cartes = await Revision.apprendre(Perso.entree(mot.id));
      return { uid: mot.id, cartes: cartes.map(c => c.type).sort(),
               parVedette: Lexique.chercher('FFI').some(r => r.perso === mot.id),
               parTraduction: Lexique.chercher('Widerstandsbewegung').some(r => r.perso === mot.id) };
    `);
    verifier(ajout.parVedette, '« FFI » se trouve par sa vedette');
    verifier(ajout.parTraduction, '« Widerstandsbewegung » retrouve « FFI »');
    verifier(JSON.stringify(ajout.cartes) === JSON.stringify(['vers-de', 'vers-fr']),
      'deux cartes, une par direction — pas de carte de genre', ajout.cartes);

    titre('3. Fermeture et réouverture, serveur toujours en ligne');
    await onglet.naviguer(ORIGINE);
    const rouvert = await onglet.evaluer(`
      await new Promise(x => setTimeout(x, 1500));
      const note = await Notes.lire({ perso: '${ajout.uid}' });
      return { compte: Perso.compte(),
               parVedette: Lexique.chercher('FFI').some(r => r.perso === '${ajout.uid}'),
               parTraduction: Lexique.chercher('Widerstandsbewegung').some(r => r.perso === '${ajout.uid}'),
               note: note && note.texte,
               cartes: (await Store.cartesDuMot(null, null, '${ajout.uid}')).length };
    `);
    verifier(rouvert.parVedette, '« FFI » est encore là après réouverture');
    verifier(rouvert.parTraduction, 'et se retrouve toujours par « Widerstandsbewegung »');
    verifier(rouvert.note && rouvert.note.includes('Forces françaises'),
      'sa note est intacte', rouvert.note);
    verifier(rouvert.cartes === 2, 'ses deux cartes sont là', rouvert.cartes);

    titre('4. Modification : la note et les échéances doivent survivre');
    const modif = await onglet.evaluer(`
      const uid = '${ajout.uid}';
      // On fait mûrir les cartes, comme trois semaines de révisions.
      const avant = await Store.cartesDuMot(null, null, uid);
      for (const c of avant) {
        c.etat = 'revision'; c.intervalle = 21; c.facilite = 2.45;
        c.echeance = 1888000000000 + (c.type === 'vers-de' ? 0 : 3600000);
        c.reussites = 6;
        await Store.ecrireCarte(c);
      }
      const empreinte = (l) => l.slice().sort((a,b)=>a.id<b.id?-1:1)
        .map(c => [c.id, c.echeance, c.intervalle, c.facilite, c.reussites, c.etat].join('|'));
      const avantEmpreinte = empreinte(await Store.cartesDuMot(null, null, uid));
      await Perso.modifier(uid, { mot: 'les FFI', langue: 'fr', nature: '',
        traductions: 'Widerstandsbewegung, Résistance intérieure française, Maquis' });
      const apres = await Store.cartesDuMot(null, null, uid);
      const note = await Notes.lire({ perso: uid });
      return { identiques: JSON.stringify(empreinte(apres)) === JSON.stringify(avantEmpreinte),
               avantEmpreinte, apresEmpreinte: empreinte(apres),
               graphie: apres.map(c => c.mot), note: note && note.texte,
               noteMot: note && note.mot,
               nouvelleTraduction: Lexique.chercher('Maquis').some(r => r.perso === uid),
               ancienneTraduction: Lexique.chercher('Widerstandsbewegung').some(r => r.perso === uid) };
    `);
    verifier(modif.identiques,
      'échéances, intervalles, facilités et réussites inchangés après modification',
      { avant: modif.avantEmpreinte, apres: modif.apresEmpreinte });
    verifier(modif.graphie.every(m => m === 'les FFI'),
      'les cartes portent la graphie corrigée', modif.graphie);
    verifier(modif.note && modif.note.includes('Forces françaises'),
      'la note est conservée', modif.note);
    verifier(modif.noteMot === 'les FFI', 'la note suit la nouvelle graphie', modif.noteMot);
    verifier(modif.nouvelleTraduction && modif.ancienneTraduction,
      'anciennes et nouvelles traductions restent cherchables');

    titre('5. HORS LIGNE : on arrête le serveur pour de bon');
    serveur.kill();
    await attendreServeur(false);
    let joignable = true;
    try { await fetch(ORIGINE + 'index.html', { cache: 'no-store' }); }
    catch (e) { joignable = false; }
    verifier(!joignable, 'le serveur ne répond plus — la coupure est réelle');

    await onglet.naviguer(ORIGINE);
    const horsLigne = await onglet.evaluer(`
      await new Promise(x => setTimeout(x, 2500));
      let reseau = 'inconnu';
      try { await fetch('data/manifeste.json?sonde=' + Date.now(), { cache: 'no-store' });
            reseau = 'joignable'; }
      catch (e) { reseau = 'coupé'; }
      const note = await Notes.lire({ perso: '${ajout.uid}' });
      const cartes = await Store.cartesDuMot(null, null, '${ajout.uid}');
      return {
        titre: document.title,
        demarrageFini: document.getElementById('demarrage').hidden
                       || document.getElementById('demarrage').classList.contains('parti'),
        reseau,
        paquet: Lexique.paquet,
        entreesIndex: Lexique.etat.index.de.debuts.length,
        chercheDico: Lexique.chercher('Haus').filter(r => !r.perso).map(r => r.mot).slice(0, 3),
        chercheForme: Lexique.chercher('ging').filter(r => !r.perso).map(r => r.mot).slice(0, 2),
        persoCompte: Perso.compte(),
        ffiParVedette: Lexique.chercher('FFI').some(r => r.perso === '${ajout.uid}'),
        ffiParTraduction: Lexique.chercher('Widerstandsbewegung').some(r => r.perso === '${ajout.uid}'),
        note: note && note.texte,
        cartes: cartes.length,
        echeances: cartes.map(c => c.echeance).sort(),
      };
    `);
    verifier(horsLigne.reseau === 'coupé',
      'depuis la page, le réseau est bien coupé', horsLigne.reseau);
    verifier(horsLigne.demarrageFini, 'l’application s’ouvre sans réseau');
    verifier(horsLigne.paquet === 'noyau', 'le dictionnaire est chargé', horsLigne.paquet);
    verifier(horsLigne.entreesIndex === 12000,
      'l’index allemand est complet (' + horsLigne.entreesIndex + ' vedettes)');
    verifier(horsLigne.chercheDico.includes('Haus'),
      'la recherche du dictionnaire marche hors ligne', horsLigne.chercheDico);
    verifier(horsLigne.chercheForme.includes('gehen'),
      '« ging » mène toujours à « gehen » hors ligne', horsLigne.chercheForme);
    verifier(horsLigne.ffiParVedette, '« FFI » se trouve hors ligne');
    verifier(horsLigne.ffiParTraduction,
      '« Widerstandsbewegung » retrouve « FFI » hors ligne');
    verifier(horsLigne.note && horsLigne.note.includes('Forces françaises'),
      'la note personnelle est lisible hors ligne', horsLigne.note);
    verifier(horsLigne.cartes === 2 && horsLigne.echeances[0] === 1888000000000,
      'les échéances sont intactes hors ligne', horsLigne.echeances);

    titre('6. Une fiche complète s’ouvre hors ligne');
    const fiche = await onglet.evaluer(`
      const trouve = Lexique.chercher('Haus').find(r => !r.perso && r.mot === 'Haus');
      await App.ouvrirFiche(trouve);
      await new Promise(x => setTimeout(x, 1200));
      const texte = document.getElementById('fiche-contenu').textContent;
      return { ouverte: !document.getElementById('fiche').hidden,
               article: texte.slice(0, 40),
               aExemple: texte.length > 400, longueur: texte.length };
    `);
    verifier(fiche.ouverte, 'la fiche s’ouvre', fiche);
    verifier(fiche.aExemple,
      'elle porte ses sens et ses exemples (' + fiche.longueur + ' signes)');

    // Le serveur repart pour l'épreuve suivante.
    serveur = demarrerServeur();
    await attendreServeur(true);
    console.log('');
    console.log('Identifiant de FFI pour l’épreuve d’export : ' + ajout.uid);
    return { uid: ajout.uid, serveur };
  } finally {
    onglet.fermer();
    fermerChrome(chrome);
  }
}

principal().then((r) => {
  console.log('');
  console.log(fautes ? `${passees} contrôles passés, ${fautes} ÉCHEC(S).`
                     : `${passees} contrôles passés. Le mode hors ligne fonctionne.`);
  if (r && r.serveur) r.serveur.kill();
  process.exit(fautes ? 1 : 0);
}).catch((e) => {
  console.error('\nÉchec inattendu :', e);
  process.exit(1);
});
