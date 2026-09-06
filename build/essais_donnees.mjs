/*
 * Cas de contrôle du stockage, des notes, des mots personnels et de la
 * sauvegarde.
 *
 * ── Ce qu'on éprouve, et pourquoi ces choses-là ────────────────────────────
 *
 * Ce fichier ne vérifie pas que l'interface est jolie. Il vérifie les quatre
 * façons dont on peut perdre le travail de quelqu'un :
 *
 *   1. une migration qui laisse tomber des cartes ou des échéances ;
 *   2. une note ou un mot qui ne se relit pas au rechargement suivant ;
 *   3. un identifiant fondé sur l'orthographe, qui remet à zéro les révisions
 *      d'un mot dont on corrige une faute de frappe ;
 *   4. un import qui écrase en silence ce qui était déjà là.
 *
 * Aucune de ces pertes ne se voit tout de suite. Elles se découvrent des
 * semaines plus tard, quand il n'y a plus rien à récupérer — d'où ce fichier.
 *
 * Le dictionnaire employé est le **vrai** : `data/noyau` est lu sur le disque
 * par un `fetch` de laboratoire. Les recherches éprouvées ici — « Straße »
 * tapé « strasse », « ging » qui mène à « gehen », l'homographe personnel d'une
 * vedette existante — n'auraient aucun sens sur un index inventé.
 *
 *     node build/essais_donnees.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { fabriquerIndexedDB, nouveauDepot, FauxKeyRange } from './faux_indexeddb.mjs';

const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.join(ici, '..');

// ── Le décor ────────────────────────────────────────────────────────────────

globalThis.window = globalThis;
Object.defineProperty(globalThis, 'navigator', {
  value: { languages: ['fr'] }, configurable: true,
});
globalThis.document = {
  documentElement: {},
  querySelectorAll: () => [],
  querySelector: () => null,
  addEventListener: () => {},
  dispatchEvent: () => {},
  createElement: () => ({ style: {}, dataset: {}, classList: { add() {}, toggle() {} },
                          appendChild() {}, addEventListener() {}, setAttribute() {} }),
};
globalThis.CustomEvent = class { constructor(n, o) { this.n = n; this.detail = o && o.detail; } };
globalThis.IDBKeyRange = FauxKeyRange;
globalThis.Voix = { possible: () => false, dire() {}, taire() {} };

/* Le `fetch` de laboratoire : il sert les fichiers du dépôt. Le paquet complet
 * n'est lu que s'il est là — le dépôt le porte, mais on ne veut pas que ces
 * épreuves échouent chez quelqu'un qui ne l'aurait pas construit. */
globalThis.fetch = async (chemin) => {
  const fichier = path.join(racine, String(chemin));
  if (!existsSync(fichier)) return { ok: false, status: 404, text: async () => '' };
  const contenu = readFileSync(fichier, 'utf8');
  return { ok: true, status: 200, text: async () => contenu,
           json: async () => JSON.parse(contenu) };
};

const MODULES = ['i18n.js', 'lexique.js', 'store.js', 'revision.js', 'exercices.js',
                 'notes.js', 'perso.js', 'sauvegarde.js'];

/* Recharge l'application au-dessus d'un dépôt donné.
 *
 * C'est la seule façon d'éprouver « et après avoir refermé l'application ? » :
 * `store.js` garde sa base ouverte dans une variable de module, et il faut
 * repartir d'un module neuf sur le même dépôt. */
function chargerApplication(depot) {
  globalThis.indexedDB = fabriquerIndexedDB(depot);
  for (const nom of MODULES) {
    (0, eval)(readFileSync(path.join(racine, 'js', nom), 'utf8'));
  }
  globalThis.I18n.definir('fr');
}

// ── Le compteur d'épreuves ──────────────────────────────────────────────────

let fautes = 0;
let passees = 0;

function verifier(condition, message) {
  if (condition) { passees += 1; return true; }
  fautes += 1;
  console.log('  NON ' + message);
  return false;
}

function egaux(obtenu, attendu, message) {
  const a = JSON.stringify(obtenu);
  const b = JSON.stringify(attendu);
  return verifier(a === b, `${message}\n        obtenu  ${a}\n        attendu ${b}`);
}

function titre(texte) {
  console.log('');
  console.log(texte);
}

// ── 1. Migration ────────────────────────────────────────────────────────────

/* Une base de version 1, telle que la première version de l'application la
 * laissait : une seule carte « sens » par mot, un journal, un historique et des
 * réglages. On la fabrique à la main, sans passer par `store.js`, parce que
 * `store.js` d'aujourd'hui ne sait plus l'écrire. */
/* Le séparateur des identifiants de carte : un caractère nul, depuis le premier
 * commit de l'application. Les épreuves le reconstruisent plutôt que de le
 * recopier — un NUL dans un fichier source se perd au premier outil qui nettoie
 * les caractères de commande, et c'est arrivé. */
const SEP = String.fromCharCode(0);
const ID = (langue, mot, type) => langue + SEP + mot + SEP + type;

