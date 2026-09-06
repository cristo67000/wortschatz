/*
 * Cas de contrôle des libellés.
 *
 * Une clé absente ne casse rien : l'interface affiche ‹cle.absente› entre
 * chevrons et continue. C'est précisément ce qui la rend dangereuse — elle ne
 * se voit qu'en ouvrant l'écran concerné, dans la bonne langue, et l'écran
 * allemand est celui qu'on ouvre le moins souvent en développant.
 *
 * Ce fichier lit toutes les clés employées — dans le HTML par `data-t*`, dans
 * le JavaScript par `I18n.t()` et `I18n.n()` — et vérifie que chacune existe
 * dans les deux langues.
 *
 *     node build/essais_i18n.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.join(ici, '..');

globalThis.window = globalThis;
// `navigator` est en lecture seule dans Node : on le redéfinit, i18n.js le lit.
Object.defineProperty(globalThis, 'navigator', {
  value: { languages: ['fr'] }, configurable: true,
});
globalThis.document = {
  documentElement: {},
  querySelectorAll: () => [],
  dispatchEvent: () => {},
};
globalThis.CustomEvent = class { constructor(nom, options) { this.nom = nom; this.detail = options && options.detail; } };
(0, eval)(readFileSync(path.join(racine, 'js', 'i18n.js'), 'utf8'));

const I18n = globalThis.I18n;

/* Les tables elles-mêmes, pour comparer les deux langues clé à clé. La seule
 * façon d'y accéder de l'extérieur est de demander chaque clé : `t()` retombe
 * sur le français quand l'allemand manque, ce qui masquerait justement le
 * défaut qu'on cherche. On relit donc la source. */
const source = readFileSync(path.join(racine, 'js', 'i18n.js'), 'utf8');
const blocs = source.split(/^\s{4}(fr|de): \{$/m);
const tables = {};
for (let i = 1; i < blocs.length; i += 2) {
  const langue = blocs[i];
  tables[langue] = new Set(
    [...blocs[i + 1].matchAll(/^\s*'([\w.-]+)':/gm)].map((m) => m[1]));
}

let fautes = 0;
function verifier(condition, message) {
  if (condition) return;
  fautes += 1;
  console.log('  NON ' + message);
}

console.log('Libellés');
console.log(`  fr : ${tables.fr.size} clés, de : ${tables.de.size} clés`);

// 1. Les deux langues portent les mêmes clés.
for (const cle of tables.fr) {
  verifier(tables.de.has(cle), `« ${cle} » manque en allemand`);
}
for (const cle of tables.de) {
  verifier(tables.fr.has(cle), `« ${cle} » manque en français`);
}

// 2. Toutes les clés employées existent.
const employees = new Set();

const html = readFileSync(path.join(racine, 'index.html'), 'utf8');
for (const m of html.matchAll(/data-t(?:-ph|-aria|-titre)?="([\w.-]+)"/g)) {
  employees.add(m[1]);
}

/* Les clés composées — `'nature.' + code`, `'bande.' + entree.bande` — ne se
 * lisent pas dans le code. On les énumère ici, une fois, plutôt que de laisser
 * le contrôle passer à côté de familles entières. */
const FAMILLES = {
  'langue.': ['de', 'fr', 'de.court', 'fr.court'],
  'bande.': ['0', '1', '2', '3', 'explication'],
  'genre.': ['masc', 'fem', 'neut'],
  'nature.': ['n', 'pn', 'v', 'adj', 'adv', 'preposition', 'conjunction',
              'interjection', 'numeral', 'article', 'particle', 'letter',
              'abbreviation', 'suffix', 'prefix', 'locution', 'pronoun',
              'determiner'],
  'flexion.': ['sg', 'pl', 'gen', 'pret', 'part', 'aux', 'inf', 'comp', 'sup',
               'fs', 'mp', 'fp', 'pres1', 'pres2', 'pres3', 'pres4', 'pres5',
               'pres6', 'imp1', 'imp2', 'imp3', 'imp4', 'imp5', 'imp6',
               'groupe.formes', 'groupe.present', 'groupe.imparfait'],
  'exercice.consigne.': ['genre', 'qcm-comprendre', 'qcm-produire', 'saisie',
                         'saisie-article', 'saisie-traduction', 'trou',
                         'paire-phrase', 'ecoute', 'pluriel', 'conjugaison',
                         'synonyme'],
  'perso.manque.': ['mot', 'langue', 'traductions'],
  'sauvegarde.conflits.': ['garder', 'remplacer'],
};
for (const [prefixe, suites] of Object.entries(FAMILLES)) {
  for (const suite of suites) employees.add(prefixe + suite);
}

for (const nom of readdirSync(path.join(racine, 'js'))) {
  if (!nom.endsWith('.js')) continue;
  const code = readFileSync(path.join(racine, 'js', nom), 'utf8');
  for (const m of code.matchAll(/I18n\.[tn]\('([\w.-]+)'/g)) {
    /* Une « clé » qui finit par un point est en fait un préfixe : le code écrit
     * `I18n.t('nature.' + code)`. Ces familles sont énumérées ci-dessus, à la
     * main, parce qu'aucune lecture du texte ne saurait deviner leurs suites. */
    if (!m[1].endsWith('.')) employees.add(m[1]);
  }
}

for (const cle of [...employees].sort()) {
  verifier(tables.fr.has(cle), `« ${cle} » employée mais absente des libellés`);
}

// 3. Les substitutions annoncées existent dans les deux langues.
for (const cle of tables.fr) {
  const jetons = (texte) => new Set([...String(texte).matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
  const enFr = jetons(I18n.t(cle));
  I18n.definir('de');
  const enDe = jetons(I18n.t(cle));
  I18n.definir('fr');
  for (const jeton of enDe) {
    verifier(enFr.has(jeton) || jeton === 'n',
      `« ${cle} » : {${jeton}} en allemand, absent du français`);
  }
}

console.log(`  ${employees.size} clés employées vérifiées`);
console.log(fautes ? `\n${fautes} défaut(s).` : '\nTous les libellés sont en place.');
process.exit(fautes ? 1 : 0);
