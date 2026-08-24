'use strict';
/*
 * La fiche d'un mot : ce qu'on voit quand on a trouvé ce qu'on cherchait.
 *
 * Trois partis pris.
 *
 * L'article avant le nom. Un francophone qui apprend « Tisch » sans « der »
 * apprend un mot inutilisable : le genre allemand ne se devine pas et se
 * rattrape mal. Il est donc montré gros, coloré, avant le mot — bleu pour der,
 * rouge pour die, vert pour das, le code des tableaux de classe. Pour le
 * français on affiche « un » / « une » plutôt que « le » / « la », qui
 * obligerait à trancher l'élision (« l'arbre ») et masquerait justement le
 * genre qu'on veut enseigner.
 *
 * Les lectures les unes sous les autres. « See » est masculin quand c'est un
 * lac, féminin quand c'est la mer. Les séparer sur deux fiches ferait manquer
 * ce qui compte ; les mettre côte à côte fait de l'homographe une leçon.
 *
 * ── Ce qui change en version 2 ─────────────────────────────────────────────
 *
 * **Chaque signification porte ses propres exemples.** En version 1, les trois
 * phrases d'un mot s'entassaient au bas de la fiche, après tous les sens :
 * « abbauen » veut dire extraire, atténuer et démanteler, et rien ne disait
 * laquelle des trois phrases illustrait laquelle des trois traductions. Le
 * lecteur devait deviner, ou renoncer. Elles sont désormais sous le sens
 * qu'elles servent, dans les deux formes que les données permettent :
 *
 *   citations  du Wiktionnaire, dans la langue du mot, non traduites — mais le
 *              mot vedette y est marqué, et chaque mot est cliquable ;
 *   phrases    de Tatoeba, avec leur traduction en regard.
 *
 * **Tout mot est cliquable** (`motsvifs.js`) : dans les définitions, dans les
 * citations, dans les phrases. Un mot inconnu rencontré en lisant se met dans
 * les révisions sans quitter la fiche. C'est le geste que la version 1 rendait
 * si coûteux que personne ne le faisait.
 */