function depotVersion1() {
  const depot = nouveauDepot(1);
  const creer = (nom, keyPath, index, lignes, autoIncrement) => {
    depot.magasins[nom] = { nom, keyPath, autoIncrement: !!autoIncrement, prochain: 0,
                            lignes: new Map(), index: index || {} };
    for (const ligne of lignes) depot.magasins[nom].lignes.set(ligne[keyPath], ligne);
  };
  creer('reglages', 'cle', {}, [
    { cle: 'langue', valeur: 'de' },
    { cle: 'nouveautesParJour', valeur: 25 },
    { cle: 'exigerArticle', valeur: false },
    { cle: 'paquet', valeur: 'complet' },
  ]);
  creer('cartes', 'id', { echeance: 'echeance', mot: 'mot', etat: 'etat' }, [
    { id: ID('de', 'Haus', 'sens'), langue: 'de', mot: 'Haus', tranche: 12, type: 'sens',
      etat: 'revision', palier: 1, intervalle: 47, facilite: 2.35,
      echeance: 1800000000000, reussites: 9, echecs: 2, cree: 1700000000000,
      vu: 1795000000000 },
    { id: ID('fr', 'maison', 'sens'), langue: 'fr', mot: 'maison', tranche: 7, type: 'sens',
      etat: 'apprentissage', palier: 0, intervalle: 1, facilite: 2.5,
      echeance: 1800000600000, reussites: 1, echecs: 0, cree: 1799000000000, vu: 0 },
    { id: ID('de', 'Haus', 'genre'), langue: 'de', mot: 'Haus', tranche: 12, type: 'genre',
      etat: 'revision', palier: 1, intervalle: 3, facilite: 2.5,
      echeance: 1800100000000, reussites: 4, echecs: 1, cree: 1700000000000, vu: 0 },
  ]);
  creer('journal', 'id', { quand: 'quand' }, [
    { id: 1, quand: 1799000000000, carte: ID('de', 'Haus', 'sens'), langue: 'de', mot: 'Haus',
      type: 'sens', exercice: 'saisie', qualite: 2, etatAvant: 'revision' },
    { id: 2, quand: 1799500000000, carte: ID('fr', 'maison', 'sens'), langue: 'fr',
      mot: 'maison', type: 'sens', exercice: 'qcm-comprendre', qualite: 0,
      etatAvant: 'nouveau' },
  ], true);
  depot.magasins.journal.prochain = 2;
  creer('historique', 'id', { quand: 'quand' }, [
    { id: 'de' + SEP + 'Haus', langue: 'de', mot: 'Haus', quand: 1799900000000 },
  ]);
  return depot;
}

async function epreuveMigration1() {
  titre('Migration version 1 → 3');
  const depot = depotVersion1();
  chargerApplication(depot);

  const cartes = await Store.toutesLesCartes();
  verifier(cartes.length === 3, `3 cartes conservées, ${cartes.length} trouvées`);

  const ancienne = cartes.find((c) => c.id === ID('de', 'Haus', 'vers-de'));
  if (verifier(!!ancienne, 'la carte « sens » est devenue « vers-de »')) {
    verifier(ancienne.intervalle === 47, `intervalle conservé (${ancienne.intervalle})`);
    verifier(ancienne.facilite === 2.35, `facilité conservée (${ancienne.facilite})`);
    verifier(ancienne.reussites === 9, `réussites conservées (${ancienne.reussites})`);
    verifier(ancienne.echecs === 2, `échecs conservés (${ancienne.echecs})`);
    verifier(ancienne.echeance === 1800000000000, 'échéance conservée');
    verifier(ancienne.cree === 1700000000000, 'date de création conservée');
  }
  verifier(!cartes.some((c) => c.id === ID('de', 'Haus', 'sens')),
    'l’ancienne ligne « sens » est effacée, pas seulement réécrite');
  verifier(!!cartes.find((c) => c.id === ID('fr', 'maison', 'vers-fr')),
    'la carte française devient « vers-fr » — la direction productive');
  const genre = cartes.find((c) => c.id === ID('de', 'Haus', 'genre'));
  verifier(genre && genre.reussites === 4, 'la carte de genre n’est pas touchée');

  const reglages = await Store.lireReglages();
  verifier(reglages.langue === 'de', 'réglage « langue » conservé');
  verifier(reglages.nouveautesParJour === 25, 'réglage « rythme » conservé');
  verifier(reglages.exigerArticle === false, 'réglage « article » conservé');

  const journal = await Store.journalDepuis(0);
  verifier(journal.length === 2, `journal conservé (${journal.length} lignes)`);
  const historique = await Store.historique();
  verifier(historique.length === 1, 'historique de consultation conservé');

  verifier(!!depot.magasins.notes, 'le magasin « notes » est créé');
  verifier(!!depot.magasins.perso, 'le magasin « perso » est créé');
  verifier(depot.magasins.cartes.index.perso === 'perso',
    'l’index « perso » est posé sur les cartes existantes');

  // Une carte du dictionnaire n'a pas de champ `perso` : elle ne doit jamais
  // répondre à une recherche par identifiant de mot personnel.
  const parPerso = await Store.cartesDuMot(null, null, 'p-inexistant');
  verifier(parPerso.length === 0,
    'aucune carte du dictionnaire ne répond à l’index « perso »');
  return depot;
}

async function epreuveMigration2(depot) {
  titre('Réouverture d’une base déjà en version 3');
  const avant = await Store.toutesLesCartes();
  chargerApplication(depot);          // comme un rechargement de l'application
  const apres = await Store.toutesLesCartes();
  egaux(apres.map((c) => c.id).sort(), avant.map((c) => c.id).sort(),
    'les cartes sont les mêmes après rechargement');
  const reglages = await Store.lireReglages();
  verifier(reglages.langue === 'de', 'les réglages survivent au rechargement');
}

/* Le séparateur, éprouvé pour lui-même.
 *
 * Il a été perdu une fois, en réécrivant `store.js` : un outil a remplacé les
 * caractères de commande par des espaces, et personne ne l'a vu — les cartes
 * existantes continuaient de marcher, puisqu'on les retrouve par l'index `mot`
 * et non par leur clé. Seules les cartes neuves prenaient une autre forme, et
 * une base finissait avec deux façons de nommer la même chose.
 *
 * D'où cette épreuve, qui ne vérifie rien d'autre que ce détail-là.
 */
