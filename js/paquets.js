'use strict';
/*
 * Installation du dictionnaire complet.
 *
 * Le noyau part avec l'application et vit dans le cache de la coquille. Le
 * dictionnaire complet — une centaine de fichiers, environ 25 Mo — est
 * téléchargé sur décision de l'utilisateur et rangé dans un cache **à part**,
 * nommé d'après la version des *données*, pas celle de l'application.
 *
 * Cette séparation est tout le sujet de ce fichier. Le service worker de nos
 * autres applications supprime, à chaque activation, tous les caches sauf le
 * sien : repris tel quel, la moindre correction de faute de frappe dans le
 * code effacerait les 25 Mo que l'utilisateur a patiemment téléchargés, sur son
 * forfait. Ici, personne ne supprime le cache des données sinon :
 *   — l'utilisateur, explicitement, depuis les réglages ;
 *   — l'installation d'une version plus récente des données, qui remplace
 *     l'ancienne une fois qu'elle est complète.
 *
 * Le téléchargement est repris là où il s'est arrêté : un fichier déjà en cache
 * n'est pas redemandé. Couper le réseau au milieu ne coûte donc que ce qui
 * restait.
 */
(function (racine) {

  const PREFIXE = 'wortschatz-donnees-';

  function nomDuCache(version) {
    return PREFIXE + version;
  }

  async function cachesDeDonnees() {
    const noms = await caches.keys();
    return noms.filter((n) => n.startsWith(PREFIXE));
  }

  /* Le paquet complet est-il installé, et entièrement ? Un téléchargement
   * interrompu laisse un cache partiel : on vérifie que tous les fichiers
   * annoncés au manifeste y sont, sinon on considère qu'il n'est pas installé
   * — mieux vaut proposer de reprendre que d'ouvrir un dictionnaire troué. */
  async function complet(manifeste) {
    if (!('caches' in racine)) return false;
    const nom = nomDuCache(manifeste.version);
    if (!(await caches.has(nom))) return false;
    const cache = await caches.open(nom);
    for (const fichier of manifeste.paquets.complet.fichiers) {
      if (!(await cache.match('data/' + fichier))) return false;
    }
    return true;
  }

  async function manquants(manifeste) {
    const cache = await caches.open(nomDuCache(manifeste.version));
    const liste = [];
    for (const fichier of manifeste.paquets.complet.fichiers) {
      if (!(await cache.match('data/' + fichier))) liste.push('data/' + fichier);
    }
    return liste;
  }

  /* Téléchargement, avec avancement et possibilité d'arrêt.
   *
   * `avancer({faits, total, octets})` est appelé après chaque fichier.
   * `signal` est un AbortSignal : arrêter en cours de route ne détruit rien,
   * ce qui est déjà arrivé reste en cache pour la prochaine tentative.
   */
  async function telecharger(manifeste, avancer, signal) {
    const cache = await caches.open(nomDuCache(manifeste.version));
    const aFaire = await manquants(manifeste);
    const total = manifeste.paquets.complet.fichiers.length;
    let faits = total - aFaire.length;
    let octets = 0;

    // Quatre à la fois : assez pour ne pas attendre la latence de chaque
    // requête, assez peu pour ne pas saturer une connexion mobile.
    const PARALLELE = 4;
    let curseur = 0;

    async function ouvrier() {
      while (curseur < aFaire.length) {
        if (signal && signal.aborted) return;
        const chemin = aFaire[curseur];
        curseur += 1;
        const reponse = await fetch(chemin, { cache: 'no-cache', signal });
        if (!reponse.ok) throw new Error(chemin + ' : ' + reponse.status);
        const copie = reponse.clone();
        await cache.put(chemin, reponse);
        try {
          octets += (await copie.blob()).size;
        } catch (e) {
          /* La taille n'est qu'indicative ; ne pas la connaître n'empêche
           * rien. */
        }
        faits += 1;
        if (avancer) avancer({ faits, total, octets });
      }
    }

    const ouvriers = [];
    for (let i = 0; i < Math.min(PARALLELE, aFaire.length); i += 1) ouvriers.push(ouvrier());
    await Promise.all(ouvriers);

    if (signal && signal.aborted) return false;

    // Le nouveau paquet est entier : les moutures précédentes peuvent partir.
    for (const nom of await cachesDeDonnees()) {
      if (nom !== nomDuCache(manifeste.version)) await caches.delete(nom);
    }
    return true;
  }

  async function supprimer() {
    for (const nom of await cachesDeDonnees()) await caches.delete(nom);
  }

  /* Les données d'une version qui n'existe plus.
   *
   * Le format des données a changé en version 2 : le cache s'appelle désormais
   * `wortschatz-donnees-2`, et celui de la version 1 ne sera plus jamais lu —
   * `complet()` ne regarde que la version du manifeste courant. Ce sont trente
   * méga-octets morts sur l'appareil.
   *
   * On les efface donc, et c'est la **seule** suppression automatique que
   * s'autorise l'application : ce qui est effacé ici est inutilisable par
   * définition, alors que le cache de la version courante représente un
   * téléchargement que l'utilisateur a payé de son forfait et que personne ne
   * doit lui reprendre sans le lui demander. */
  async function oublierLesPerimes(manifeste) {
    if (!('caches' in racine)) return 0;
    const courant = nomDuCache(manifeste.version);
    let effaces = 0;
    for (const nom of await cachesDeDonnees()) {
      if (nom !== courant) {
        await caches.delete(nom);
        effaces += 1;
      }
    }
    return effaces;
  }

  /* Poids annoncé à l'utilisateur avant qu'il ne décide. */
  function poids(manifeste) {
    return manifeste.paquets.complet.octets;
  }

  /* Une taille lisible, dans les unités de la langue affichée : « 30,1 Mo »
   * en français, « 30,1 MB » en allemand. La virgule décimale est commune aux
   * deux ; seules les unités changent. */
  const UNITES = {
    fr: ['o', 'Ko', 'Mo', 'Go'],
    de: ['B', 'KB', 'MB', 'GB'],
  };

  function humain(octets, langue) {
    const unites = UNITES[langue] || UNITES.fr;
    let valeur = octets;
    let rang = 0;
    while (valeur >= 1024 && rang < unites.length - 1) { valeur /= 1024; rang += 1; }
    const nombre = rang === 0 ? Math.round(valeur) : valeur.toFixed(1);
    return String(nombre).replace('.', ',') + ' ' + unites[rang];
  }

  racine.Paquets = { complet, manquants, telecharger, supprimer, oublierLesPerimes,
                     poids, humain, nomDuCache };

})(window);