(function (racine) {

  /* Les articles viennent d'`Exercices`, qui en a besoin pour corriger : deux
   * tables finiraient par différer, et la fiche enseignerait alors un article
   * que l'exercice compterait faux. */
  const ARTICLES = Exercices.ARTICLES;

  function element(balise, classe, texte) {
    const noeud = document.createElement(balise);
    if (classe) noeud.className = classe;
    if (texte !== undefined && texte !== null) noeud.textContent = texte;
    return noeud;
  }

  function nomDeNature(code) {
    if (!code) return '';
    // Le TEI écrit tantôt « adv », tantôt « Adverb » : même chose.
    const normalise = code === 'Adverb' ? 'adv' : code;
    const texte = I18n.t('nature.' + normalise);
    return texte.startsWith('‹') ? normalise : texte;
  }

  /* Le mot avec son article, tel qu'il faut l'apprendre et le prononcer. */
  function formeParlee(entree) {
    const genre = (entree.lectures[0] || [])[1];
    const article = ARTICLES[entree.langue] && ARTICLES[entree.langue][genre];
    const estNom = (entree.lectures[0] || [])[0] === 'n';
    return (estNom && article && entree.langue === 'de')
      ? article + ' ' + entree.mot
      : entree.mot;
  }

  function enteteFiche(entree, surFermeture) {
    const tete = element('div', 'fiche-tete');
    const fermer = element('button', 'fiche-fermer', I18n.t('fiche.fermer'));
    fermer.type = 'button';
    fermer.addEventListener('click', surFermeture);
    tete.appendChild(fermer);
    return tete;
  }

  /* Le bouton qui fait entrer le mot dans les révisions.
   *
   * C'est le geste central de l'application : sans lui, on a un dictionnaire de
   * plus. Il est donc large, en bas de la vedette, et dit son état — un mot déjà
   * suivi affiche qu'il l'est, et permet de le retirer. */
  function boutonApprendre(entree) {
    const bouton = element('button', 'apprendre', I18n.t('fiche.apprendre'));
    bouton.type = 'button';

    function peindre(suivi) {
      bouton.textContent = I18n.t(suivi ? 'fiche.appris' : 'fiche.apprendre');
      bouton.classList.toggle('suivi', suivi);
      bouton.dataset.suivi = suivi ? '1' : '0';
    }

    Revision.estAppris(entree.langue, entree.mot).then(peindre).catch(() => {});

    bouton.addEventListener('click', async () => {
      bouton.disabled = true;
      try {
        if (bouton.dataset.suivi === '1') {
          await Revision.oublier(entree.langue, entree.mot);
          peindre(false);
        } else {
          await Revision.apprendre(entree);
          peindre(true);
        }
        if (racine.Seance) Seance.rafraichir();
      } finally {
        bouton.disabled = false;
      }
    });
    return bouton;
  }

  function vedette(entree) {
    const bloc = element('div', 'vedette');
    const table = ARTICLES[entree.langue] || {};
    /* Tous les articles, pas seulement le premier. « See » est féminin quand
     * c'est la mer et masculin quand c'est le lac ; n'afficher que « die »
     * apprend une moitié fausse, et c'est justement le genre qu'on vient
     * vérifier. */
    for (const genre of Exercices.genresDe(entree)) {
      if (table[genre]) bloc.appendChild(element('span', 'article ' + genre, table[genre]));
    }
    bloc.appendChild(element('span', 'mot', entree.mot));
    bloc.appendChild(element('span', 'pastille', I18n.t('langue.' + entree.langue + '.court')));
    return bloc;
  }

  function ligneSon(entree) {
    const ligne = element('div', 'ligne-son');
    const prononciation = (entree.lectures.find((l) => l[2]) || [])[2];
    if (prononciation) {
      ligne.appendChild(element('span', 'api', '[' + prononciation + ']'));
    }
    const bouton = element('button', 'ecouter', '▸ ' + I18n.t('fiche.ecouter'));
    bouton.type = 'button';
    if (!Voix.possible(entree.langue)) {
      bouton.disabled = true;
      bouton.title = I18n.t('fiche.aucune-voix');
    }
    bouton.addEventListener('click', () => Voix.dire(formeParlee(entree), entree.langue));
    ligne.appendChild(bouton);
    return ligne;
  }

  function etiquettes(entree, lecture) {
    const bloc = element('div', 'etiquettes');
    const nature = nomDeNature(lecture[0]);
    if (nature) bloc.appendChild(element('span', 'etiquette', nature));
    if (lecture[1]) {
      const table = ARTICLES[entree.langue] || {};
      const article = lecture[0] === 'n' && table[lecture[1]];
      if (article) {
        const marque = element('span', 'etiquette article ' + lecture[1], article);
        marque.title = I18n.t('genre.' + lecture[1]);
        bloc.appendChild(marque);
      } else {
        bloc.appendChild(element('span', 'etiquette', I18n.t('genre.' + lecture[1])));
      }
    }
    const bande = element('span', 'etiquette bande-' + entree.bande, I18n.t('bande.' + entree.bande));
    bande.title = I18n.t('bande.explication');
    bloc.appendChild(bande);
    return bloc;
  }

  function formes(entree, lecture) {
    // Le TEI répète volontiers le nominatif singulier, identique à la vedette :
    // « Formes : Haus, Häuser » n'apprend rien de plus que « Häuser ».
    const liste = (lecture[3] || []).filter((f) => f !== entree.mot);
    if (!liste.length) return null;
    const ligne = element('p', 'formes');
    ligne.appendChild(element('b', null, I18n.t('fiche.formes') + ' '));
    ligne.appendChild(document.createTextNode(liste.join(', ')));
    return ligne;
  }

  // ── Flexion ───────────────────────────────────────────────────────────────

  /* Les codes de flexion, regroupés à l'affichage. Un verbe français en porte
   * quatorze : les aligner d'un bloc noierait le reste de la fiche. On les
   * range donc par temps, et le tout se replie.
   *
   * Le regroupement se lit dans le code lui-même — « pres3 » est au présent —
   * plutôt que dans une table par langue : les deux langues n'ont pas les mêmes
   * temps, et une table de plus finirait par diverger de celle du build. */
  function groupeDe(code) {
    if (code.indexOf('pres') === 0) return 'present';
    if (code.indexOf('imp') === 0) return 'imparfait';
    return 'formes';
  }

  function flexion(lecture) {
    const liste = lecture[5] || [];
    if (!liste.length) return null;

    const bloc = element('details', 'flexion');
    bloc.appendChild(element('summary', null, I18n.t('fiche.flexion')));

    const groupes = new Map();
    for (const [code, graphie, article] of liste) {
      const nom = groupeDe(code);
      if (!groupes.has(nom)) groupes.set(nom, []);
      groupes.get(nom).push([code, graphie, article]);
    }

    for (const [nom, entrees] of groupes) {
      if (groupes.size > 1) {
        bloc.appendChild(element('h4', 'flexion-groupe', I18n.t('flexion.groupe.' + nom)));
      }
      const table = element('dl', 'flexion-table');
      for (const [code, graphie, article] of entrees) {
        const etiquette = I18n.t('flexion.' + code);
        table.appendChild(element('dt', null,
          etiquette.startsWith('‹') ? code : etiquette));
        /* L'article accompagne la forme sans être coloré. Les couleurs de
         * l'application disent le genre — bleu masculin, rouge féminin, vert
         * neutre — et « der » au génitif féminin est rouge, pas bleu. Le
         * peindre selon sa graphie enseignerait un genre faux. */
        const valeur = element('dd', null, article ? article + ' ' + graphie : graphie);
        table.appendChild(valeur);
      }
      bloc.appendChild(table);
    }
    return bloc;
  }

  // ── Les sens, et leurs exemples ───────────────────────────────────────────

  /* Une citation du Wiktionnaire : la phrase, le mot marqué, la référence.
   *
   * Elle n'est pas traduite — le Wiktionnaire allemand écrit en allemand. C'est
   * assumé : les mots y sont cliquables, et un exemple qu'on déchiffre mot à
   * mot vaut mieux qu'un sens laissé sans exemple. Les phrases de Tatoeba, qui
   * viennent juste après, apportent la traduction. */
  function citation(texte, marque, reference, langue) {
    const bloc = element('div', 'citation');
    const phrase = element('p', 'citation-texte');
    phrase.appendChild(MotsVifs.tisser(texte, langue, { marque }));
    bloc.appendChild(phrase);
    if (reference) {
      bloc.appendChild(element('p', 'citation-source', reference));
    }
    if (Voix.possible(langue)) {
      const ecouter = element('button', 'ecouter-phrase', '▸');
      ecouter.type = 'button';
      ecouter.setAttribute('aria-label', I18n.t('fiche.ecouter'));
      ecouter.addEventListener('click', () => Voix.dire(texte, langue));
      phrase.appendChild(ecouter);
    }
    return bloc;
  }

  /* Une paire alignée : la phrase dans la langue du mot, sa traduction dessous.
   * Les deux côtés sont cliquables — on apprend aussi en butant sur un mot de
   * la traduction. */
  function paireTraduite(paire, entree, cleVedette) {
    const bloc = element('div', 'exemple');
    const source = element('p', 'exemple-source');
    const autre = entree.langue === 'de' ? 'fr' : 'de';
    source.appendChild(MotsVifs.tisser(
      entree.langue === 'de' ? paire.de : paire.fr, entree.langue,
      { cible: cleVedette }));
    bloc.appendChild(source);

    const cible = element('p', 'exemple-cible');
    cible.appendChild(MotsVifs.tisser(
      entree.langue === 'de' ? paire.fr : paire.de, autre, {}));
    bloc.appendChild(cible);

    if (Voix.possible(entree.langue)) {
      const ecouter = element('button', 'ecouter-phrase', '▸');
      ecouter.type = 'button';
      ecouter.setAttribute('aria-label', I18n.t('fiche.ecouter'));
      ecouter.addEventListener('click', () => Voix.dire(
        entree.langue === 'de' ? paire.de : paire.fr, entree.langue));
      source.appendChild(ecouter);
    }
    return bloc;
  }

  /* Les phrases arrivent après coup : elles vivent dans un vivier partagé qu'il
   * faut aller chercher. Le sens s'affiche sans les attendre — sa traduction et
   * sa définition sont ce qu'on est venu voir. */
  async function remplirPaires(numeros, hote, entree, cleVedette) {
    const paires = await Lexique.phrases(numeros);
    if (!paires.length) { hote.remove(); return; }
    for (const paire of paires) {
      hote.appendChild(paireTraduite(paire, entree, cleVedette));
    }
  }

  function sens(entree, lecture, cleVedette) {
    const bloc = document.createDocumentFragment();
    const plusieurs = lecture[4].length > 1;

    lecture[4].forEach((donnees, rang) => {
      const [definition, traductions] = donnees;
      const citations = donnees[2] || [];
      const numeros = donnees[3] || [];

      const paragraphe = element('div', 'sens');
      const ligne = element('p', 'traductions');
      if (plusieurs) {
        ligne.appendChild(element('span', 'numero-sens', (rang + 1) + '.'));
      }
      for (const traduction of traductions) {
        ligne.appendChild(element('span', null, traduction));
      }
      /* Un sens que le Wiktionnaire connaît et que WikDict ignore n'a pas de
       * traduction. Il vaut d'être montré — il a sa définition et son exemple —
       * mais il faut dire pourquoi la ligne des traductions est vide, sans quoi
       * on croit à une donnée manquante. */
      if (!traductions.length) {
        ligne.appendChild(element('span', 'sans-traduction',
          I18n.t('fiche.sens-sans-traduction')));
      }
      paragraphe.appendChild(ligne);

      if (definition) {
        const texte = element('p', 'definition');
        texte.appendChild(MotsVifs.tisser(definition, entree.langue, {}));
        paragraphe.appendChild(texte);
      }

      for (const [texte, marque, reference] of citations) {
        paragraphe.appendChild(citation(texte, marque, reference, entree.langue));
      }

      if (numeros.length) {
        const hote = element('div', 'exemples-du-sens');
        paragraphe.appendChild(hote);
        remplirPaires(numeros, hote, entree, cleVedette).catch(() => hote.remove());
      }

      bloc.appendChild(paragraphe);
    });
    return bloc;
  }

  function synonymes(lecture) {
    const liste = lecture[6] || [];
    if (!liste.length) return null;
    const ligne = element('p', 'synonymes');
    ligne.appendChild(element('b', null, I18n.t('fiche.synonymes') + ' '));
    ligne.appendChild(document.createTextNode(liste.slice(0, 8).join(', ')));
    return ligne;
  }

  /* Ce qu'aucune signification n'a réclamé. Une phrase dont on ne sait pas
   * quel sens elle illustre reste une phrase utile ; la ranger sous un sens au
   * hasard, non. */
  async function remplirRestantes(entree, section, cleVedette) {
    const paires = await Lexique.phrases(entree.phrases);
    if (!paires.length) { section.remove(); return; }
    section.appendChild(element('h3', null, I18n.t('fiche.exemples')));
    for (const paire of paires) {
      section.appendChild(paireTraduite(paire, entree, cleVedette));
    }
  }

  function construire(entree, surFermeture) {
    const bloc = document.createDocumentFragment();
    const cleVedette = Lexique.cle(entree.mot);

    bloc.appendChild(enteteFiche(entree, surFermeture));
    bloc.appendChild(vedette(entree));
    bloc.appendChild(ligneSon(entree));
    bloc.appendChild(boutonApprendre(entree));

    for (const lecture of entree.lectures) {
      const section = element('section', 'lecture');
      section.appendChild(etiquettes(entree, lecture));
      const listeFormes = formes(entree, lecture);
      if (listeFormes) section.appendChild(listeFormes);
      section.appendChild(sens(entree, lecture, cleVedette));
      const listeSynonymes = synonymes(lecture);
      if (listeSynonymes) section.appendChild(listeSynonymes);
      const tableau = flexion(lecture);
      if (tableau) section.appendChild(tableau);
      bloc.appendChild(section);
    }

    const exemples = element('section', 'exemples');
    bloc.appendChild(exemples);
    remplirRestantes(entree, exemples, cleVedette).catch(() => exemples.remove());

    const autour = voisinage(entree);
    if (autour) bloc.appendChild(autour);

    return bloc;
  }

  /* « Autour de ce mot ».
   *
   * Le titre est délibérément prudent. Ces rapprochements sont calculés — par
   * décomposition des composés et par affixes, filtrés sur le recoupement des
   * traductions — et ils se trompent encore parfois. Annoncer une « famille
   * étymologique » serait une assertion que les données ne portent pas ; parler
   * de voisinage dit ce que c'est : des mots qu'il est utile de voir ensemble.
   */
  function voisinage(entree) {
    const liste = entree.voisins || [];
    if (!liste.length) return null;

    const section = element('section', 'voisinage');
    section.appendChild(element('h3', null, I18n.t('fiche.autour')));
    const mots = element('div', 'voisins');
    for (const voisin of liste) {
      const bouton = element('button', 'voisin', voisin);
      bouton.type = 'button';
      bouton.addEventListener('click', () => {
        const trouve = Lexique.resoudre(voisin, entree.langue);
        if (trouve) App.ouvrirFiche(trouve);
      });
      mots.appendChild(bouton);
    }
    section.appendChild(mots);
    section.appendChild(element('p', 'discret', I18n.t('fiche.autour.note')));
    return section;
  }

  racine.Fiche = { construire, formeParlee, nomDeNature, ARTICLES };

})(window);