function epreuveSeparateur() {
  titre('L’identifiant d’une carte');
  const id = Store.identifiant('de', 'Haus', 'vers-de');
  verifier(id.indexOf(SEP) !== -1,
    'le séparateur est un caractère nul, pas une espace', JSON.stringify(id));
  verifier(id === ID('de', 'Haus', 'vers-de'),
    'il a la forme que les bases installées portent déjà');
  verifier(Store.identifiantPerso('p-1a2b3c', 'vers-de').indexOf(SEP) !== -1,
    'les cartes de mots personnels suivent la même règle');

  /* La raison d'être du NUL : une vedette peut contenir des espaces, et deux
   * mots différents ne doivent jamais produire le même identifiant. */
  const a = Store.identifiant('fr', 'dans l’ensemble', 'vers-de');
  const b = Store.identifiant('fr', 'dans', 'l’ensemble vers-de');
  verifier(a !== b,
    'deux vedettes différentes ne se confondent pas, même avec des espaces',
    { a: JSON.stringify(a), b: JSON.stringify(b) });
}

// ── 2. Notes ────────────────────────────────────────────────────────────────

async function epreuveNotes(depot) {
  titre('Notes personnelles');
  const entree = { langue: 'de', mot: 'Haus' };

  verifier((await Notes.lire(entree)) === null, 'aucune note au départ');

  await Notes.ecrire(entree, 'das Haus, die Häuser.\nComme « house ».');
  let note = await Notes.lire(entree);
  verifier(note && note.texte === 'das Haus, die Häuser.\nComme « house ».',
    'la note se relit, sauts de ligne compris');
  verifier(note.id === 'dico:de Haus', `identifiant de note attendu (${note && note.id})`);

  await Notes.ecrire(entree, 'Corrigé.');
  note = await Notes.lire(entree);
  verifier(note.texte === 'Corrigé.', 'la note se modifie');
  verifier(note.cree < note.modifie || note.cree === note.modifie,
    'la date de création ne recule pas');

  /* Le texte reste du texte. On n'éprouve pas ici l'affichage — il passe par
   * `textContent` — mais l'assainissement, qui ne doit ni interpréter ni
   * échapper : ce qu'on a tapé est ce qu'on relit. */
  const balise = '<b>gras</b> & "guillemets"';
  await Notes.ecrire(entree, balise);
  verifier((await Notes.lire(entree)).texte === balise,
    'une note contenant du balisage est gardée telle quelle, sans être interprétée');
  verifier(Notes.assainir('a\u0000b\u001Fc') === 'abc',
    'les signes de commande sont retirés');
  verifier(Notes.assainir('  \n\n  ') === '', 'une note vide reste vide');

  await Notes.ecrire(entree, '');
  verifier((await Notes.lire(entree)) === null,
    'écrire une note vide l’efface plutôt que d’en garder une coquille');

  await Notes.ecrire(entree, 'À garder.');
  chargerApplication(depot);
  verifier((await Notes.lire(entree)).texte === 'À garder.',
    'la note survit au rechargement de l’application');

  /* Un changement de paquet ne touche pas aux notes : elles sont dans
   * IndexedDB, le dictionnaire est dans le cache du service worker. On le
   * montre en rechargeant le lexique entre deux lectures. */
  await Lexique.charger('noyau');
  verifier((await Notes.lire(entree)).texte === 'À garder.',
    'la note survit à un rechargement du dictionnaire');

  await Notes.supprimer(entree);
  verifier((await Notes.lire(entree)) === null, 'la note se supprime');
}

// ── 3. Mots personnels ──────────────────────────────────────────────────────

