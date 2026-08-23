'use strict';
/*
 * Les exercices, et la correction.
 *
 * ── Pourquoi plusieurs sortes ──────────────────────────────────────────────
 *
 * Reconnaître une réponse dans une liste et savoir la produire de mémoire sont
 * deux compétences distinctes, et la première donne l'illusion de la seconde.
 * Un apprenant qui ne fait que des questions à choix multiples se croit prêt et
 * reste muet le jour où il faut parler. Chaque carte passe donc par une
 * difficulté croissante :
 *
 *   1re fois     reconnaître   le mot étranger → sa traduction, parmi quatre
 *   2e fois      choisir       la traduction → le mot étranger, parmi quatre
 *   3e fois      écrire        la traduction → le mot étranger, au clavier
 *   4e fois      écrire tout   le même, article compris : « die Bohne »
 *   ensuite      alterner      écriture exigeante, phrase à trou, écoute
 *
 * Alterner ensuite n'est pas de la décoration : une carte toujours posée de la
 * même façon finit par être reconnue à sa forme plutôt qu'à son sens.
 *
 * Le genre des noms allemands a son exercice à lui, à trois boutons. C'est la
 * faute la plus tenace d'un francophone, et la seule que l'on puisse corriger
 * par la répétition pure : il n'y a rien à comprendre, seulement à retenir.
 *
 * Le quatrième palier n'en est pas la redite. Devant les trois boutons, le mot
 * est sous les yeux et il ne reste qu'à choisir ; au palier exigeant, on ne
 * voit que « haricot » et il faut ressortir « die Bohne » entière, orthographe
 * et genre d'un seul geste. C'est sous cette forme qu'un nom s'emploie, c'est
 * donc celle-là qu'il faut savoir produire. Il ne concerne que les noms dont le
 * genre est connu, et se coupe dans les Réglages pour qui le trouve trop rude.
 *
 * ── La correction ──────────────────────────────────────────────────────────
 *
 * Elle est tolérante mais instructive. Une majuscule oubliée sur un nom
 * allemand n'est pas comptée fausse — elle est expliquée. Un accent manquant
 * non plus. Une lettre de travers donne « presque » et une seconde chance.
 * Compter faux ce qui n'est qu'une étourderie décourage sans rien enseigner ;
 * l'accepter en silence laisse l'erreur s'installer.
 *
 * Au palier exigeant, l'article oublié vaut « presque » et l'article faux vaut
 * « faux ». Ce n'est pas la même erreur : ne pas écrire l'article qu'on ne
 * réclamait pas la veille est une étourderie, écrire « der Bohne » est une
 * croyance — et une croyance qu'on ne corrige pas tient des années.
 */
