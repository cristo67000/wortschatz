/*
 * Le passage de l'ancienne version à la nouvelle, sur le site publié.
 *
 * ── Pourquoi il faut deux temps ────────────────────────────────────────────
 *
 * La seule migration qui compte est celle que vivent les gens : une application
 * posée sur l'écran d'accueil depuis des mois, avec ses cartes, ses échéances et
 * ses réglages, à qui l'on sert un jour une version nouvelle. On ne peut pas
 * l'éprouver après coup — il faut avoir semé les données **avec l'ancienne
 * version**, avant la fusion.
 *
 *     node build/essais_migration_en_ligne.mjs semer     # avant la fusion
 *     node build/essais_migration_en_ligne.mjs relever   # après le déploiement
 *
 * Le profil de navigateur est un dossier à part, créé pour l'occasion et gardé
 * entre les deux temps. Il n'a rien à voir avec le navigateur de qui que ce
 * soit : aucune donnée personnelle réelle n'est touchée.
 */
import { mkdirSync } from 'node:fs';
import { lancerChrome, fermerChrome, ouvrirOnglet } from './pilote_chrome.mjs';

const SITE = 'https://cristo67000.github.io/wortschatz/';
const PROFIL = 'C:\\wz\\profil-migration';

let fautes = 0;
let passees = 0;
function verifier(condition, message, detail) {
  if (condition) { passees += 1; console.log('  ok  ' + message); return true; }
  fautes += 1;
  console.log('  NON ' + message + (detail === undefined ? '' : '  → ' + JSON.stringify(detail)));
  return false;
}
function titre(t) { console.log(''); console.log(t); }

/* Attendre que l'application soit branchée : le site distant met plus de temps
 * que le serveur local, et le noyau fait vingt méga-octets. */
const ATTENDRE_PRET = `
  for (let i = 0; i < 240; i++) {
    if (window.Lexique && Lexique.paquet && window.Store) break;
    await new Promise(x => setTimeout(x, 500));
  }
  await new Promise(x => setTimeout(x, 800));
`;