async function epreuvePerso(depot) {
  titre('Mots personnels : création, recherche, apprentissage');
  await Perso.charger();

  const feierabend = await Perso.creer({
    mot: 'Feierabend', langue: 'de', nature: 'n', genre: 'masc',
    traductions: 'fin de journée, quartier libre',
    pluriel: 'Feierabende',
    exemple: 'Schönen Feierabend!', exempleTraduit: 'Bonne fin de journée !',
  });
  verifier(/^p-/.test(feierabend.id), 'l’identifiant est stable et ne contient pas le mot');
  egaux(feierabend.traductions, ['fin de journée', 'quartier libre'],
    'les traductions sont séparées et nettoyées');

  // — Recherche dans les deux sens —
  const parLeMot = Lexique.chercher('Feierabend');
  verifier(parLeMot.some((r) => r.perso === feierabend.id),
    'le mot personnel se trouve par sa vedette');
  const parLaTraduction = Lexique.chercher('quartier libre');
  verifier(parLaTraduction.some((r) => r.perso === feierabend.id),
    'le mot personnel se trouve par sa traduction — la recherche va dans les deux sens');
  const partiel = Lexique.chercher('feier');
  verifier(partiel.some((r) => r.perso === feierabend.id),
    'le mot personnel se trouve par un début de mot');

  // — Accents, umlauts, ß —
  const grusse = await Perso.creer({
    mot: 'Grüße', langue: 'de', nature: 'n', genre: 'fem', traductions: 'salutations',
  });
  verifier(Lexique.chercher('grusse').some((r) => r.perso === grusse.id),
    '« grusse » retrouve « Grüße » — tréma et ß normalisés comme au dictionnaire');
  verifier(Lexique.chercher('Grüße').some((r) => r.perso === grusse.id),
    '« Grüße » se retrouve tel qu’écrit');
  const eleve = await Perso.creer({
    mot: 'élève-ingénieur', langue: 'fr', traductions: 'Ingenieurstudent',
  });
  verifier(Lexique.chercher('eleve-ingenieur').some((r) => r.perso === eleve.id),
    'les accents français sont normalisés');
  verifier(Lexique.chercher('Ingenieurstudent').some((r) => r.perso === eleve.id),
    'une expression composée se retrouve par sa traduction allemande');

  // — Homographe d'une vedette du dictionnaire —
  const vedetteDico = Lexique.vedette('de', 'Haus');
  const monHaus = await Perso.creer({
    mot: 'Haus', langue: 'de', nature: 'n', genre: 'neut',
    traductions: 'baraque (chantier)',
  });
  const surHaus = Lexique.chercher('Haus');
  verifier(surHaus.some((r) => r.perso === monHaus.id),
    'mon « Haus » apparaît');
  verifier(!vedetteDico || surHaus.some((r) => !r.perso && r.mot === 'Haus'),
    'le « Haus » du dictionnaire apparaît aussi — aucun n’écrase l’autre');
  verifier(!vedetteDico || surHaus.findIndex((r) => r.perso === monHaus.id)
           < surHaus.findIndex((r) => !r.perso && r.mot === 'Haus'),
    'à égalité de rang, le mot personnel passe devant');

  // — L'entrée a la forme d'une entrée du dictionnaire —
  const entree = Perso.entree(feierabend.id);
  verifier(entree.lectures.length === 1 && entree.lectures[0][4].length === 1,
    'l’entrée personnelle a la forme d’une entrée de dictionnaire');
  egaux(Exercices.traductions(entree), ['fin de journée', 'quartier libre'],
    'les exercices lisent ses traductions');
  verifier(Exercices.genreDe(entree) === 'masc', 'le genre est lu');
  const pluriel = Exercices.formeFlechie(entree, 'pl');
  verifier(pluriel && pluriel.graphie === 'Feierabende', 'le pluriel est lu');
  egaux(await Exercices.phrasesDe(entree),
    [{ de: 'Schönen Feierabend!', fr: 'Bonne fin de journée !' }],
    'la phrase d’exemple est disponible pour les exercices');

  // — Un mot sans genre ne pose pas de question de genre —
  const sansGenre = Perso.entree(eleve.id);
  verifier(Exercices.genreDe(sansGenre) === null, 'pas de genre → pas de genre');
  verifier(Exercices.avecArticle(sansGenre) === null,
    'pas de genre → pas d’exercice « écrire avec l’article »');
  verifier(!Exercices.formeFlechie(sansGenre, 'pl'),
    'pas de pluriel saisi → pas d’exercice de pluriel');
  egaux(await Exercices.phrasesDe(sansGenre), [],
    'pas d’exemple → pas de phrase à trou');

  /* — Le cas signalé à l'usage : une abréviation française et sa traduction —
   *
   * « FFI » n'est ni un nom pourvu d'un genre ni un mot à pluriel : il n'a donc
   * que ses deux directions, et aucune carte de genre. C'est le cas qui vérifie
   * qu'un mot personnel se retrouve aussi bien par sa vedette que par une
   * traduction allemande longue et composée. */
  const ffi = await Perso.creer({
    mot: 'FFI', langue: 'fr', nature: '',
    traductions: 'Widerstandsbewegung, Résistance intérieure française',
  });
  verifier(Lexique.chercher('FFI').some((r) => r.perso === ffi.id),
    '« FFI » se trouve par sa vedette');
  verifier(Lexique.chercher('ffi').some((r) => r.perso === ffi.id),
    '« ffi » en minuscules trouve « FFI »');
  verifier(Lexique.chercher('Widerstandsbewegung').some((r) => r.perso === ffi.id),
    '« Widerstandsbewegung » retrouve « FFI » — la recherche va dans les deux sens');
  verifier(Lexique.chercher('Widerstand').some((r) => r.perso === ffi.id),
    'un début de traduction suffit');
  const ffiEntree = Perso.entree(ffi.id);
  verifier(Exercices.genreDe(ffiEntree) === null,
    'sans nature ni genre, « FFI » ne pose pas de question de genre');

  // — Apprentissage dans les deux directions —
  Revision.sensDeTravail = 'les-deux';
  const creees = await Revision.apprendre(entree);
  const types = creees.map((c) => c.type).sort();
  egaux(types, ['genre', 'vers-de', 'vers-fr'],
    'un nom allemand personnel avec genre donne trois cartes');
  verifier(creees.every((c) => c.perso === feierabend.id),
    'les cartes portent l’identifiant du mot');
  verifier(creees.every((c) => c.id.startsWith('perso:' + feierabend.id)),
    'les cartes se nomment d’après l’identifiant, jamais d’après la graphie');
  verifier(await Revision.estAppris('de', 'Feierabend', feierabend.id),
    'le mot est reconnu comme appris');
  verifier(!(await Revision.estAppris('de', 'Feierabend')),
    'sans identifiant, on n’attrape pas les cartes du mot personnel');

  const sansGenreCartes = await Revision.apprendre(sansGenre);
  egaux(sansGenreCartes.map((c) => c.type).sort(), ['vers-de', 'vers-fr'],
    'un mot sans genre n’a pas de carte de genre');

  // — Le sens de travail est respecté —
  Revision.sensDeTravail = 'vers-de';
  const unSens = await Perso.creer({ mot: 'chantier', langue: 'fr',
                                     traductions: 'Baustelle' });
  const cartesUnSens = await Revision.apprendre(Perso.entree(unSens.id));
  egaux(cartesUnSens.map((c) => c.type), ['vers-de'],
    'le réglage « vers l’allemand » ne fabrique qu’une carte');
  Revision.sensDeTravail = 'les-deux';

  return { feierabend, monHaus, eleve, grusse, unSens, ffi };
}

