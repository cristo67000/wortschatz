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
 * difficulté croissante, propre à sa direction.
 *
 * Carte « produire la vedette » — on ne voit que « haricot » :
 *
 *   1re fois     choisir       parmi quatre mots étrangers
 *   2e fois      écrire        au clavier, et pour un nom avec son article
 *   ensuite      alterner      écriture, phrase à trou, écoute
 *
 * Carte « produire la traduction » — on ne voit que « die Bohne » :
 *
 *   1re fois     reconnaître   parmi quatre traductions
 *   2e fois      écrire        la traduction au clavier
 *   ensuite      alterner      écriture, appariement de phrases
 *
 * Alterner ensuite n'est pas de la décoration : une carte toujours posée de la
 * même façon finit par être reconnue à sa forme plutôt qu'à son sens.
 *
 * ── L'exercice imposé ──────────────────────────────────────────────────────
 *
 * `preparer(carte, entree, { type })` pose l'exercice demandé au lieu de celui
 * que la maturité de la carte appellerait. C'est tout ce qu'il a fallu pour que
 * les **ateliers** existent : les huit exercices étaient écrits depuis le
 * premier jour, rien ne permettait d'en réclamer un. Un exercice qu'on ne peut
 * pas demander est un exercice qui n'existe pas pour l'utilisateur.
 *
 * Le genre des noms allemands a son exercice à lui, à trois boutons. C'est la
 * faute la plus tenace d'un francophone, et la seule que l'on puisse corriger
 * par la répétition pure : il n'y a rien à comprendre, seulement à retenir.
 *
 * Écrire un nom, c'est l'écrire avec son article — les deux exercices ne se
 * redoublent pas. Devant les trois boutons, le mot est sous les yeux et il ne
 * reste qu'à choisir ; à l'écrit, on ne voit que « haricot » et il faut
 * ressortir « die Bohne » entière, orthographe et genre d'un seul geste. C'est
 * sous cette forme qu'un nom s'emploie, c'est donc celle-là qu'il faut savoir
 * produire.
 *
 * L'exigence ne vaut que pour les noms dont le genre est connu, et se coupe
 * dans les Réglages pour qui la trouve trop rude. Elle a d'abord attendu une
 * réussite de plus — un palier à part, après l'écriture nue. C'était une porte
 * de trop : le mot n'y arrivait qu'au quatrième passage, trois ou quatre jours
 * après son ajout, si bien que l'exercice existait sans que personne le voie.
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

  /* Une forme fléchie précise — le pluriel, le participe, la 3ᵉ personne.
   * Rend `{graphie, article}` ou null. Les tableaux pendent de la lecture ;
   * on prend la première qui porte le code demandé. */
  function formeFlechie(entree, code) {
    for (const lecture of entree.lectures) {
      for (const [c, graphie, article] of (lecture[5] || [])) {
        if (c === code) return { graphie, article: article || '' };
      }
    }
    return null;
  }

  function synonymesDe(entree) {
    const vus = [];
    for (const lecture of entree.lectures) {
      for (const mot of (lecture[6] || [])) {
        if (mot !== entree.mot && vus.indexOf(mot) === -1) vus.push(mot);
      }
    }
    return vus;
  }

  /* Quel exercice poser.
   *
   * Trois choses décident, dans cet ordre :
   *
   *   1. `options.type` — un atelier a demandé cet exercice-là, on le pose.
   *      C'est tout ce qu'il a fallu ajouter pour que les huit exercices déjà
   *      écrits deviennent accessibles : ils existaient, rien ne permettait de
   *      les réclamer.
   *   2. le type de carte — le genre a son exercice à lui.
   *   3. la direction et la maturité — voir plus bas.
   *
   * Les deux directions n'ont pas la même échelle de difficulté, et c'est
   * normal : reconnaître ce que veut dire « Haus » est plus facile que de
   * sortir « das Haus » de mémoire en ne voyant que « maison ». La carte qui
   * produit la vedette passe donc par l'écriture ; celle qui produit la
   * traduction s'en tient à la reconnaissance puis à la saisie de la traduction.
   */
  function typeDExercice(carte, entree, phrases, options) {
    const reglages = options || {};
    if (reglages.type) return reglages.type;
    if (carte.type === 'genre') return 'genre';

    const vues = carte.reussites;

    /* Direction « comprendre » : la réponse est dans l'autre langue. */
    if (!Revision.produitLaVedette(carte)) {
      if (vues === 0) return 'qcm-comprendre';
      if (vues === 1) return 'saisie-traduction';
      const possibles = ['saisie-traduction', 'saisie-traduction'];
      if (phrases && phrases.length) possibles.push('paire-phrase');
      return auHasard(possibles);
    }

    /* Direction « produire » : il faut ressortir la vedette.
     *
     * Un nom s'écrit avec son article, dès la première fois qu'on le demande.
     * L'oubli de l'article ne coûte d'ailleurs qu'un « presque » : rien ne
     * justifiait d'attendre un passage de plus pour poser la vraie question. */
    const exigeante = reglages.exigerArticle !== false && !!avecArticle(entree);
    const ecrire = exigeante ? 'saisie-article' : 'saisie';

    if (vues === 0) return 'qcm-produire';
    if (vues === 1) return ecrire;

    // Ensuite on varie. La phrase à trou n'est proposée que si une phrase
    // existe, l'écoute que si une voix est installée.
    const possibles = [ecrire, ecrire];
    if (phrases && phrases.length) possibles.push('trou');
    if (Voix.possible(carte.langue)) possibles.push('ecoute');
    return auHasard(possibles);
  }

  /* Construit la question. Renvoie un objet décrivant ce qu'il faut afficher ;
   * c'est seance.js qui le met en page. */
  async function preparer(carte, entree, options) {
    const phrases = await Lexique.phrases(entree.phrases);
    const type = typeDExercice(carte, entree, phrases, options);
    const reponses = traductions(entree);
    /* La langue dans laquelle on attend la réponse. Elle ne se déduit pas du
     * nom de l'exercice : « reconnaître le sens » d'une entrée française veut
     * dire répondre en allemand. C'est pourtant ce que la consigne doit
     * annoncer, sans quoi on lit « Que veut dire ce mot ? » devant « maison »
     * en devant répondre « Haus ». */
    const autreLangue = carte.langue === 'de' ? 'fr' : 'de';

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
      return { type, carte, entree, enonce: entree.mot, options,
               attendu: reponses[0], langueReponse: autreLangue };
    }

    if (type === 'qcm-produire') {
      const leurres = await distracteurs(entree, 3);
      const options = melanger([
        { texte: entree.mot, juste: true },
      ].concat(leurres.map((a) => ({ texte: a.mot, juste: false }))));
      return { type, carte, entree, enonce: reponses.slice(0, 2).join(', '), options,
               attendu: entree.mot, langueReponse: carte.langue };
    }

    /* Écrire la traduction. C'est l'autre moitié du « dans les deux sens » :
     * la réponse attendue n'est plus la vedette mais l'un de ses équivalents,
     * dans l'autre langue. `langueReponse` le dit à la séance, qui s'en sert
     * pour le clavier d'accents et pour la correction — corriger « maison »
     * avec les règles de l'allemand reprocherait une majuscule absente. */
    if (type === 'saisie-traduction') {
      const autre = carte.langue === 'de' ? 'fr' : 'de';
      const forme = avecArticle(entree);
      return {
        type, carte, entree,
        enonce: forme && carte.langue === 'de' ? forme.formes[0] : entree.mot,
        attendu: reponses[0],
        attendus: reponses,
        estNom: estNom(entree),
        langueReponse: autre,
      };
    }

    /* Le pluriel d'un nom allemand — « der Tisch » → « die Tische ».
     *
     * C'est, avec le genre, ce qui ne se devine pas et qu'il faut avoir appris.
     * L'article accompagne les deux formes : au pluriel il devient « die » quel
     * que soit le genre, et c'est une leçon en soi. */
    if (type === 'pluriel') {
      const singulier = formeFlechie(entree, 'sg');
      const pluriel = formeFlechie(entree, 'pl');
      if (pluriel && pluriel.graphie !== entree.mot) {
        const vu = singulier && singulier.article
          ? singulier.article + ' ' + (singulier.graphie || entree.mot)
          : entree.mot;
        const complet = pluriel.article
          ? pluriel.article + ' ' + pluriel.graphie : pluriel.graphie;
        return {
          type, carte, entree,
          enonce: vu,
          attendu: complet,
          attendus: [complet, pluriel.graphie],
          estNom: true,
          langueReponse: carte.langue,
        };
      }
    }

    /* Une forme conjuguée précise, tirée au sort parmi celles qu'on connaît. */
    if (type === 'conjugaison') {
      const codes = ['pret', 'part', 'pres3', 'pres1', 'pres2', 'inf']
        .filter((code) => formeFlechie(entree, code));
      if (codes.length) {
        const code = auHasard(codes);
        const cible = formeFlechie(entree, code);
        return {
          type, carte, entree,
          enonce: entree.mot,
          indice: I18n.t('flexion.' + code),
          attendu: cible.graphie,
          attendus: [cible.graphie],
          estNom: false,
          langueReponse: carte.langue,
        };
      }
    }

    /* Reconnaître un synonyme parmi quatre. Les leurres viennent du même tirage
     * que les autres questions à choix : même nature, même bande, et aucune
     * traduction commune avec la cible — un leurre synonyme serait injuste. */
    if (type === 'synonyme') {
      const proches = synonymesDe(entree);
      if (proches.length) {
        const leurres = await distracteurs(entree, 3);
        const bonne = auHasard(proches);
        const choix = melanger([{ texte: bonne, juste: true }]
          .concat(leurres.map((a) => ({ texte: a.mot, juste: false }))));
        return { type, carte, entree, enonce: entree.mot, options: choix,
                 attendu: bonne, langueReponse: carte.langue };
      }
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
          langueReponse: carte.langue,
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
                 estNom: estNom(entree), langueReponse: carte.langue };
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
        return { type, carte, entree, enonce: source, options, attendu: bonne,
                 langueReponse: autreLangue };
      }
    }

    if (type === 'ecoute') {
      return { type, carte, entree, enonce: null, aEcouter: entree.mot,
               attendu: entree.mot, attendus: [entree.mot],
               estNom: estNom(entree), langueReponse: carte.langue };
    }

    // Par défaut, et pour tout ce qui précède qui n'a pas abouti : la saisie.
    return {
      type: 'saisie',
      carte, entree,
      enonce: reponses.slice(0, 2).join(', '),
      attendu: entree.mot,
      attendus: [entree.mot],
      estNom: estNom(entree),
      langueReponse: carte.langue,
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
    formeFlechie, synonymesDe,
    preparer, typeDExercice, trouer, melanger,
  };

})(window);
