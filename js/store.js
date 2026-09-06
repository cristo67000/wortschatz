'use strict';
/*
 * Stockage local — IndexedDB.
 *
 * Rien ne sort de l'appareil : pas de compte, pas de serveur, pas de mesure
 * d'audience. Le dictionnaire lui-même n'est pas ici — il est dans le cache du
 * service worker, en fichiers ; ici ne vit que ce qui appartient à la personne
 * qui apprend.
 *
 * Six magasins :
 *   reglages    langue de l'interface, voix, quotas — une ligne par réglage
 *   cartes      une carte de révision : quel mot, dans quel sens, quand revoir
 *   journal     une ligne par réponse donnée, pour les statistiques
 *   historique  les mots récemment consultés
 *   notes       une note personnelle attachée à un mot — du dictionnaire ou à soi
 *   perso       les mots et expressions qu'on a ajoutés soi-même
 *
 * Le journal est volontairement séparé des cartes : une carte dit l'état
 * présent, le journal dit ce qui s'est passé. Sans lui, impossible de montrer
 * un progrès dans le temps, et une carte remise à zéro effacerait l'histoire de
 * son apprentissage.
 *
 * ── Notes et mots personnels : deux magasins, pas un champ ──────────────────
 *
 * Une note n'est pas une propriété du dictionnaire, et un mot personnel n'en
 * fait pas partie. Les mêler aux données livrées les ferait disparaître au
 * premier changement de paquet — c'est précisément ce qu'il ne faut pas. Ils
 * vivent donc à part, désignés par une référence :
 *
 *   dico:de Haus    une entrée du dictionnaire, par sa langue et sa vedette
 *   perso:p-1a2b3c  un mot à soi, par son identifiant stable
 *
 * L'identifiant d'un mot personnel ne dépend pas de son orthographe : corriger
 * « Baguet » en « Baguette » ne perd ni sa note ni ses révisions.
 */
