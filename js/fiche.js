'use strict';
/*
 * La fiche d'un mot : ce qu'on voit quand on a trouvé ce qu'on cherchait.
 *
 * Deux partis pris.
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
 */
(function (racine) {

  const ARTICLES = {
    de: { masc: 'der', fem: 'die', neut: 'das' },
    fr: { masc: 'un', fem: 'une' },
  };

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

  /* Les genres distincts sous lesquels le mot se lit, dans l'ordre. */
  function genres(entree) {
    const vus = [];
    for (const lecture of entree.lectures) {
      if (lecture[0] === 'n' && lecture[1] && vus.indexOf(lecture[1]) === -1) {
        vus.push(lecture[1]);
      }
    }
    return vus;
  }

  function vedette(entree) {
    const bloc = element('div', 'vedette');
    const table = ARTICLES[entree.langue] || {};
    /* Tous les articles, pas seulement le premier. « See » est féminin quand
     * c'est la mer et masculin quand c'est le lac ; n'afficher que « die »
     * apprend une moitié fausse, et c'est justement le genre qu'on vient
     * vérifier. */
    for (const genre of genres(entree)) {
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

  function sens(lecture, plusieurs) {
    const bloc = document.createDocumentFragment();
    lecture[4].forEach(([definition, traductions], rang) => {
      const paragraphe = element('div', 'sens');
      const ligne = element('p', 'traductions');
      if (plusieurs) {
        ligne.appendChild(element('span', 'numero-sens', (rang + 1) + '.'));
      }
      for (const traduction of traductions) {
        ligne.appendChild(element('span', null, traduction));
      }
      paragraphe.appendChild(ligne);
      if (definition) {
        paragraphe.appendChild(element('p', 'definition', definition));
      }
      bloc.appendChild(paragraphe);
    });
    return bloc;
  }

  /* Met en évidence, dans une phrase, le mot dont on lit la fiche. Il y apparaît
   * fléchi — « ging » pour « gehen », « Häuser » pour « Haus » — et le
   * reconnaître à l'œil est justement l'exercice : on souligne donc tout ce qui
   * ramène au même lemme, pas la seule graphie de la vedette. */
  function souligner(texte, langue, cleVedette) {
    const fragment = document.createDocumentFragment();
    const morceaux = texte.split(/(\p{L}[\p{L}'’-]*)/u);
    for (const morceau of morceaux) {
      if (!morceau) continue;
      const k = Lexique.cle(morceau);
      const correspond = k && (k === cleVedette
        || Lexique.lemmes(langue, k).indexOf(cleVedette) !== -1);
      fragment.appendChild(correspond
        ? element('b', 'cible', morceau)
        : document.createTextNode(morceau));
    }
    return fragment;
  }

  /* Les phrases arrivent après coup : elles vivent dans un vivier partagé qu'il
   * faut aller chercher. La fiche s'affiche sans les attendre — le mot, son
   * genre et sa traduction sont ce qu'on est venu voir. */
  async function remplirPhrases(entree, section) {
    const paires = await Lexique.phrases(entree.phrases);
    if (!paires.length) { section.remove(); return; }

    section.appendChild(element('h3', null, I18n.t('fiche.exemples')));
    const cleVedette = Lexique.cle(entree.mot);
    for (const paire of paires) {
      const bloc = element('div', 'exemple');
      const source = element('p', 'exemple-source');
      source.appendChild(souligner(
        entree.langue === 'de' ? paire.de : paire.fr, entree.langue, cleVedette));
      bloc.appendChild(source);
      bloc.appendChild(element('p', 'exemple-cible',
        entree.langue === 'de' ? paire.fr : paire.de));

      if (Voix.possible(entree.langue)) {
        const ecouter = element('button', 'ecouter-phrase', '▸');
        ecouter.type = 'button';
        ecouter.setAttribute('aria-label', I18n.t('fiche.ecouter'));
        ecouter.addEventListener('click', () => Voix.dire(
          entree.langue === 'de' ? paire.de : paire.fr, entree.langue));
        source.appendChild(ecouter);
      }
      section.appendChild(bloc);
    }
  }

  function construire(entree, surFermeture) {
    const bloc = document.createDocumentFragment();
    bloc.appendChild(enteteFiche(entree, surFermeture));
    bloc.appendChild(vedette(entree));
    bloc.appendChild(ligneSon(entree));
    bloc.appendChild(boutonApprendre(entree));

    for (const lecture of entree.lectures) {
      const section = element('section', 'lecture');
      section.appendChild(etiquettes(entree, lecture));
      const listeFormes = formes(entree, lecture);
      if (listeFormes) section.appendChild(listeFormes);
      section.appendChild(sens(lecture, lecture[4].length > 1));
      bloc.appendChild(section);
    }

    const exemples = element('section', 'exemples');
    bloc.appendChild(exemples);
    remplirPhrases(entree, exemples).catch(() => exemples.remove());

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
        const trouves = Lexique.chercher(voisin, 12)
          .filter((r) => r.langue === entree.langue && r.mot === voisin);
        if (trouves.length) App.ouvrirFiche(trouves[0]);
      });
      mots.appendChild(bouton);
    }
    section.appendChild(mots);
    section.appendChild(element('p', 'discret', I18n.t('fiche.autour.note')));
    return section;
  }

  racine.Fiche = { construire, formeParlee, nomDeNature, souligner, ARTICLES };

})(window);
