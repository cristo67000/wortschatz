/*
 * Cas de contrôle du code de l'application, hors navigateur.
 *
 * Deux fonctions y sont éprouvées, choisies parce qu'elles décident seules de
 * ce que l'apprenant vit :
 *
 *   Exercices.corriger()  ce qui est compté juste, presque, ou faux
 *   Revision.juger()      quand un mot revient
 *
 * Toutes deux sont pures — même entrée, même sortie — donc vérifiables sans
 * navigateur ni base de données. Une erreur y passerait autrement inaperçue :
 * un intervalle mal calculé ne casse rien, il fait seulement oublier.
 *
 *     node build/essais.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ici = path.dirname(fileURLToPath(import.meta.url));

// Les fichiers de l'application sont des scripts classiques accrochés à
// `window` ; en dehors du navigateur il suffit de leur en fournir un, et de
// simuler le peu qu'ils touchent d'autre.
globalThis.window = globalThis;
globalThis.Voix = { possible: () => false };
globalThis.Store = { identifiant: (l, m, t) => l + ' ' + m + ' ' + t };
for (const fichier of ['lexique.js', 'exercices.js', 'revision.js']) {
  (0, eval)(readFileSync(path.join(ici, '..', 'js', fichier), 'utf8'));
}

let fautesTotales = 0;

function titre(texte) {
  console.log('');
  console.log(texte);
}

// ── La correction des réponses ─────────────────────────────────────────────

const CAS = [
  // saisie,       attendus,             options,                        verdict,   remarque
  ['Haus',         ['Haus'],             { langue: 'de', estNom: true }, 'juste',   null],
  ['haus',         ['Haus'],             { langue: 'de', estNom: true }, 'juste',   'majuscule'],
  ['  Haus. ',     ['Haus'],             { langue: 'de', estNom: true }, 'juste',   null],
  ['das Haus',     ['Haus'],             { langue: 'de', estNom: true }, 'juste',   null],
  ['Strasse',      ['Straße'],           { langue: 'de', estNom: true }, 'juste',   'accents'],
  ['Hous',         ['Haus'],             { langue: 'de', estNom: true }, 'faux',    null],
  ['Gebaude',      ['Gebäude'],          { langue: 'de', estNom: true }, 'juste',   'accents'],
  ['Gebeude',      ['Gebäude'],          { langue: 'de', estNom: true }, 'presque', null],
  ['Katze',        ['Haus'],             { langue: 'de', estNom: true }, 'faux',    null],
  ['',             ['Haus'],             { langue: 'de', estNom: true }, 'faux',    null],
  ['eleve',        ['élève'],            { langue: 'fr' },               'juste',   'accents'],
  ['élève',        ['élève'],            { langue: 'fr' },               'juste',   null],
  ['elève',        ['élève'],            { langue: 'fr' },               'juste',   'accents'],
  ['maison',       ['maison', 'logis'],  { langue: 'fr' },               'juste',   null],
  ['logis',        ['maison', 'logis'],  { langue: 'fr' },               'juste',   null],
  ['maisone',      ['maison'],           { langue: 'fr' },               'presque', null],
  ['voiture',      ['maison'],           { langue: 'fr' },               'faux',    null],
];

titre('Correction des réponses (Exercices.corriger)');
let fautesCorrection = 0;
for (const [saisie, attendus, options, verdictAttendu, remarqueAttendue] of CAS) {
  const r = globalThis.Exercices.corriger(saisie, attendus, options);
  const remarque = r.remarque ? r.remarque.cle.split('.').pop() : null;
  const ok = r.verdict === verdictAttendu && remarque === remarqueAttendue;
  if (!ok) fautesCorrection += 1;
  console.log(`  ${ok ? 'ok ' : 'NON'} ${JSON.stringify(saisie).padEnd(12)} → `
    + `${attendus[0].padEnd(10)} ${r.verdict.padEnd(8)}`
    + `${remarque ? '(' + remarque + ')' : ''}`
    + (ok ? '' : `   attendu : ${verdictAttendu} (${remarqueAttendue})`));
}
console.log(`  ${CAS.length - fautesCorrection}/${CAS.length} cas conformes`);
fautesTotales += fautesCorrection;

// ── Le planificateur ───────────────────────────────────────────────────────

const R = globalThis.Revision;
const JOUR = R.JOUR;
const T = 1000000000000;

function carte(champs) {
  return Object.assign(R.neuve('de', 'Haus', 0, 'sens'), champs);
}
function jours(suite) {
  return Math.round((suite.echeance - T) / JOUR * 100) / 100;
}

const ATTENDUS = [
  ['une carte neuve réussie passe en apprentissage',
    carte({ etat: 'nouveau' }), R.CORRECT,
    (s) => s.etat === 'apprentissage' && jours(s) < 0.02],
  ['une carte neuve jugée facile saute l’apprentissage',
    carte({ etat: 'nouveau' }), R.FACILE,
    (s) => s.etat === 'revision' && jours(s) === 4],
  ['le dernier palier fait entrer en révision',
    carte({ etat: 'apprentissage', palier: 1 }), R.CORRECT,
    (s) => s.etat === 'revision' && jours(s) === 1],
  ['une réussite en révision multiplie l’intervalle par la facilité',
    carte({ etat: 'revision', intervalle: 10, facilite: 2.5 }), R.CORRECT,
    (s) => s.intervalle === 25 && jours(s) === 25],
  ['« difficile » allonge peu et rabote la facilité',
    carte({ etat: 'revision', intervalle: 10, facilite: 2.5 }), R.DIFFICILE,
    (s) => s.intervalle === 12 && Math.abs(s.facilite - 2.35) < 1e-9],
  ['« facile » ne dépasse pas le plafond de facilité',
    carte({ etat: 'revision', intervalle: 10, facilite: 2.8 }), R.FACILE,
    (s) => s.facilite === 2.8],
  ['un échec renvoie en apprentissage et divise l’intervalle',
    carte({ etat: 'revision', intervalle: 30, facilite: 2.5 }), R.RATE,
    (s) => s.etat === 'apprentissage' && s.intervalle === 9
        && Math.abs(s.facilite - 2.3) < 1e-9 && jours(s) < 0.02],
  ['la facilité ne descend pas sous le plancher',
    carte({ etat: 'revision', intervalle: 5, facilite: 1.3 }), R.RATE,
    (s) => s.facilite === 1.3],
  ['l’intervalle est plafonné à deux ans',
    carte({ etat: 'revision', intervalle: 700, facilite: 2.5 }), R.CORRECT,
    (s) => s.intervalle === 730],
  ['un échec compte un échec, pas une réussite',
    carte({ etat: 'revision', intervalle: 5, reussites: 3, echecs: 1 }), R.RATE,
    (s) => s.echecs === 2 && s.reussites === 3],
];

titre('Planification des révisions (Revision.juger)');
let fautesPlan = 0;
for (const [libelle, avant, qualite, verifier] of ATTENDUS) {
  const apres = R.juger(avant, qualite, T);
  const ok = verifier(apres);
  if (!ok) fautesPlan += 1;
  console.log(`  ${ok ? 'ok ' : 'NON'} ${libelle}`);
  if (!ok) {
    console.log(`      obtenu : état=${apres.etat} intervalle=${apres.intervalle} `
      + `facilité=${apres.facilite} échéance=+${jours(apres)} j`);
  }
}
console.log(`  ${ATTENDUS.length - fautesPlan}/${ATTENDUS.length} cas conformes`);
fautesTotales += fautesPlan;

console.log('');
console.log(fautesTotales ? `${fautesTotales} cas en échec` : 'Tous les cas passent.');
process.exit(fautesTotales ? 1 : 0);