(function (racine) {

  const NOM = 'wortschatz';
  const VERSION = 3;
  let bd = null;

  /* Version 1 → 2 : la carte « sens » devient une carte de direction.
   *
   * La version 1 n'avait qu'une carte par mot pour les deux sens de traduction.
   * La version 2 en distingue deux, nommées d'après la langue de la réponse.
   * Il faut donc décider ce que devient l'ancienne — et la réponse n'est pas
   * indifférente : c'est plusieurs mois de révisions de deux personnes.
   *
   * Elle devient `vers-<langue de l'entrée>`, la direction productive. Ses
   * exercices avancés — écrire le mot, l'écrire avec son article, l'écouter et
   * le transcrire — demandaient tous de produire la vedette : c'est cette
   * compétence-là que son intervalle mesure. La faire passer pour une carte de
   * compréhension surestimerait ce qui est su.
   *
   * La direction inverse, si le réglage la demande, naît neuve. C'est exact :
   * elle n'a jamais été révisée séparément.
   *
   * Intervalle, facilité, réussites, échecs et date de création sont conservés
   * tels quels. Seuls l'identifiant et le type changent — et comme
   * l'identifiant est la clé du magasin, l'ancienne ligne doit être effacée,
   * pas seulement réécrite.
   */
  function migrerLesCartes(magasin) {
    const parcours = magasin.openCursor();
    parcours.onsuccess = () => {
      const curseur = parcours.result;
      if (!curseur) return;
      const carte = curseur.value;
      if (carte.type === 'sens') {
        const ancien = carte.id;
        carte.type = 'vers-' + carte.langue;
        carte.id = identifiant(carte.langue, carte.mot, carte.type);
        magasin.put(carte);
        if (carte.id !== ancien) magasin.delete(ancien);
      }
      curseur.continue();
    };
  }

  /* Version 2 → 3 : deux magasins de plus, et un index sur les cartes.
   *
   * Rien n'est touché de ce qui existe. Les cartes gardent leur identifiant,
   * leur échéance et leur historique ; le journal, les réglages et l'historique
   * de consultation ne sont pas même ouverts. Une migration qui ne fait
   * qu'ajouter ne peut rien perdre, et c'est la seule propriété qui compte ici
   * — derrière ces lignes il y a des mois de révisions.
   *
   * L'index `perso` reste vide pour toutes les cartes existantes, qui n'ont pas
   * ce champ : IndexedDB n'indexe pas les enregistrements où la clé manque.
   * C'est exactement ce qu'on veut — une carte du dictionnaire n'est pas une
   * carte de mot personnel, et les deux ne doivent jamais se répondre.
   *
   * La fonction est appelée à chaque ouverture qui monte de version, y compris
   * depuis la version 1 : elle ne fait que créer ce qui manque, et repasser
   * dessus ne coûte rien.
   */
  function migrerVers3(base, transaction) {
    if (base.objectStoreNames.contains('cartes')) {
      const cartes = transaction.objectStore('cartes');
      if (!cartes.indexNames.contains('perso')) {
        cartes.createIndex('perso', 'perso', { unique: false });
      }
    }
    if (!base.objectStoreNames.contains('notes')) {
      const magasin = base.createObjectStore('notes', { keyPath: 'id' });
      magasin.createIndex('modifie', 'modifie', { unique: false });
    }
    if (!base.objectStoreNames.contains('perso')) {
      const magasin = base.createObjectStore('perso', { keyPath: 'id' });
      magasin.createIndex('cle', 'cle', { unique: false });
      magasin.createIndex('langue', 'langue', { unique: false });
      magasin.createIndex('cree', 'cree', { unique: false });
    }
  }

  function ouvrir() {
    if (bd) return Promise.resolve(bd);
    return new Promise((resoudre, rejeter) => {
      const demande = indexedDB.open(NOM, VERSION);
      demande.onupgradeneeded = (e) => {
        const base = e.target.result;
        const transaction = e.target.transaction;
        if (!base.objectStoreNames.contains('reglages')) {
          base.createObjectStore('reglages', { keyPath: 'cle' });
        }
        if (!base.objectStoreNames.contains('cartes')) {
          const magasin = base.createObjectStore('cartes', { keyPath: 'id' });
          // On interroge surtout « qu'est-ce qui est dû maintenant ? ».
          magasin.createIndex('echeance', 'echeance', { unique: false });
          magasin.createIndex('mot', 'mot', { unique: false });
          magasin.createIndex('etat', 'etat', { unique: false });
        } else if (e.oldVersion < 2) {
          migrerLesCartes(transaction.objectStore('cartes'));
        }
        if (!base.objectStoreNames.contains('journal')) {
          const magasin = base.createObjectStore('journal',
            { keyPath: 'id', autoIncrement: true });
          magasin.createIndex('quand', 'quand', { unique: false });
        }
        if (!base.objectStoreNames.contains('historique')) {
          const magasin = base.createObjectStore('historique', { keyPath: 'id' });
          magasin.createIndex('quand', 'quand', { unique: false });
        }
        migrerVers3(base, transaction);
      };
      demande.onsuccess = () => {
        bd = demande.result;
        /* Un autre onglet qui demanderait une version supérieure resterait
         * bloqué tant que celui-ci garde la base ouverte. */
        bd.onversionchange = () => { bd.close(); bd = null; };
        resoudre(bd);
      };
      demande.onerror = () => rejeter(demande.error);
    });
  }

  function transaction(magasins, mode) {
    return ouvrir().then((base) => base.transaction(magasins, mode));
  }

  function promesse(requete) {
    return new Promise((resoudre, rejeter) => {
      requete.onsuccess = () => resoudre(requete.result);
      requete.onerror = () => rejeter(requete.error);
    });
  }

  // ── Réglages ──────────────────────────────────────────────────────────────

  const DEFAUTS = {
    langue: null,            // null = suivre le navigateur au premier lancement
    voix: true,
    paquet: 'noyau',
    nouveautesParJour: 10,
    exigerArticle: true,     // les noms se révisent avec leur article
    sensDeTravail: 'les-deux', // 'les-deux' | 'vers-de' | 'vers-fr'
  };

  async function lireReglages() {
    const t = await transaction(['reglages'], 'readonly');
    const lignes = await promesse(t.objectStore('reglages').getAll());
    const valeurs = Object.assign({}, DEFAUTS);
    for (const ligne of lignes) valeurs[ligne.cle] = ligne.valeur;
    return valeurs;
  }

  async function ecrireReglage(cle, valeur) {
    const t = await transaction(['reglages'], 'readwrite');
    await promesse(t.objectStore('reglages').put({ cle, valeur }));
    return valeur;
  }

  // ── Cartes de révision ────────────────────────────────────────────────────

  /* Le séparateur est un caractère nul, et ce n'est pas une coquetterie : une
   * vedette peut contenir des espaces — « dans l'ensemble », « avoir lieu » —
   * et un identifiant séparé par des espaces deviendrait ambigu. Un NUL ne
   * figure dans aucune vedette, dans aucune langue.
   *
   * Il est là depuis le premier commit, et des bases installées en dépendent :
   * le changer renommerait toutes les cartes de tout le monde. */
  function identifiant(langue, mot, type) {
    return langue + ' ' + mot + ' ' + type;
  }

  /* L'identifiant d'une carte de mot personnel.
   *
   * Il ne contient pas la graphie, et c'est tout l'intérêt : corriger
   * l'orthographe d'un mot à soi ne doit pas fabriquer une carte neuve et
   * abandonner l'ancienne avec ses trois mois d'intervalle. Il ne peut pas non
   * plus entrer en collision avec une carte du dictionnaire — « perso: » ne se
   * lit dans aucun code de langue. */
  function identifiantPerso(uid, type) {
    return 'perso:' + uid + ' ' + type;
  }

  async function lireCarte(id) {
    const t = await transaction(['cartes'], 'readonly');
    return promesse(t.objectStore('cartes').get(id));
  }

  /* Les cartes d'un mot. `perso` distingue les deux familles : un mot personnel
   * qui s'écrirait comme une vedette du dictionnaire a bien ses cartes à lui, et
   * les deux ne se mélangent pas. */
  async function cartesDuMot(langue, mot, perso) {
    const t = await transaction(['cartes'], 'readonly');
    const magasin = t.objectStore('cartes');
    if (perso) return promesse(magasin.index('perso').getAll(perso));
    const toutes = await promesse(magasin.index('mot').getAll(mot));
    return toutes.filter((c) => c.langue === langue && !c.perso);
  }

  async function ecrireCarte(carte) {
    const t = await transaction(['cartes'], 'readwrite');
    await promesse(t.objectStore('cartes').put(carte));
    return carte;
  }

  async function supprimerCarte(id) {
    const t = await transaction(['cartes'], 'readwrite');
    return promesse(t.objectStore('cartes').delete(id));
  }

  async function toutesLesCartes() {
    const t = await transaction(['cartes'], 'readonly');
    return promesse(t.objectStore('cartes').getAll());
  }

  async function cartesDues(quand) {
    const t = await transaction(['cartes'], 'readonly');
    const borne = IDBKeyRange.upperBound(quand);
    return promesse(t.objectStore('cartes').index('echeance').getAll(borne));
  }

  // ── Journal ───────────────────────────────────────────────────────────────

  async function noter(ligne) {
    const t = await transaction(['journal'], 'readwrite');
    return promesse(t.objectStore('journal').add(ligne));
  }

  async function journalDepuis(quand) {
    const t = await transaction(['journal'], 'readonly');
    const borne = IDBKeyRange.lowerBound(quand);
    return promesse(t.objectStore('journal').index('quand').getAll(borne));
  }

  // ── Historique de consultation ────────────────────────────────────────────

  const HISTORIQUE_MAX = 60;

  async function consulter(langue, mot) {
    const t = await transaction(['historique'], 'readwrite');
    const magasin = t.objectStore('historique');
    await promesse(magasin.put({ id: langue + ' ' + mot, langue, mot,
                                quand: Date.now() }));
    const tout = await promesse(magasin.index('quand').getAll());
    for (const vieux of tout.slice(0, Math.max(0, tout.length - HISTORIQUE_MAX))) {
      magasin.delete(vieux.id);
    }
  }

  async function historique() {
    const t = await transaction(['historique'], 'readonly');
    const tout = await promesse(t.objectStore('historique').index('quand').getAll());
    return tout.reverse();
  }

  // ── Notes personnelles ────────────────────────────────────────────────────

  async function lireNote(id) {
    const t = await transaction(['notes'], 'readonly');
    return promesse(t.objectStore('notes').get(id));
  }

  async function ecrireNote(note) {
    const t = await transaction(['notes'], 'readwrite');
    await promesse(t.objectStore('notes').put(note));
    return note;
  }

  async function supprimerNote(id) {
    const t = await transaction(['notes'], 'readwrite');
    return promesse(t.objectStore('notes').delete(id));
  }

  async function toutesLesNotes() {
    const t = await transaction(['notes'], 'readonly');
    return promesse(t.objectStore('notes').getAll());
  }

  // ── Mots personnels ───────────────────────────────────────────────────────

  async function lireMotPerso(id) {
    const t = await transaction(['perso'], 'readonly');
    return promesse(t.objectStore('perso').get(id));
  }

  async function ecrireMotPerso(mot) {
    const t = await transaction(['perso'], 'readwrite');
    await promesse(t.objectStore('perso').put(mot));
    return mot;
  }

  async function supprimerMotPerso(id) {
    const t = await transaction(['perso'], 'readwrite');
    return promesse(t.objectStore('perso').delete(id));
  }

  async function tousLesMotsPerso() {
    const t = await transaction(['perso'], 'readonly');
    return promesse(t.objectStore('perso').getAll());
  }

  racine.Store = {
    ouvrir,
    DEFAUTS,
    lireReglages, ecrireReglage,
    identifiant, identifiantPerso,
    lireCarte, cartesDuMot, ecrireCarte, supprimerCarte,
    toutesLesCartes, cartesDues,
    noter, journalDepuis,
    consulter, historique,
    lireNote, ecrireNote, supprimerNote, toutesLesNotes,
    lireMotPerso, ecrireMotPerso, supprimerMotPerso, tousLesMotsPerso,
  };

})(window);