(function (racine) {

  /* Les articles, et ce que chacun enseigne.
   *
   * Trois tables plutôt qu'une, parce qu'elles répondent à trois questions
   * distinctes : quel article il faut savoir, ce qu'un article tapé dit du
   * genre, et lesquels on reconnaît sans les avoir demandés.
   *
   * En français on demande « un / une » et non « le / la », comme la fiche :
   * devant une voyelle l'article défini s'élide et cesse justement de dire ce
   * qu'on cherche à faire apprendre.
   *
   * C'est la seule copie de cette table : `Fiche` s'y réfère plutôt que d'en
   * tenir une seconde, qui finirait par en différer sans que rien ne le dise.
   */
  const ARTICLES = {
    de: { masc: 'der', fem: 'die', neut: 'das' },
    fr: { masc: 'un', fem: 'une' },
  };

  const GENRE_DE_L_ARTICLE = {
    de: { der: 'masc', die: 'fem', das: 'neut' },
    fr: { un: 'masc', le: 'masc', une: 'fem', la: 'fem' },
  };

  /* Du bon allemand et du bon français, mais qui n'apprend pas le genre : un
   * cas oblique, un indéfini ambigu (« ein » vaut masculin ou neutre), un
   * article élidé. On les reconnaît pour pouvoir les corriger. */
  const AUTRES_ARTICLES = {
    de: ['dem', 'den', 'des', 'ein', 'eine', 'einen', 'einem', 'eines', 'einer'],
    fr: ['l', 'les', 'des', 'du'],
  };

  function auHasard(liste) {
    return liste[Math.floor(Math.random() * liste.length)];
  }

  function melanger(liste) {
    const copie = liste.slice();
    for (let i = copie.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copie[i], copie[j]] = [copie[j], copie[i]];
    }
    return copie;
  }

  // ── Ce qu'on demande, et ce qu'on accepte ─────────────────────────────────

  /* Toutes les traductions d'une entrée, sans doublon, sens par sens. */
  function traductions(entree) {
    const vues = [];
    for (const lecture of entree.lectures) {
      for (const [, liste] of lecture[4]) {
        for (const mot of liste) {
          if (vues.indexOf(mot) === -1) vues.push(mot);
        }
      }
    }
    return vues;
  }

  function premiereLecture(entree) {
    return entree.lectures[0] || [];
  }

  function genreDe(entree) {
    for (const lecture of entree.lectures) {
      if (lecture[0] === 'n' && lecture[1]) return lecture[1];
    }
    return null;
  }

  /* Tous les genres sous lesquels le mot se lit, dans l'ordre. « See » est
   * masculin quand c'est un lac et féminin quand c'est la mer : les deux
   * réponses sont justes, et n'en accepter qu'une punirait qui sait les deux. */
  function genresDe(entree) {
    const vus = [];
    for (const lecture of entree.lectures) {
      if (lecture[0] === 'n' && lecture[1] && vus.indexOf(lecture[1]) === -1) {
        vus.push(lecture[1]);
      }
    }
    return vus;
  }

  function estNom(entree) {
    return premiereLecture(entree)[0] === 'n';
  }

  /* Le mot précédé de son article, sous chacun de ses genres — ou null quand la
   * question ne se pose pas : ce n'est pas un nom, ou son genre est absent des
   * données. 2 % des noms allemands n'en ont pas, et interroger sur ce qu'on
   * ignore soi-même n'apprend rien à personne. */
  function avecArticle(entree) {
    const table = ARTICLES[entree.langue];
    if (!table || !estNom(entree)) return null;
    const genres = genresDe(entree).filter((genre) => table[genre]);
    if (!genres.length) return null;
    return { genres, formes: genres.map((genre) => table[genre] + ' ' + entree.mot) };
  }

  // ── Correction ────────────────────────────────────────────────────────────

  function nettoyer(texte) {
    return String(texte || '')
      .replace(/[.,;:!?…"«»()\[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* Distance de Levenshtein, plafonnée : au-delà de 2 la réponse n'est plus
   * une étourderie, inutile de compter plus loin. */
  function distance(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 3;
    let precedente = [];
    for (let j = 0; j <= b.length; j += 1) precedente[j] = j;
    for (let i = 1; i <= a.length; i += 1) {
      const courante = [i];
      let minimum = i;
      for (let j = 1; j <= b.length; j += 1) {
        const cout = a[i - 1] === b[j - 1] ? 0 : 1;
        courante[j] = Math.min(courante[j - 1] + 1, precedente[j] + 1, precedente[j - 1] + cout);
        if (courante[j] < minimum) minimum = courante[j];
      }
      if (minimum > 2) return 3;
      precedente = courante;
    }
    return precedente[b.length];
  }

  /* Sépare l'article de ce qui le suit. Renvoie { article, mot } ; `article`
   * est nul quand le premier mot n'en est pas un — « pomme de terre » commence
   * par « pomme », il n'y a rien à couper. */
  function decouper(texte, langue) {
    const connus = GENRE_DE_L_ARTICLE[langue] || {};
    const autres = AUTRES_ARTICLES[langue] || [];
    const estArticle = (mot) => connus[mot] !== undefined || autres.indexOf(mot) !== -1;

    const elide = /^(\p{L}+)['’]\s*(\S.*)$/u.exec(texte);
    if (elide && estArticle(elide[1].toLowerCase())) {
      return { article: elide[1].toLowerCase(), mot: elide[2] };
    }
    const morceaux = texte.split(' ');
    const tete = morceaux[0].toLowerCase();
    if (morceaux.length > 1 && estArticle(tete)) {
      return { article: tete, mot: morceaux.slice(1).join(' ') };
    }
    return { article: null, mot: texte };
  }

  /* Hors du palier exigeant, l'article allemand est facultatif : « das Haus »
   * et « Haus » valent la même réponse. */
  function sansArticle(texte, langue) {
    if (langue !== 'de') return texte;
    return decouper(texte, 'de').mot;
  }

  /* Compare un mot nu à des réponses nues. C'est le cœur de la correction ;
   * `corriger` l'habille selon ce que l'exercice réclamait. */
  function comparerMot(brut, candidats, reglages) {
    const langue = reglages.langue || 'de';

    // 1. Exactement la bonne réponse.
    for (const attendu of candidats) {
      if (brut === attendu) return { verdict: 'juste', attendu, remarque: null };
    }

    // 2. La bonne réponse à la casse ou aux accents près.
    //
    // On juge sur le mot débarrassé de son article : quelqu'un qui écrit
    // « das Haus » a bien mis la majuscule, et lui reprocher celle de « das »
    // serait absurde — c'est pourtant ce que faisait la première version.
    const nu = sansArticle(brut, langue);
    const cleSaisie = Lexique.cle(nu);
    for (const attendu of candidats) {
      if (Lexique.cle(attendu) !== cleSaisie) continue;
      let remarque = null;
      if (langue === 'de' && reglages.estNom
          && nu[0] && nu[0] === nu[0].toLowerCase()
          && attendu[0] === attendu[0].toUpperCase()) {
        remarque = { cle: 'exercice.remarque.majuscule', valeurs: { mot: attendu } };
      } else if (nu.toLowerCase() !== attendu.toLowerCase()) {
        remarque = { cle: 'exercice.remarque.accents', valeurs: { mot: attendu } };
      }
      return { verdict: 'juste', attendu, remarque };
    }

    // 3. Une lettre de travers, sur un mot assez long pour que ce soit une
    //    faute de frappe et non un autre mot.
    for (const attendu of candidats) {
      const cible = Lexique.cle(attendu);
      if (cible.length >= 5 && distance(cleSaisie, cible) <= 1) {
        return { verdict: 'presque', attendu, remarque: null };
      }
    }

    return { verdict: 'faux', attendu: candidats[0], remarque: null };
  }

  /* Le palier exigeant : le mot **et** son article.
   *
   * Le mot d'abord — sans lui il n'y a rien à discuter. Puis l'article, dont
   * les manquements ne se valent pas :
   *
   *   absent            « presque » : le mot est su, et jusqu'ici on ne
   *                     réclamait pas l'article ; l'oubli est une habitude
   *   pas celui qu'on   « presque » : « dem Haus », « ein Haus », « l'abeille »
   *   apprend           sont corrects mais n'enseignent pas le genre, on
   *                     rappelle la forme à retenir
   *   d'un autre genre  faux : c'est la faute que ce palier existe pour
   *                     déloger, l'accepter la laisserait s'installer
   */
  function corrigerAvecArticle(brut, candidats, reglages) {
    const langue = reglages.langue || 'de';
    const genres = reglages.genres || [];
    const table = ARTICLES[langue] || {};

    const saisie = decouper(brut, langue);
    const nus = candidats.map((candidat) => decouper(candidat, langue).mot);
    const mot = comparerMot(saisie.mot, nus, reglages);
    if (mot.verdict === 'faux') {
      return { verdict: 'faux', attendu: candidats[0], remarque: null };
    }

    /* Le mot y est. La forme complète à montrer prend l'article attendu — et
     * s'il y en a deux, « der See » le lac et « die See » la mer, celui qui a
     * été tapé fait foi : on ne corrige pas une réponse juste. */
    const tape = (GENRE_DE_L_ARTICLE[langue] || {})[saisie.article] || null;
    const genre = genres.indexOf(tape) !== -1 ? tape : genres[0];
    const complet = (table[genre] ? table[genre] + ' ' : '') + mot.attendu;

    if (!saisie.article) {
      return { verdict: 'presque', attendu: complet,
               remarque: { cle: 'exercice.remarque.article-manque',
                           valeurs: { mot: complet } } };
    }
    if (!tape) {
      return { verdict: 'presque', attendu: complet,
               remarque: { cle: 'exercice.remarque.article-forme',
                           valeurs: { mot: complet } } };
    }
    if (genres.indexOf(tape) === -1) {
      return { verdict: 'faux', attendu: complet,
               remarque: { cle: 'exercice.remarque.article-faux',
                           valeurs: { mot: complet } } };
    }
    return { verdict: mot.verdict, attendu: complet, remarque: mot.remarque };
  }

  /* Compare une saisie à une liste de réponses acceptables.
   *
   * Renvoie { verdict, attendu, remarque } où verdict vaut
   *   'juste'   — accepté, éventuellement avec une remarque à lire
   *   'presque' — une lettre de travers, on redonne la main
   *   'faux'    — autre chose
   */
  function corriger(saisie, attendus, options) {
    const reglages = options || {};
    const brut = nettoyer(saisie);
    const candidats = attendus.map(nettoyer).filter(Boolean);
    if (!brut || !candidats.length) {
      return { verdict: 'faux', attendu: candidats[0] || attendus[0], remarque: null };
    }
    return reglages.articleExige
      ? corrigerAvecArticle(brut, candidats, reglages)
      : comparerMot(brut, candidats, reglages);
  }

  // ── Fabrication des questions ─────────────────────────────────────────────

  /* Des mots plausibles mais faux, pour les questions à choix.
   *
   * Un bon leurre est de même nature et de même niveau que la réponse : mettre
   * « Kernspintomographie » en face de « Haus » ne fait rien apprendre, la
   * réponse se devine sans connaître le mot. Un leurre dont la traduction
   * recoupe celle de la cible serait au contraire injuste : on l'écarte.
   */
  async function distracteurs(entree, combien) {
    const nature = premiereLecture(entree)[0];
    const interdites = traductions(entree).map((t) => Lexique.cle(t));
    const candidats = [];

    const lot = await Lexique.entreesAuHasard(entree.langue, 260);
    for (const autre of lot) {
      if (autre.mot === entree.mot) continue;
      if (Math.abs(autre.bande - entree.bande) > 1) continue;
      const sienne = (autre.lectures[0] || [])[0];
      // Un nom propre se repère sans connaître le mot : « mont Fuji » en face
      // de « Wasser » ne fait pas travailler, il fait deviner.
      if (sienne === 'pn') continue;
      if (nature && sienne !== nature) continue;
      const siennes = traductions(autre);
      if (!siennes.length) continue;
      if (siennes.some((t) => interdites.indexOf(Lexique.cle(t)) !== -1)) continue;
      candidats.push(autre);
    }

    // Faute de candidats de même nature — cela arrive pour les natures rares —
    // on relâche la contrainte plutôt que de ne rien proposer.
    if (candidats.length < combien) {
      for (const autre of lot) {
        if (autre.mot === entree.mot || candidats.indexOf(autre) !== -1) continue;
        if ((autre.lectures[0] || [])[0] === 'pn') continue;
        if (!traductions(autre).length) continue;
        candidats.push(autre);
        if (candidats.length >= combien * 3) break;
      }
    }
    return melanger(candidats).slice(0, combien);
  }

  /* Quel exercice poser, selon la maturité de la carte. */
  function typeDExercice(carte, entree, phrases, options) {
    const reglages = options || {};
    if (carte.type === 'genre') return 'genre';

    /* L'écriture ne devient exigeante qu'une fois le mot déjà écrit juste :
     * réclamer l'article plus tôt ferait rater deux choses à la fois, sans
     * qu'on sache laquelle des deux manquait. */
    const exigeante = reglages.exigerArticle !== false && !!avecArticle(entree);
    const ecrire = exigeante ? 'saisie-article' : 'saisie';

    const vues = carte.reussites;
    if (vues === 0) return 'qcm-comprendre';
    if (vues === 1) return 'qcm-produire';
    if (vues === 2) return 'saisie';
    if (vues === 3 && exigeante) return 'saisie-article';

    // Ensuite on varie. La phrase à trou n'est proposée que si une phrase
    // existe, l'écoute que si une voix est installée.
    const possibles = [ecrire, ecrire];
    if (phrases && phrases.length) possibles.push('trou', 'paire-phrase');
    if (Voix.possible(carte.langue)) possibles.push('ecoute');
    return auHasard(possibles);
  }

  /* Construit la question. Renvoie un objet décrivant ce qu'il faut afficher ;
   * c'est seance.js qui le met en page. */
  async function preparer(carte, entree, options) {
    const phrases = await Lexique.phrases(entree.phrases);
    const type = typeDExercice(carte, entree, phrases, options);
    const reponses = traductions(entree);

    if (type === 'genre') {
      return {
        type,
        carte, entree,
        enonce: entree.mot,
        attendu: genreDe(entree),
        choix: ['masc', 'fem', 'neut'],
      };
    }

    if (type === 'qcm-comprendre') {
      const leurres = await distracteurs(entree, 3);
      const options = melanger([
        { texte: reponses[0], juste: true },
      ].concat(leurres.map((a) => ({ texte: traductions(a)[0], juste: false }))));
      return { type, carte, entree, enonce: entree.mot, options, attendu: reponses[0] };
    }

    if (type === 'qcm-produire') {
      const leurres = await distracteurs(entree, 3);
      const options = melanger([
        { texte: entree.mot, juste: true },
      ].concat(leurres.map((a) => ({ texte: a.mot, juste: false }))));
      return { type, carte, entree, enonce: reponses.slice(0, 2).join(', '), options,
               attendu: entree.mot };
    }

    if (type === 'saisie-article') {
      /* `avecArticle` a déjà répondu oui dans `typeDExercice` ; on le redemande
       * plutôt que de le supposer, et à défaut la saisie ordinaire reprend la
       * main en fin de fonction — une question ne doit jamais manquer. */
      const forme = avecArticle(entree);
      if (forme) {
        return {
          type, carte, entree,
          enonce: reponses.slice(0, 2).join(', '),
          attendu: forme.formes[0],
          attendus: forme.formes,
          genres: forme.genres,
          articleExige: true,
          estNom: true,
        };
      }
    }

    if (type === 'trou' && phrases.length) {
      const paire = auHasard(phrases);
      const source = carte.langue === 'de' ? paire.de : paire.fr;
      const cible = carte.langue === 'de' ? paire.fr : paire.de;
      const troue = trouer(source, carte.langue, Lexique.cle(entree.mot));
      if (troue) {
        return { type, carte, entree, enonce: troue.texte, indice: cible,
                 attendu: troue.mot, attendus: [troue.mot, entree.mot],
                 estNom: estNom(entree) };
      }
    }

    if (type === 'paire-phrase' && phrases.length) {
      const paire = auHasard(phrases);
      const source = carte.langue === 'de' ? paire.de : paire.fr;
      const bonne = carte.langue === 'de' ? paire.fr : paire.de;
      const autres = melanger(phrases.filter((p) => p !== paire))
        .slice(0, 2)
        .map((p) => (carte.langue === 'de' ? p.fr : p.de));
      if (autres.length >= 1) {
        const options = melanger([{ texte: bonne, juste: true }]
          .concat(autres.map((t) => ({ texte: t, juste: false }))));
        return { type, carte, entree, enonce: source, options, attendu: bonne };
      }
    }

    if (type === 'ecoute') {
      return { type, carte, entree, enonce: null, aEcouter: entree.mot,
               attendu: entree.mot, attendus: [entree.mot],
               estNom: estNom(entree) };
    }

    // Par défaut, et pour tout ce qui précède qui n'a pas abouti : la saisie.
    return {
      type: 'saisie',
      carte, entree,
      enonce: reponses.slice(0, 2).join(', '),
      attendu: entree.mot,
      attendus: [entree.mot],
      estNom: estNom(entree),
    };
  }

  /* Remplace le mot cible par des points de suspension dans une phrase.
   * Renvoie null si le mot n'y figure pas de façon reconnaissable — mieux vaut
   * ne pas poser la question que de la poser mal. */
  function trouer(texte, langue, cleCible) {
    const morceaux = texte.split(/(\p{L}[\p{L}'’-]*)/u);
    for (let i = 0; i < morceaux.length; i += 1) {
      const morceau = morceaux[i];
      if (!morceau || !/\p{L}/u.test(morceau)) continue;
      const k = Lexique.cle(morceau);
      if (k === cleCible || Lexique.lemmes(langue, k).indexOf(cleCible) !== -1) {
        const copie = morceaux.slice();
        copie[i] = '…';
        return { texte: copie.join(''), mot: morceau };
      }
    }
    return null;
  }

  racine.Exercices = {
    ARTICLES,
    corriger, distancePour: distance, nettoyer, decouper,
    traductions, genreDe, genresDe, estNom, avecArticle,
    preparer, typeDExercice, trouer, melanger,
  };

})(window);