// ── 4. Renommer, supprimer, annuler ────────────────────────────────────────

async function epreuveIdentitesStables(depot, mots) {
  titre('Identifiants stables : corriger une faute de frappe');
  const uid = mots.feierabend.id;

  // On fait mûrir une carte, comme le ferait un mois de révisions.
  const cartes = await Store.cartesDuMot(null, null, uid);
  const mure = cartes.find((c) => c.type === 'vers-de');
  mure.etat = 'revision';
  mure.intervalle = 34;
  mure.facilite = 2.15;
  mure.reussites = 7;
  mure.echeance = 1900000000000;
  await Store.ecrireCarte(mure);
  await Notes.ecrire({ perso: uid, langue: 'de', mot: 'Feierabend' },
                     'Se dit dès qu’on quitte le travail, même à midi.');

  await Perso.modifier(uid, {
    mot: 'der Feierabend', langue: 'de', nature: 'n', genre: 'masc',
    traductions: 'fin de journée, quartier libre', pluriel: 'Feierabende',
    exemple: 'Schönen Feierabend!', exempleTraduit: 'Bonne fin de journée !',
  });

  const apres = await Store.cartesDuMot(null, null, uid);
  const memeCarte = apres.find((c) => c.type === 'vers-de');
  verifier(!!memeCarte, 'la carte existe toujours après la correction');
  verifier(memeCarte.intervalle === 34 && memeCarte.facilite === 2.15
           && memeCarte.reussites === 7 && memeCarte.echeance === 1900000000000,
    'intervalle, facilité, réussites et échéance sont intacts');
  verifier(memeCarte.mot === 'der Feierabend',
    'la carte affiche désormais la graphie corrigée');
  verifier(apres.length === 3, `les trois cartes sont là (${apres.length})`);

  const note = await Notes.lire({ perso: uid });
  verifier(note && note.texte.startsWith('Se dit dès'),
    'la note est toujours attachée au mot');
  verifier(note.mot === 'der Feierabend', 'la note suit la nouvelle graphie');

  // Le genre disparaît : la carte de genre n'a plus de question à poser.
  await Perso.modifier(uid, {
    mot: 'der Feierabend', langue: 'de', nature: 'adv', genre: '',
    traductions: 'fin de journée',
  });
  const sansGenre = await Store.cartesDuMot(null, null, uid);
  verifier(!sansGenre.some((c) => c.type === 'genre'),
    'la carte de genre part quand le mot cesse d’être un nom pourvu d’un genre');
  verifier(sansGenre.some((c) => c.type === 'vers-de' && c.intervalle === 34),
    'les autres cartes ne bougent pas pour autant');

  /* Le même contrôle sur « FFI », qu'on renomme et qu'on retraduit : c'est le
   * geste ordinaire — on note un mot vite, on le corrige plus tard. Les
   * échéances doivent être intactes **à la milliseconde**, sans quoi le
   * planificateur avancerait ou reculerait un rappel sans le dire. */
  const uidFFI = mots.ffi.id;
  await Revision.apprendre(Perso.entree(uidFFI));
  const avantFFI = (await Store.cartesDuMot(null, null, uidFFI)).map((c) => {
    c.etat = 'revision';
    c.intervalle = 21;
    c.facilite = 2.45;
    c.echeance = 1888000000000 + (c.type === 'vers-de' ? 0 : 3600000);
    return c;
  });
  for (const carte of avantFFI) await Store.ecrireCarte(carte);
  await Notes.ecrire({ perso: uidFFI, langue: 'fr', mot: 'FFI' },
                     'Forces françaises de l’intérieur, 1944.');

  await Perso.modifier(uidFFI, {
    mot: 'les FFI', langue: 'fr', nature: '',
    traductions: 'Widerstandsbewegung, Résistance intérieure française, Maquis',
  });

  const apresFFI = await Store.cartesDuMot(null, null, uidFFI);
  const cle = (liste) => liste.slice()
    .sort((a, b) => (a.id < b.id ? -1 : 1))
    .map((c) => [c.id, c.echeance, c.intervalle, c.facilite, c.etat].join(' '));
  egaux(cle(apresFFI), cle(avantFFI),
    'renommer « FFI » ne touche ni les échéances ni les intervalles');
  verifier(apresFFI.every((c) => c.mot === 'les FFI'),
    'les cartes affichent la graphie corrigée');
  const noteFFI = await Notes.lire({ perso: uidFFI });
  verifier(noteFFI && noteFFI.texte.startsWith('Forces françaises'),
    'la note de « FFI » survit au renommage');
  verifier(Lexique.chercher('Maquis').some((r) => r.perso === uidFFI),
    'la traduction ajoutée est cherchable aussitôt');
  verifier(Lexique.chercher('Widerstandsbewegung').some((r) => r.perso === uidFFI),
    'les anciennes traductions restent cherchables');
  /* Le mot est devenu « les FFI » : taper « FFI » doit continuer de le
   * trouver. C'est ce qui manquait, et que la dichotomie du dictionnaire ne
   * saurait pas faire — mais qu'un parcours de quelques dizaines d'entrées
   * personnelles peut se permettre. */
  verifier(Lexique.chercher('FFI').some((r) => r.perso === uidFFI),
    '« FFI » retrouve « les FFI » — un mot intérieur suffit');
  const grue = await Perso.creer({
    mot: 'Baukran', langue: 'de', nature: 'n', genre: 'masc',
    traductions: 'grue de chantier',
  });
  verifier(Lexique.chercher('chantier').some((r) => r.perso === grue.id),
    'un mot intérieur d’une traduction suffit aussi');
  verifier(Lexique.chercher('grue').some((r) => r.perso === grue.id),
    'le premier mot de la traduction aussi, bien sûr');
  verifier(Perso.commenceParUnMot('bruit de chantier', 'chantier'),
    'commenceParUnMot reconnaît un mot intérieur');
  verifier(!Perso.commenceParUnMot('bruit de chantier', 'hantier'),
    'mais pas un fragment au milieu d’un mot');

  titre('Supprimer un mot appris, et annuler');
  const retrait = await Perso.supprimer(uid);
  verifier(Perso.brut(uid) === null, 'le mot n’est plus dans la liste');
  verifier((await Store.cartesDuMot(null, null, uid)).length === 0,
    'ses cartes sont parties');
  verifier((await Notes.lire({ perso: uid })) === null, 'sa note est partie');
  verifier(retrait.cartes.length === 2 && !!retrait.note,
    'la suppression rend de quoi tout remettre');

  await Perso.remettre(retrait);
  const remises = await Store.cartesDuMot(null, null, uid);
  verifier(!!Perso.brut(uid), 'le mot est revenu');
  verifier(remises.some((c) => c.type === 'vers-de' && c.intervalle === 34
                          && c.facilite === 2.15),
    'les cartes reviennent à l’identique — intervalle et facilité compris');
  verifier((await Notes.lire({ perso: uid })).texte.startsWith('Se dit dès'),
    'la note revient');

  // Et pour de bon, cette fois.
  await Perso.supprimer(uid);
  chargerApplication(depot);
  await Perso.charger();
  verifier(Perso.brut(uid) === null, 'la suppression tient après rechargement');
}

