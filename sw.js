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
 * Une nouvelle version s'installe en silence, puis **attend** : elle ne prend
 * la main qu'au feu vert de `js/miseajour.js`, c'est-à-dire quand la personne a
 * accepté le bandeau. Tant qu'elle attend, l'ancienne sert et son cache reste
 * entier — s'activer d'office effacerait sous la page ouverte les fichiers dont
 * elle se sert encore.
 *
 * ⚠ Ce service worker ne supprime **que** les caches de coquille périmés. Le
 * cache des données (`wortschatz-donnees-…`) ne lui appartient pas : il
 * contient les 25 Mo que l'utilisateur a téléchargés, et une mise à jour du
 * code n'est pas une raison de les lui reprendre. Seul js/paquets.js les
 * efface, sur demande explicite ou en installant une version plus récente.
 */

const VERSION = 'v1.4.0';
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
  'js/installer.js',
  'js/miseajour.js',
  'js/app.js',
  'js/demarrage.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'captures/capture-1-chercher.webp',
  'captures/capture-2-fiche.webp',
  'captures/capture-3-exercice.webp',
  'data/manifeste.json',
];

/* Met en cache une liste de fichiers, un par un, en tolérant les échecs.
 *
 * `addAll()` est tout-ou-rien : un seul fichier manqué et rien n'est gardé.
 * Sur les vingt-sept fichiers de la coquille c'est ce qu'on veut — une
 * application à qui il manque un script ne vaut pas mieux que pas
 * d'application. Sur les cinquante-huit du dictionnaire, non : un hoquet de
 * réseau mobile, un proxy, une limitation de débit, et l'installation entière
 * échouait — donc plus aucun mode hors ligne, en silence, alors que
 * cinquante-sept fichiers étaient arrivés.
 *
 * Ce qui manque ici sera rattrapé à l'usage : le gestionnaire `fetch` range
 * dans le cache tout fichier de données qu'il doit aller chercher.
 */
async function cacherTolerant(cache, urls) {
  let manques = 0;
  // Six à la fois : assez pour ne pas attendre, assez peu pour ne pas se faire
  // limiter par l'hébergeur.
  const PARALLELE = 6;
  let curseur = 0;
  async function ouvrier() {
    while (curseur < urls.length) {
      const url = urls[curseur];
      curseur += 1;
      try {
        const reponse = await fetch(new Request(url, { cache: 'reload' }));
        if (reponse.ok) await cache.put(url, reponse);
        else manques += 1;
      } catch (erreur) {
        manques += 1;
      }
    }
  }
  const ouvriers = [];
  for (let i = 0; i < Math.min(PARALLELE, urls.length); i += 1) ouvriers.push(ouvrier());
  await Promise.all(ouvriers);
  return manques;
}

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
    const manques = await cacherTolerant(
      cache, manifeste.paquets.noyau.fichiers.map((f) => 'data/' + f));
    if (manques) {
      console.warn('Wortschatz : ' + manques + ' fichiers du noyau non pré-cachés, '
        + 'ils seront rattrapés à l’usage.');
    }

    /* Pas de `skipWaiting()` ici. Ce service worker est prêt, mais il attend :
     * prendre la main tout seul reviendrait à changer l'application sous les
     * doigts de quelqu'un — et à effacer, en s'activant, le cache dont la page
     * ouverte se sert encore. C'est `js/miseajour.js` qui annonce la version
     * prête et qui donne le feu vert, une fois qu'on le lui a demandé. */
  })());
});

self.addEventListener('message', (e) => {
  const message = e.data || {};

  // Le feu vert du bandeau de mise à jour.
  if (message.type === 'passer-devant') self.skipWaiting();

  /* La version de la coquille n'est écrite qu'ici. La page la demande plutôt
   * que d'en tenir une copie, qui finirait par mentir. */
  if (message.type === 'version' && e.ports && e.ports[0]) {
    e.ports[0].postMessage({ version: VERSION });
  }
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
    /* Cache d'abord, tous caches confondus : le noyau est dans la coquille, le
     * dictionnaire complet dans le cache des données.
     *
     * Ce qui n'y est pas est rangé au passage. C'est ce qui rattrape un
     * pré-cache incomplet : un fichier manqué à l'installation entre dans le
     * cache la première fois qu'on en a besoin, et l'application se répare
     * d'elle-même au fil de l'usage. */
    e.respondWith((async () => {
      const trouve = await caches.match(e.request);
      if (trouve) return trouve;
      const reponse = await fetch(e.request);
      if (reponse.ok) {
        const copie = reponse.clone();
        caches.open(COQUILLE).then((c) => c.put(e.request, copie)).catch(() => {});
      }
      return reponse;
    })());
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
