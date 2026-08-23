'use strict';
/*
 * Service worker.
 *
 * Deux sortes de fichiers, deux traitements :
 *
 *   la coquille (HTML, CSS, JavaScript) — **réseau d'abord**. Une correction
 *   arrive dès qu'elle existe, et l'application reste ouvrable sans réseau.
 *
 *   les données (data/…) — **cache d'abord**. Un fichier de dictionnaire ne
 *   change jamais à l'intérieur d'une version : le redemander au réseau serait
 *   du temps et des octets perdus. Une nouvelle version des données porte de
 *   nouveaux noms de cache, et c'est l'application qui la télécharge.
 *
 * ⚠ Ce service worker ne supprime **que** les caches de coquille périmés. Le
 * cache des données (`wortschatz-donnees-…`) ne lui appartient pas : il
 * contient les 25 Mo que l'utilisateur a téléchargés, et une mise à jour du
 * code n'est pas une raison de les lui reprendre. Seul js/paquets.js les
 * efface, sur demande explicite ou en installant une version plus récente.
 */

const VERSION = 'v1.1.1';
const COQUILLE = 'wortschatz-coquille-' + VERSION;

const FICHIERS = [
  './',
  'index.html',
  'confidentialite.html',
  'manifest.webmanifest',
  'css/app.css',
  'css/page.css',
  'js/i18n.js',
  'js/lexique.js',
  'js/store.js',
  'js/voix.js',
  'js/revision.js',
  'js/exercices.js',
  'js/fiche.js',
  'js/seance.js',
  'js/progres.js',
  'js/paquets.js',
  'js/app.js',
  'js/demarrage.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'data/manifeste.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(COQUILLE);

    /* `cache: 'reload'` court-circuite le cache HTTP du navigateur. Sans lui,
     * addAll() remplirait le cache neuf avec les réponses périmées que le
     * navigateur détient encore — GitHub Pages sert avec max-age=600 — et le
     * nouveau service worker figerait la version précédente. */
    await cache.addAll(FICHIERS.map((u) => new Request(u, { cache: 'reload' })));

    /* Le noyau du dictionnaire fait partie de l'installation : sans lui,
     * l'application s'ouvrirait hors ligne sur un dictionnaire vide. La liste
     * vient du manifeste plutôt que d'être recopiée ici, pour qu'une
     * reconstruction des données n'oblige pas à retoucher ce fichier.
     *
     * Le manifeste vient d'être mis en cache par l'addAll ci-dessus ; on le
     * relit depuis le cache, sans nouvelle requête. Attention : lire le corps
     * d'une réponse la consomme, et la cloner *après* lève une exception qui
     * ferait échouer toute l'installation — donc, silencieusement, plus aucun
     * mode hors ligne. C'est exactement ce qui s'est produit ici une fois. */
    const enCache = await cache.match('data/manifeste.json');
    const manifeste = await enCache.json();
    await cache.addAll(manifeste.paquets.noyau.fichiers.map(
      (f) => new Request('data/' + f, { cache: 'reload' })));

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const nom of await caches.keys()) {
      // Uniquement les coquilles périmées. Jamais les données.
      if (nom.startsWith('wortschatz-coquille-') && nom !== COQUILLE) {
        await caches.delete(nom);
      }
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  const estDonnee = url.pathname.includes('/data/');

  if (estDonnee) {
    // Cache d'abord, tous caches confondus : le noyau est dans la coquille, le
    // dictionnaire complet dans le cache des données.
    e.respondWith(
      caches.match(e.request).then((trouve) => trouve || fetch(e.request))
    );
    return;
  }

  /* Réseau d'abord, cache en secours — et « secours » veut dire les deux
   * façons dont le réseau manque :
   *
   *   il ne répond pas      → fetch() rejette
   *   il répond mal         → fetch() résout, avec un statut d'erreur
   *
   * Ne rattraper que le premier cas laissait passer le second : une réponse en
   * erreur était renvoyée telle quelle à la page, qui se retrouvait sans son
   * JavaScript. Cela arrive derrière un portail captif d'hôtel, un proxy
   * d'entreprise, un réseau qui filtre — c'est-à-dire précisément là où une
   * application hors ligne doit tenir.
   */
  e.respondWith((async () => {
    try {
      const reponse = await fetch(e.request.url, { cache: 'no-cache' });
      if (reponse.ok) {
        const copie = reponse.clone();
        caches.open(COQUILLE).then((c) => c.put(e.request, copie));
        return reponse;
      }
      return (await caches.match(e.request, { ignoreSearch: true })) || reponse;
    } catch (erreur) {
      const enCache = await caches.match(e.request, { ignoreSearch: true });
      if (enCache) return enCache;
      throw erreur;
    }
  })());
});