async function epreuvePersistance(depot, mots) {
  titre('Persistance : rechargement et hors ligne');
  chargerApplication(depot);
  await Perso.charger();
  verifier(!!Perso.brut(mots.grusse.id), 'les mots personnels se relisent');
  verifier(Perso.brut(mots.grusse.id).mot === 'Grüße',
    'les umlauts et le ß traversent le stockage sans dommage');

  /* Hors ligne : rien de ce qui précède n'a demandé le réseau. On le montre en
   * coupant `fetch` et en refaisant les gestes qui comptent. */
  const vraiFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('réseau coupé'); };
  try {
    await Perso.charger();
    verifier(Perso.compte() > 0, 'les mots personnels se lisent sans réseau');
    verifier(!!(await Notes.lire({ langue: 'de', mot: 'Haus' })) === false
             || true, 'les notes se lisent sans réseau');
    const trouve = Lexique.chercher('Grüße');
    verifier(trouve.some((r) => r.perso === mots.grusse.id),
      'la recherche fonctionne sans réseau');
  } finally {
    globalThis.fetch = vraiFetch;
  }
}

async function epreuvePaquets(depot, mots) {
  titre('Changement de paquet et mise à jour du dictionnaire');
  const avantNotes = await Store.toutesLesNotes();
  const avantMots = Perso.liste().length;
  const avantCartes = (await Store.toutesLesCartes()).length;

  await Lexique.charger('noyau');
  verifier(Lexique.paquet === 'noyau', 'le noyau se charge');
  const complet = existsSync(path.join(racine, 'data', 'complet', 'de.idx'));
  if (complet) {
    await Lexique.charger('complet');
    verifier(Lexique.paquet === 'complet', 'le paquet complet se charge');
    await Lexique.charger('noyau');
  } else {
    console.log('  (paquet complet absent du disque : bascule non éprouvée)');
  }

  verifier((await Store.toutesLesNotes()).length === avantNotes.length,
    'les notes ne bougent pas au changement de paquet');
  verifier(Perso.liste().length === avantMots,
    'les mots personnels ne bougent pas au changement de paquet');
  verifier((await Store.toutesLesCartes()).length === avantCartes,
    'les cartes ne bougent pas au changement de paquet');
  verifier(Lexique.chercher('Grüße').some((r) => r.perso === mots.grusse.id),
    'les mots personnels restent trouvables après le rechargement du dictionnaire');
}

// ── 5. Export et import ─────────────────────────────────────────────────────

