'use strict';
/*
 * Le dictionnaire : chargement, recherche instantanée, lemmatisation.
 *
 * ── Ce que contient un paquet de données ────────────────────────────────────
 *
 *   de.idx          une ligne par vedette, triée par clé :
 *                   clé ⇥ mot ⇥ n° de tranche ⇥ bande ⇥ aperçu
 *   de-000.json…    les entrées elles-mêmes, par tranches de 900
 *   formes-de.idx   forme fléchie ⇥ n,reste  →  lemme = forme[:n] + reste
 *   phrases-000.json…  le vivier de phrases, partagé entre les deux langues
 *
 * ── Pourquoi l'index reste une chaîne ───────────────────────────────────────
 *
 * L'index allemand complet fait 59 000 lignes. Le découper en 59 000 chaînes
 * JavaScript coûterait plusieurs méga-octets rien qu'en en-têtes d'objets, sur
 * un téléphone qui n'en a pas de trop. On garde donc le texte tel qu'il est
 * arrivé et on ne retient que la position de chaque début de ligne, dans un
 * Int32Array — 4 octets par entrée. La recherche est une dichotomie sur ces
 * positions, une quinzaine de comparaisons : instantanée, sans rien construire.
 *
 * ── ⚠ cle() a un jumeau en Python ──────────────────────────────────────────
 *
 * `build/commun.py:cle()` doit donner exactement le même résultat, sinon un mot
 * présent dans l'index devient introuvable à la frappe. `build/verifier.py`
 * exécute les deux sur la même liste de cas et échoue si elles divergent.
 * Toute retouche ici doit être reportée là-bas, et inversement.
 */