async function semer() {
  mkdirSync(PROFIL, { recursive: true });
  const chrome = await lancerChrome({ port: 9421, profil: PROFIL });
  const onglet = await ouvrirOnglet(chrome, 'about:blank');
  try {
    titre('Semer — on installe la version en ligne et on lui donne une histoire');
    await onglet.naviguer(SITE);
    const etat = await onglet.evaluer(`
      ${ATTENDRE_PRET}
      await navigator.serviceWorker.register('sw.js').catch(() => {});
      for (let i = 0; i < 240; i++) {
        const r = await navigator.serviceWorker.getRegistration();
        if (r && r.active) break;
        await new Promise(x => setTimeout(x, 500));
      }
      // On laisse le pré-cache du noyau se terminer.
      for (let i = 0; i < 240; i++) {
        const noms = await caches.keys();
        const coquille = noms.find(n => n.startsWith('wortschatz-coquille-'));
        if (coquille) {
          const c = await caches.open(coquille);
          if ((await c.keys()).length > 90) break;
        }
        await new Promise(x => setTimeout(x, 500));
      }
      const bases = await indexedDB.databases();
      return { version: bases.find(b => b.name === 'wortschatz'),
               paquet: Lexique.paquet, caches: await caches.keys(),
               aPerso: !!window.Perso, aNotes: !!window.Notes };
    `);
    verifier(etat.version && etat.version.version === 2,
      'la version en ligne ouvre une base IndexedDB de version 2', etat.version);
    verifier(!etat.aPerso && !etat.aNotes,
      'elle ne connaît ni les mots personnels ni les notes — c’est bien l’ancienne');

    const seme = await onglet.evaluer(`
      ${ATTENDRE_PRET}
      // Trois mots mis en révision, comme après quelques semaines d'usage.
      const mots = [['de','Haus'], ['de','gehen'], ['fr','maison']];
      const poses = [];
      for (const [langue, mot] of mots) {
        const v = Lexique.vedette(langue, mot);
        if (!v) continue;
        const e = await Lexique.ouvrir(v);
        await Revision.apprendre(e);
        poses.push(langue + ' ' + mot);
      }
      // On leur donne une histoire : intervalles, facilités, échéances.
      const cartes = await Store.toutesLesCartes();
      let n = 0;
      for (const c of cartes) {
        n += 1;
        c.etat = 'revision';
        c.intervalle = 10 + n * 3;
        c.facilite = 2.1 + n * 0.05;
        c.reussites = 4 + n;
        c.echecs = 1;
        c.echeance = 1950000000000 + n * 86400000;
        await Store.ecrireCarte(c);
      }
      // Des réponses au journal, des réglages, un historique de consultation.
      for (let i = 0; i < 5; i++) {
        await Store.noter({ quand: Date.now() - i * 3600000, carte: cartes[0].id,
          langue: cartes[0].langue, mot: cartes[0].mot, type: cartes[0].type,
          exercice: 'saisie', qualite: 2, etatAvant: 'revision' });
      }
      await Store.ecrireReglage('nouveautesParJour', 35);
      await Store.ecrireReglage('sensDeTravail', 'vers-de');
      await Store.ecrireReglage('exigerArticle', false);
      await Store.ecrireReglage('langue', 'de');
      await Store.consulter('de', 'Haus');
      await Store.consulter('fr', 'maison');
      const finales = await Store.toutesLesCartes();
      return {
        poses,
        cartes: finales.map(c => [c.id, c.echeance, c.intervalle, c.facilite,
                                  c.reussites, c.echecs, c.etat, c.cree].join('|')).sort(),
        journal: (await Store.journalDepuis(0)).length,
        reglages: await Store.lireReglages(),
        historique: (await Store.historique()).map(h => h.id).sort(),
      };
    `);
    verifier(seme.cartes.length >= 4,
      seme.cartes.length + ' cartes semées sur ' + seme.poses.join(', '));
    verifier(seme.journal === 5, '5 lignes de journal', seme.journal);
    verifier(seme.reglages.nouveautesParJour === 35
             && seme.reglages.sensDeTravail === 'vers-de'
             && seme.reglages.exigerArticle === false
             && seme.reglages.langue === 'de', 'quatre réglages modifiés', seme.reglages);
    verifier(seme.historique.length === 2, '2 mots consultés', seme.historique);

    console.log('');
    console.log('EMPREINTE À CONSERVER :');
    console.log(JSON.stringify({ cartes: seme.cartes, journal: seme.journal,
                                 reglages: seme.reglages, historique: seme.historique }));
  } finally {
    onglet.fermer();
    fermerChrome(chrome);
  }
}