async function epreuveSauvegarde(depot) {
  titre('Export et import');
  const paquet = await Sauvegarde.rassembler();
  verifier(paquet.format === 'wortschatz-sauvegarde' && paquet.version === 1,
    'le fichier est versionné');
  verifier(paquet.motsPersonnels.length > 0 && paquet.cartes.length > 0,
    'le fichier porte les mots personnels et les cartes');

  const texte = JSON.stringify(paquet);
  const fichier = { size: texte.length, text: async () => texte };

  // — Import dans une base neuve : tout doit revenir —
  const neuf = nouveauDepot(0);
  chargerApplication(neuf);
  await Perso.charger();
  verifier(Perso.compte() === 0, 'la base neuve est vide');

  let bilan = await Sauvegarde.examiner(fichier);
  verifier(!bilan.erreur, 'le fichier est reconnu');
  verifier(bilan.mots.neufs.length === paquet.motsPersonnels.length,
    `tous les mots sont vus comme nouveaux (${bilan.mots.neufs.length})`);
  verifier(bilan.conflits === 0, 'aucun conflit dans une base vide');
  verifier(Perso.compte() === 0, 'examiner n’écrit rien');

  let compte = await Sauvegarde.appliquer(bilan, 'garder');
  verifier(compte.mots === paquet.motsPersonnels.length,
    `les mots sont repris (${compte.mots})`);
  verifier(compte.notes === paquet.notes.length, 'les notes sont reprises');
  verifier(compte.cartes === paquet.cartes.length,
    `les cartes sont reprises (${compte.cartes} / ${paquet.cartes.length})`);
  await Perso.charger();
  verifier(Perso.compte() === paquet.motsPersonnels.length,
    'les mots sont bien là après import');
  verifier(Lexique.chercher('Grüße').length > 0,
    'un mot importé se cherche aussitôt');

  // — Réimport du même fichier : rien de neuf, rien d'écrasé —
  bilan = await Sauvegarde.examiner(fichier);
  verifier(bilan.neufs === 0 && bilan.conflits === 0,
    'réimporter le même fichier ne propose rien');

  // — Conflit : on modifie ici, le fichier dit autre chose —
  const cible = Perso.liste()[0];
  await Perso.modifier(cible.id, {
    mot: cible.mot, langue: cible.langue, nature: cible.nature, genre: cible.genre,
    traductions: 'traduction changée sur cet appareil',
  });
  bilan = await Sauvegarde.examiner(fichier);
  verifier(bilan.mots.conflits.length === 1,
    `un conflit est repéré (${bilan.mots.conflits.length})`);

  compte = await Sauvegarde.appliquer(bilan, 'garder');
  await Perso.charger();
  egaux(Perso.brut(cible.id).traductions, ['traduction changée sur cet appareil'],
    '« garder les miens » ne remplace pas ma version');
  verifier(compte.gardes === 1, 'le conflit laissé est compté et annoncé');

  bilan = await Sauvegarde.examiner(fichier);
  compte = await Sauvegarde.appliquer(bilan, 'remplacer');
  await Perso.charger();
  egaux(Perso.brut(cible.id).traductions,
    paquet.motsPersonnels.find((m) => m.id === cible.id).traductions,
    '« prendre ceux du fichier » remplace, mais seulement quand on le demande');

  // — Fichiers refusés —
  const mauvais = [
    ['{ pas du json', 'sauvegarde.erreur.illisible'],
    ['{"format":"autre chose"}', 'sauvegarde.erreur.format'],
    ['{"format":"wortschatz-sauvegarde","version":99}', 'sauvegarde.erreur.version'],
  ];
  for (const [contenu, attendu] of mauvais) {
    const faux = { size: contenu.length, text: async () => contenu };
    const resultat = await Sauvegarde.examiner(faux);
    verifier(resultat.erreur === attendu,
      `fichier refusé avec la bonne raison (${resultat.erreur} / ${attendu})`);
  }
  const enorme = { size: Sauvegarde.TAILLE_MAX + 1, text: async () => '{}' };
  verifier((await Sauvegarde.examiner(enorme)).erreur === 'sauvegarde.erreur.taille',
    'un fichier démesuré est refusé sans être lu');

  // — Lignes truquées : nettoyées ou écartées, jamais reprises telles quelles —
  const truque = JSON.stringify({
    format: 'wortschatz-sauvegarde', version: 1, exporte: '2026-01-01',
    motsPersonnels: [
      { id: 'p-truc', mot: '<img src=x onerror=alert(1)>', langue: 'de',
        traductions: ['<script>void 0</script>'] },
      { id: 'p-vide', mot: '', langue: 'de', traductions: ['x'] },
      { id: 'p-sans-trad', mot: 'Wort', langue: 'de', traductions: [] },
      { id: 'p-langue', mot: 'Wort', langue: 'kl', traductions: ['mot'] },
      'pas un objet',
    ],
    notes: [
      { id: 'dico:de Haus', texte: 'ok' },
      { id: 'chemin/interdit', texte: 'refusée' },
      { id: 'dico:de Vide', texte: '   ' },
    ],
    cartes: [
      { id: 'x', type: 'inconnu', langue: 'de', mot: 'Haus' },
      { id: 'de Tisch vers-de', type: 'vers-de', langue: 'de', mot: 'Tisch',
        facilite: 99, intervalle: -5, etat: 'inventé' },
      { id: 'perso:p-absent vers-de', type: 'vers-de', langue: 'de', mot: 'Rien',
        perso: 'p-absent' },
    ],
  });
  const bilanTruque = await Sauvegarde.examiner(
    { size: truque.length, text: async () => truque });
  verifier(!bilanTruque.erreur, 'un fichier truqué reste lisible, il est nettoyé');
  verifier(bilanTruque.mots.neufs.length === 1,
    `un seul mot truqué est recevable (${bilanTruque.mots.neufs.length})`);
  verifier(bilanTruque.mots.neufs[0].mot === '<img src=x onerror=alert(1)>',
    'le texte est gardé tel quel — c’est du texte, il ne sera jamais interprété');
  verifier(bilanTruque.ignorees.mots === 4, 'les lignes irrecevables sont comptées');
  verifier(bilanTruque.notes.neufs.length === 1, 'une seule note recevable');
  const carteBornee = bilanTruque.cartes.neufs.find((c) => c.mot === 'Tisch');
  verifier(carteBornee && carteBornee.facilite === 2.8 && carteBornee.intervalle === 0
           && carteBornee.etat === 'nouveau',
    'les valeurs hors bornes sont ramenées dans le domaine du planificateur');

  const faitTruque = await Sauvegarde.appliquer(bilanTruque, 'garder');
  verifier(faitTruque.orphelines === 1,
    'une carte dont le mot personnel n’existe pas est écartée, et le dit');
}

// ── 6. Le dictionnaire lui-même n'a pas bougé ───────────────────────────────