(function (racine) {

  const REMPLACEMENTS = [
    ['ß', 'ss'], ['ẞ', 'ss'],
    ['œ', 'oe'], ['Œ', 'oe'],
    ['æ', 'ae'], ['Æ', 'ae'],
    ['’', "'"], ['‘', "'"], ['‛', "'"], ['‚', "'"], ['´', "'"], ['`', "'"],
    ['–', '-'], ['—', '-'], ['‐', '-'], ['‑', '-'],
    [' ', ' '], [' ', ' '], [' ', ' '],
  ];

  function cle(texte) {
    if (!texte) return '';
    let sortie = String(texte).toLowerCase();
    for (const [avant, apres] of REMPLACEMENTS) {
      if (sortie.indexOf(avant) !== -1) sortie = sortie.split(avant).join(apres);
    }
    sortie = sortie.normalize('NFD').replace(/\p{M}/gu, '');
    return sortie.split(/\s+/).filter(Boolean).join(' ');
  }

  /* Deuxième chance : « ueber » doit trouver « über », « Strasse » trouver
   * « Straße ». La clé canonique retire les tréma (« uber »), donc une saisie
   * en transcription ASCII ne tombe pas dessus. On réessaie en repliant les
   * digrammes — mais seulement en allemand, où « ue » transcrit « ü » : en
   * français, replier « oeuvre » en « ouvre » donnerait un autre mot. */
  function cleAllemandeRepliee(texte) {
    const base = cle(texte);
    const repliee = base.replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u');
    return repliee === base ? null : repliee;
  }

  // ── Index en mémoire ──────────────────────────────────────────────────────

  function indexer(texte) {
    const debuts = [];
    let position = 0;
    const taille = texte.length;
    while (position < taille) {
      debuts.push(position);
      const saut = texte.indexOf('\n', position);
      if (saut === -1) break;
      position = saut + 1;
      // Une dernière ligne vide, due au saut final, n'est pas une entrée.
      if (position >= taille) break;
    }
    return { texte, debuts: Int32Array.from(debuts) };
  }

  function cleLigne(index, numero) {
    const debut = index.debuts[numero];
    const fin = index.texte.indexOf('\t', debut);
    return index.texte.slice(debut, fin === -1 ? debut : fin);
  }

  function champs(index, numero) {
    const debut = index.debuts[numero];
    let fin = index.texte.indexOf('\n', debut);
    if (fin === -1) fin = index.texte.length;
    // Un retour chariot traînant — fichier écrit sous Windows — se collerait au
    // dernier champ et rendrait introuvable le lemme « gehen\r ». La
    // construction écrit en LF ; on se garde tout de même de dépendre de ça.
    if (fin > debut && index.texte.charCodeAt(fin - 1) === 13) fin -= 1;
    return index.texte.slice(debut, fin).split('\t');
  }

  /* Numéro de la première ligne dont la clé est ≥ `cible`. */
  function premiereLigne(index, cible) {
    let bas = 0;
    let haut = index.debuts.length;
    while (bas < haut) {
      const milieu = (bas + haut) >> 1;
      if (cleLigne(index, milieu) < cible) bas = milieu + 1;
      else haut = milieu;
    }
    return bas;
  }

  // ── État ──────────────────────────────────────────────────────────────────

  const etat = {
    paquet: null,          // 'noyau' ou 'complet'
    manifeste: null,
    index: {},             // langue → {texte, debuts}
    formes: {},            // langue → {texte, debuts}  (paquet complet)
    tranches: new Map(),   // 'de/12' → Map(mot → entrée)
  };

  async function texteDe(chemin) {
    const reponse = await fetch(chemin);
    if (!reponse.ok) throw new Error(chemin + ' : ' + reponse.status);
    return reponse.text();
  }

  async function charger(paquet) {
    const manifeste = etat.manifeste
      || JSON.parse(await texteDe('data/manifeste.json'));
    const index = {};
    const formes = {};
    for (const langue of ['de', 'fr']) {
      index[langue] = indexer(await texteDe(`data/${paquet}/${langue}.idx`));
      /* Les deux paquets ont leur index des formes fléchies — celui du noyau
       * est restreint à ses 9 000 mots. Sans lui, « ging » ne mènerait à
       * « gehen » qu'après le téléchargement complet, et la fiche ne saurait
       * pas reconnaître « Hause » dans sa phrase d'exemple. */
      formes[langue] = indexer(await texteDe(`data/${paquet}/formes-${langue}.idx`));
    }
    // Rien n'est publié tant que tout n'est pas lu : un chargement à moitié
    // fait laisserait l'application avec un index allemand neuf et un index
    // français périmé.
    etat.manifeste = manifeste;
    etat.paquet = paquet;
    etat.index = index;
    etat.formes = formes;
    etat.tranches.clear();
    viviers.clear();
    return etat;
  }

  // ── Recherche ─────────────────────────────────────────────────────────────

  function collecter(langue, prefixe, exact, resultats, plafond) {
    const index = etat.index[langue];
    if (!index) return;
    let numero = premiereLigne(index, prefixe);
    while (numero < index.debuts.length && resultats.length < plafond) {
      const ligne = champs(index, numero);
      const [k, mot, tranche, bande, apercu] = ligne;
      if (!k.startsWith(prefixe)) break;
      if (!exact || k === prefixe) {
        resultats.push({
          langue, mot, cle: k,
          tranche: Number(tranche),
          bande: Number(bande),
          apercu: apercu || '',
          exact: k === prefixe,
          via: null,
        });
      } else if (exact) {
        break;
      }
      numero += 1;
    }
  }

  /* La ligne d'index d'une vedette précise. `chercher()` ratisse trois pistes
   * dans les deux langues pour deviner ce qu'on voulait taper ; ici on sait
   * déjà, et une dichotomie suffit. Renvoie null si le mot n'est pas dans le
   * paquet installé — le paquet complet a pu être supprimé depuis qu'on l'a
   * mis en révision. */
  function vedette(langue, mot) {
    const index = etat.index[langue];
    if (!index || !mot) return null;
    const k = cle(mot);
    let numero = premiereLigne(index, k);
    while (numero < index.debuts.length) {
      const [cleLue, vedetteLue, tranche, bande, apercu] = champs(index, numero);
      if (cleLue !== k) return null;
      if (vedetteLue === mot) {
        return { langue, mot: vedetteLue, cle: cleLue, tranche: Number(tranche),
                 bande: Number(bande), apercu: apercu || '', via: null };
      }
      numero += 1;
    }
    return null;
  }

  /* La vedette derrière une graphie rencontrée dans un texte.
   *
   * C'est ce qui rend les mots cliquables : on lit « Häuser » dans une citation
   * et il faut arriver à « Haus ». Deux dichotomies au plus — la graphie telle
   * quelle, puis ses lemmes — soit une trentaine de comparaisons. Une fiche en
   * contient quelques centaines de mots : le coût total se mesure en
   * millisecondes, et il n'y a rien à mettre en cache.
   *
   * Renvoie null quand le mot n'est pas dans le paquet installé. L'appelant
   * doit le prévoir : c'est le cas ordinaire pour qui n'a que le noyau, et un
   * mot muet vaut mieux qu'un bouton qui ne fait rien. */
  function resoudre(graphie, langue) {
    const k = cle(graphie);
    if (!k) return null;

    const direct = [];
    collecter(langue, k, true, direct, 8);
    if (direct.length) return meilleur(direct, graphie);

    for (const lemme of lemmes(langue, k)) {
      const lot = [];
      collecter(langue, lemme, true, lot, 8);
      if (lot.length) return meilleur(lot, graphie);
    }
    return null;
  }

  /* Plusieurs vedettes partagent souvent une clé : « gehen » le verbe et
   * « Gehen » le nom, « été » la saison et « été » le participe. Prendre la
   * première venue ouvrait la fiche du nom quand on avait cliqué sur le verbe
   * — la clé ignore la casse, et c'est justement ce qui les distingue en
   * allemand. La graphie exacte tranche donc ; à défaut, le mot le plus
   * courant, qui est presque toujours celui qu'on visait. */
  function meilleur(lot, graphie) {
    const exact = lot.find((resultat) => resultat.mot === graphie);
    if (exact) return exact;
    return lot.reduce((a, b) => (b.bande < a.bande ? b : a));
  }

  /* Le lemme d'une forme fléchie, s'il est connu. Renvoie une liste : « ist »
   * n'a qu'un lemme, mais certaines formes en ont plusieurs. */
  function lemmes(langue, k) {
    const index = etat.formes[langue];
    if (!index || !k) return [];
    const numero = premiereLigne(index, k);
    if (numero >= index.debuts.length || cleLigne(index, numero) !== k) return [];
    const [, codes] = champs(index, numero);
    return codes.split('|').map((code) => {
      const virgule = code.indexOf(',');
      const partage = Number(code.slice(0, virgule));
      return k.slice(0, partage) + code.slice(virgule + 1);
    });
  }

  /* Trois rangs, dans cet ordre :
   *
   *   0  la frappe est exactement la vedette                 « gehen » → gehen
   *   1  la frappe est une forme fléchie de la vedette       « ging »  → gehen
   *   2  la frappe est le début de la vedette                « gehe »  → gehen
   *
   * Le rang 1 doit passer avant le rang 2, et c'est tout l'intérêt de les
   * distinguer : qui tape « ging » veut « gehen », pas « gingembre » — même si
   * « gingembre » commence bien par « ging ». Ensuite viennent les mots les
   * plus courants, puis les plus courts : un préfixe court désigne presque
   * toujours un mot plus utile que ses composés.
   */
  function ordonner(a, b) {
    if (a.rang !== b.rang) return a.rang - b.rang;
    if (a.bande !== b.bande) return a.bande - b.bande;
    if (a.cle.length !== b.cle.length) return a.cle.length - b.cle.length;
    return a.cle < b.cle ? -1 : (a.cle > b.cle ? 1 : 0);
  }

  function chercher(saisie, plafond) {
    const limite = plafond || 40;
    const k = cle(saisie);
    if (!k) return [];

    const resultats = [];
    const vus = new Set();

    function ajouter(lot, rang, via) {
      for (const resultat of lot) {
        const empreinte = resultat.langue + ' ' + resultat.mot;
        if (vus.has(empreinte)) continue;
        vus.add(empreinte);
        resultat.rang = resultat.exact ? 0 : rang;
        resultat.via = via;
        resultats.push(resultat);
      }
    }

    /* Les trois pistes sont suivies à chaque frappe, et non l'une à défaut de
     * l'autre. Se contenter du préfixe tant qu'il donne quelque chose paraît
     * économique et ne l'est pas : « ging » a des voisins — gingembre,
     * gingival — derrière lesquels « gehen » ne serait jamais remonté, et
     * « ueber » se serait fait doubler par « Uebersyren ». */

    // 1. La saisie est-elle une forme fléchie de quelque chose ?
    for (const langue of ['de', 'fr']) {
      for (const lemme of lemmes(langue, k)) {
        const lot = [];
        collecter(langue, lemme, true, lot, 4);
        ajouter(lot, 1, saisie);
      }
    }

    // 2. Une transcription sans tréma ? « ueber » pour « über », « Strasse »
    //    pour « Straße ». Uniquement côté allemand : replier « oe » en français
    //    changerait « oeuvre » en « ouvre », qui est un autre mot.
    const repliee = cleAllemandeRepliee(saisie);
    if (repliee) {
      const lot = [];
      collecter('de', repliee, false, lot, 6);
      ajouter(lot, 1, saisie);
    }

    // 3. Le début d'un mot, l'usage ordinaire.
    for (const langue of ['de', 'fr']) {
      const lot = [];
      collecter(langue, k, false, lot, limite * 2);
      ajouter(lot, 2, null);
    }

    resultats.sort(ordonner);
    return resultats.slice(0, limite);
  }

  // ── Ouverture d'une entrée ────────────────────────────────────────────────

  async function tranche(langue, numero) {
    const nom = langue + '/' + numero;
    if (etat.tranches.has(nom)) return etat.tranches.get(nom);
    const brut = JSON.parse(await texteDe(
      `data/${etat.paquet}/${langue}-${String(numero).padStart(3, '0')}.json`));
    const carte = new Map();
    for (const [mot, bande, lectures, numerosDePhrases, voisins] of brut.e) {
      /* Le numéro de tranche voyage avec l'entrée : une carte de révision ne
       * garde que de quoi retrouver le mot, et sans lui elle ne saurait pas
       * dans quel fichier aller le chercher. */
      carte.set(mot, {
        mot, langue, bande, lectures, tranche: numero,
        phrases: numerosDePhrases || [],
        voisins: voisins || [],
      });
    }
    // Une poignée de tranches en mémoire suffit à la navigation ; au-delà on
    // relâche les plus anciennes plutôt que de garder 25 Mo au chaud.
    if (etat.tranches.size >= 8) {
      etat.tranches.delete(etat.tranches.keys().next().value);
    }
    etat.tranches.set(nom, carte);
    return carte;
  }

  async function ouvrir(resultat) {
    const carte = await tranche(resultat.langue, resultat.tranche);
    return carte.get(resultat.mot) || null;
  }

  /* Un lot d'entrées prises au hasard, pour fabriquer les leurres des questions
   * à choix multiples. On tire une tranche entière plutôt que des entrées une
   * par une : la tranche est de toute façon chargée d'un bloc, et elle contient
   * 900 mots voisins par l'alphabet — assez de variété une fois filtrés par
   * nature et par bande. */
  function nombreDeTranches(langue) {
    if (!etat.manifeste || !etat.paquet) return 0;
    const fichiers = etat.manifeste.paquets[etat.paquet].fichiers;
    return fichiers.filter((f) => f.indexOf('/' + langue + '-') !== -1).length;
  }

  async function entreesAuHasard(langue, combien) {
    const total = nombreDeTranches(langue);
    if (!total) return [];
    const lot = [];
    const vues = new Set();
    for (let essai = 0; essai < 3 && lot.length < combien; essai += 1) {
      const numero = Math.floor(Math.random() * total);
      if (vues.has(numero)) continue;
      vues.add(numero);
      try {
        for (const entree of (await tranche(langue, numero)).values()) {
          lot.push(entree);
          if (lot.length >= combien) break;
        }
      } catch (erreur) {
        /* Une tranche absente n'est pas une raison d'interrompre une séance. */
      }
    }
    return lot;
  }

  // ── Phrases d'exemple ─────────────────────────────────────────────────────

  /* Les phrases sont partagées entre les deux langues — une paire illustre un
   * mot allemand et un mot français — et vivent donc dans un vivier commun. Une
   * entrée n'en garde que les numéros. */
  const PAR_TRANCHE = 900;
  const viviers = new Map();

  async function trancheDePhrases(numero) {
    if (viviers.has(numero)) return viviers.get(numero);
    const brut = JSON.parse(await texteDe(
      `data/${etat.paquet}/phrases-${String(numero).padStart(3, '0')}.json`));
    if (viviers.size >= 6) viviers.delete(viviers.keys().next().value);
    viviers.set(numero, brut.p);
    return brut.p;
  }

  async function phrases(numeros) {
    if (!numeros || !numeros.length) return [];
    const sortie = [];
    for (const identifiant of numeros) {
      try {
        const lot = await trancheDePhrases(Math.floor(identifiant / PAR_TRANCHE));
        const paire = lot[identifiant % PAR_TRANCHE];
        if (paire) sortie.push({ de: paire[0], fr: paire[1] });
      } catch (erreur) {
        /* Une tranche manquante ne doit pas emporter la fiche : le mot, sa
         * traduction et son genre valent d'être montrés même sans exemple. */
      }
    }
    return sortie;
  }

  racine.Lexique = {
    cle,
    charger,
    chercher,
    vedette,
    resoudre,
    ouvrir,
    phrases,
    entreesAuHasard,
    nombreDeTranches,
    lemmes,
    etat,
    get paquet() { return etat.paquet; },
    get manifeste() { return etat.manifeste; },
  };

})(window);