async function relever(empreinte) {
  const chrome = await lancerChrome({ port: 9422, profil: PROFIL });
  const onglet = await ouvrirOnglet(chrome, 'about:blank');
  try {
    titre('Relever — le même profil reçoit la nouvelle version');
    await onglet.naviguer(SITE);

    /* Une application posée sur l'écran d'accueil ne se recharge jamais toute
     * seule : la nouvelle version s'installe et attend le feu vert. On le lui
     * donne, comme le ferait le bandeau, puis on recharge. */
    const bascule = await onglet.evaluer(`
      ${ATTENDRE_PRET}
      const r = await navigator.serviceWorker.getRegistration();
      if (r) await r.update().catch(() => {});
      for (let i = 0; i < 120; i++) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.waiting) { reg.waiting.postMessage({ type: 'passer-devant' }); break; }
        await new Promise(x => setTimeout(x, 500));
      }
      await new Promise(x => setTimeout(x, 3000));
      return { attendait: !!(await navigator.serviceWorker.getRegistration()).waiting };
    `);
    await onglet.naviguer(SITE);
    await onglet.naviguer(SITE);

    const apres = await onglet.evaluer(`
      ${ATTENDRE_PRET}
      const bases = await indexedDB.databases();
      const cartes = await Store.toutesLesCartes();
      return {
        versionBase: (bases.find(b => b.name === 'wortschatz') || {}).version,
        aPerso: !!window.Perso, aNotes: !!window.Notes,
        aMesMots: !!window.MesMots, aSauvegarde: !!window.Sauvegarde,
        cartes: cartes.map(c => [c.id, c.echeance, c.intervalle, c.facilite,
                                 c.reussites, c.echecs, c.etat, c.cree].join('|')).sort(),
        journal: (await Store.journalDepuis(0)).length,
        reglages: await Store.lireReglages(),
        historique: (await Store.historique()).map(h => h.id).sort(),
        entreesDe: Lexique.manifeste.paquets.complet.entrees.de,
        construit: Lexique.manifeste.construit,
      };
    `);

    verifier(apres.versionBase === 3, 'la base est passée en version 3', apres.versionBase);
    verifier(apres.aPerso && apres.aNotes && apres.aMesMots && apres.aSauvegarde,
      'les quatre modules de la version 3 sont chargés', apres);
    verifier(apres.entreesDe === 63280,
      'le manifeste servi est celui du dictionnaire élargi', apres.entreesDe);

    titre('Rien de ce qui était là ne doit avoir bougé');
    verifier(JSON.stringify(apres.cartes) === JSON.stringify(empreinte.cartes),
      'les cartes sont identiques — échéance, intervalle, facilité, réussites, échecs, création',
      { avant: empreinte.cartes, apres: apres.cartes });
    verifier(apres.journal === empreinte.journal,
      'le journal est intact (' + apres.journal + ' lignes)');
    for (const cle of ['nouveautesParJour', 'sensDeTravail', 'exigerArticle', 'langue']) {
      verifier(apres.reglages[cle] === empreinte.reglages[cle],
        'réglage « ' + cle +' » conservé : ' + JSON.stringify(apres.reglages[cle]));
    }
    verifier(JSON.stringify(apres.historique) === JSON.stringify(empreinte.historique),
      'l’historique de consultation est intact', apres.historique);

    titre('Et les fonctions nouvelles marchent sur ces données');
    const neuf = await onglet.evaluer(`
      const mot = await Perso.creer({ mot: 'FFI', langue: 'fr', nature: '',
        traductions: 'Widerstandsbewegung, Résistance intérieure française' });
      await Notes.ecrire({ perso: mot.id, langue: 'fr', mot: 'FFI' },
        'Forces françaises de l’intérieur.');
      await Notes.ecrire({ langue: 'de', mot: 'Haus' }, 'das Haus, die Häuser.');
      const cartesAvant = (await Store.toutesLesCartes()).length;
      await Revision.apprendre(Perso.entree(mot.id));
      return { uid: mot.id,
        parVedette: Lexique.chercher('FFI').some(r => r.perso === mot.id),
        parTraduction: Lexique.chercher('Widerstandsbewegung').some(r => r.perso === mot.id),
        noteDico: (await Notes.lire({ langue: 'de', mot: 'Haus' })).texte,
        notePerso: (await Notes.lire({ perso: mot.id })).texte,
        cartesAjoutees: (await Store.toutesLesCartes()).length - cartesAvant };
    `);
    verifier(neuf.parVedette && neuf.parTraduction,
      '« FFI » se cherche dans les deux sens sur le site publié');
    verifier(neuf.noteDico.startsWith('das Haus'),
      'une note sur une entrée du dictionnaire s’écrit et se relit');
    verifier(neuf.notePerso.startsWith('Forces'),
      'une note sur un mot personnel aussi');
    verifier(neuf.cartesAjoutees === 1,
      'le réglage « vers l’allemand » hérité de la v2 est respecté : une seule carte',
      neuf.cartesAjoutees);

    titre('Après un dernier rechargement, tout tient');
    await onglet.naviguer(SITE);
    const final = await onglet.evaluer(`
      ${ATTENDRE_PRET}
      const cartes = await Store.toutesLesCartes();
      return { perso: Perso.compte(),
        notes: (await Store.toutesLesNotes()).length,
        anciennes: cartes.filter(c => !c.perso).length,
        ffi: Lexique.chercher('FFI').some(r => r.perso),
        note: !!(await Notes.lire({ langue: 'de', mot: 'Haus' })) };
    `);
    verifier(final.perso === 1 && final.notes === 2 && final.ffi && final.note,
      'mots personnels et notes survivent au rechargement', final);
    verifier(final.anciennes === empreinte.cartes.length,
      'les cartes de la version 2 sont toujours là', final.anciennes);
  } finally {
    onglet.fermer();
    fermerChrome(chrome);
  }
}

const commande = process.argv[2];
const suite = commande === 'semer'
  ? semer()
  : relever(JSON.parse(process.argv[3] || '{}'));

suite.then(() => {
  console.log('');
  console.log(fautes ? `${passees} contrôles passés, ${fautes} ÉCHEC(S).`
                     : `${passees} contrôles passés.`);
  process.exit(fautes ? 1 : 0);
}).catch((e) => { console.error('\nÉchec inattendu :', e); process.exit(1); });