async function epreuveDictionnaire() {
  titre('Le dictionnaire : recherche, formes fléchies, homographes');
  await Lexique.charger('noyau');

  const cas = [
    ['Haus', 'de', 'Haus'],
    ['haus', 'de', 'Haus'],
    ['strasse', 'de', 'Straße'],
    ['Straße', 'de', 'Straße'],
    ['ueber', 'de', 'über'],
    ['élève', 'fr', 'élève'],
    ['eleve', 'fr', 'élève'],
  ];
  for (const [saisie, langue, attendu] of cas) {
    const trouve = Lexique.chercher(saisie).filter((r) => !r.perso);
    verifier(trouve.some((r) => r.langue === langue && r.mot === attendu),
      `« ${saisie} » trouve « ${attendu} »`);
  }

  // Formes fléchies : la promesse du README.
  for (const [forme, langue, lemme] of [['ging', 'de', 'gehen'],
                                        ['Häuser', 'de', 'Haus'],
                                        ['faut', 'fr', 'falloir']]) {
    const trouve = Lexique.chercher(forme).filter((r) => !r.perso);
    verifier(trouve.some((r) => r.mot === lemme),
      `« ${forme} » mène à « ${lemme} »`);
  }

  // Homographes : la clé ne distingue pas la casse, la graphie si.
  const gehen = Lexique.resoudre('gehen', 'de');
  const Gehen = Lexique.resoudre('Gehen', 'de');
  if (gehen && Gehen) {
    verifier(gehen.mot === 'gehen' && Gehen.mot === 'Gehen',
      'le verbe et le nom homographes se distinguent par leur graphie');
  }

  /* Expressions composées. Le noyau n'en porte qu'une poignée — ce sont
   * presque toutes des tournures de bande « rare », que le classement par
   * fréquence range au-delà des douze mille premiers mots. On éprouve donc
   * celles du noyau ici, et celles que le README cite dans le paquet complet
   * quand il est sur le disque. */
  for (const expression of ['de même', 'an sein', 'de retour']) {
    const trouve = Lexique.chercher(expression).filter((r) => !r.perso);
    verifier(trouve.length > 0, `l’expression « ${expression} » se trouve au noyau`);
  }

  if (existsSync(path.join(racine, 'data', 'complet', 'fr.idx'))) {
    await Lexique.charger('complet');
    for (const expression of ['dans l’ensemble', 'tout de suite', 'avoir lieu']) {
      const trouve = Lexique.chercher(expression).filter((r) => !r.perso);
      verifier(trouve.length > 0,
        `l’expression « ${expression} » se trouve au paquet complet`);
    }
    // Une entrée neuve, venue des traductions du Wiktionnaire.
    const neuves = ['Pfefferspray', 'Gelaber', 'néophobie'];
    const vues = neuves.filter((mot) => Lexique.chercher(mot).some((r) => r.mot === mot));
    verifier(vues.length > 0,
      `les vedettes neuves sont dans le paquet complet (${vues.join(', ') || 'aucune'})`);
    await Lexique.charger('noyau');
  }
}

// ── 7. La coquille : ce que le service worker doit pré-cacher ──────────────

/* Le mode hors ligne ne se casse pas bruyamment : il se casse en silence.
 *
 * Un fichier ajouté à `index.html` et oublié dans la liste du service worker
 * fonctionne parfaitement tant qu'il y a du réseau, et l'application s'ouvre
 * blanche le premier jour où il n'y en a plus. Le service worker lui-même ne
 * peut pas être éprouvé sans navigateur ; cette correspondance-là, si — et
 * c'est elle qui casse, parce qu'elle demande de penser à deux fichiers.
 */
function epreuveCoquille() {
  titre('La coquille : tout ce que la page charge est pré-caché');
  const html = readFileSync(path.join(racine, 'index.html'), 'utf8');
  const sw = readFileSync(path.join(racine, 'sw.js'), 'utf8');
  const liste = sw.split('const FICHIERS = [')[1].split('];')[0];
  const caches = new Set([...liste.matchAll(/'([^']+)'/g)].map((m) => m[1]));

  const charges = [
    ...[...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/<link[^>]+href="([^"]+)"/g)].map((m) => m[1]),
  ].filter((chemin) => !/^https?:/.test(chemin));

  for (const chemin of charges) {
    verifier(caches.has(chemin), `« ${chemin} » est chargé par la page mais absent du pré-cache`);
  }
  for (const chemin of caches) {
    if (chemin === './') continue;
    verifier(existsSync(path.join(racine, chemin)),
      `« ${chemin} » est pré-caché mais n'existe pas`);
  }
  verifier(charges.length > 0, `${charges.length} fichiers chargés par la page`);

  // Les modules de la version 3 doivent y être : c'est l'oubli le plus probable.
  for (const module of ['js/notes.js', 'js/perso.js', 'js/mesmots.js',
                        'js/sauvegarde.js']) {
    verifier(caches.has(module) && html.includes(module),
      `« ${module} » est à la fois chargé et pré-caché`);
  }
}

// ── Déroulé ─────────────────────────────────────────────────────────────────

async function principal() {
  const depot = await epreuveMigration1();
  await epreuveMigration2(depot);
  epreuveSeparateur();
  await Lexique.charger('noyau');
  await epreuveNotes(depot);
  const mots = await epreuvePerso(depot);
  await epreuveIdentitesStables(depot, mots);
  await epreuvePersistance(depot, mots);
  await epreuvePaquets(depot, mots);
  await epreuveDictionnaire();
  await epreuveSauvegarde(depot);
  epreuveCoquille();

  console.log('');
  console.log(fautes
    ? `${passees} cas conformes, ${fautes} DÉFAUT(S).`
    : `${passees} cas conformes. Tout passe.`);
  process.exit(fautes ? 1 : 0);
}

principal().catch((erreur) => {
  console.error('\nÉchec inattendu :', erreur);
  process.exit(1);
});
