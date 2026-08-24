'use strict';
/*
 * Les ateliers : choisir son exercice.
 *
 * ── Pourquoi ────────────────────────────────────────────────────────────────
 *
 * L'application savait faire huit exercices depuis le premier jour — le genre à
 * trois boutons, l'écriture avec article, la phrase à trou, l'écoute — mais
 * c'est la maturité de la carte qui décidait lequel poser. Un exercice que
 * personne ne peut réclamer n'existe pas pour l'utilisateur : celui qui voulait
 * une demi-heure de der/die/das ne pouvait que réviser sa séance du jour et
 * espérer que le hasard la lui donne.
 *
 * Un atelier, c'est donc trois choix — quel exercice, sur quels mots, combien
 * de questions — puis la séance ordinaire, moteur compris.
 *
 * ── Ce qu'un atelier ne fait pas ────────────────────────────────────────────
 *
 * Il ne touche **jamais** à l'échéancier. Ni intervalle, ni facilité, ni date
 * de révision. C'est délibéré : la répétition espacée vaut par la mesure du
 * temps entre deux rappels, et vingt réponses d'affilée sur le même mot lui
 * feraient croire à une maîtrise qui n'est qu'un bachotage. On peut donc
 * s'entraîner autant qu'on veut sans dérégler ce qui fait tenir le vocabulaire.
 *
 * ── Ce qu'on ne cache pas ───────────────────────────────────────────────────
 *
 * Un atelier impossible reste affiché, grisé, avec sa raison : « le genre ne
 * concerne que l'allemand », « aucune voix installée ». Une vignette qui
 * disparaît laisse croire à un bogue ; une vignette qui explique enseigne.
 */
(function (racine) {

  const $ = (selecteur) => document.querySelector(selecteur);

  /* Les ateliers, dans l'ordre où on les propose.
   *
   *   type      l'exercice, tel que `Exercices.preparer` le connaît
   *   carte     le type de carte à fabriquer, qui porte la direction
   *   possible  ce qu'il faut pour que l'atelier ait un sens
   *
   * `carte` mérite un mot. La carte ne sert ici qu'à dire à l'exercice ce qu'il
   * doit demander : « vers-de » veut dire « la réponse est en allemand ». En
   * atelier, elle n'est jamais écrite en base — c'est une carte de papier.
   */
  const ATELIERS = [
    { nom: 'genre', type: 'genre', carte: 'genre',
      possible: (etat) => etat.langue === 'de' || 'atelier.raison.allemand' },
    { nom: 'reconnaitre', type: 'qcm-comprendre', carte: 'inverse' },
    { nom: 'produire', type: 'qcm-produire', carte: 'vedette' },
    { nom: 'ecrire', type: 'saisie', carte: 'vedette' },
    { nom: 'article', type: 'saisie-article', carte: 'vedette',
      possible: (etat) => etat.langue === 'de' || 'atelier.raison.allemand' },
    { nom: 'traduire', type: 'saisie-traduction', carte: 'inverse' },
    { nom: 'trou', type: 'trou', carte: 'vedette' },
    { nom: 'phrase', type: 'paire-phrase', carte: 'inverse' },
    { nom: 'ecoute', type: 'ecoute', carte: 'vedette',
      possible: (etat) => Voix.possible(etat.langue) || 'atelier.raison.voix' },
    { nom: 'pluriel', type: 'pluriel', carte: 'vedette',
      possible: (etat) => etat.langue === 'de' || 'atelier.raison.allemand' },
    { nom: 'conjugaison', type: 'conjugaison', carte: 'vedette' },
    { nom: 'synonyme', type: 'synonyme', carte: 'vedette' },
  ];

  /* Où prendre les mots. « Mes mots » d'abord : c'est ce qu'on veut travailler
   * neuf fois sur dix, et c'est le seul choix qui ne demande rien à personne. */
  const SOURCES = ['suivis', 'recents', 'hasard'];
  const LONGUEURS = [10, 20, 40];

  const etat = { langue: 'de', source: 'suivis', longueur: 10 };
  let hote = null;

  function element(balise, classe, texte) {
    const noeud = document.createElement(balise);
    if (classe) noeud.className = classe;
    if (texte !== undefined && texte !== null) noeud.textContent = texte;
    return noeud;
  }

  function melanger(liste) {
    const copie = liste.slice();
    for (let i = copie.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copie[i], copie[j]] = [copie[j], copie[i]];
    }
    return copie;
  }

  // ── Fabriquer la file ─────────────────────────────────────────────────────

  /* Le type de carte à donner à l'exercice.
   *
   *   vedette   la réponse est le mot lui-même     → « vers-<langue du mot> »
   *   inverse   la réponse est sa traduction       → l'autre
   *   genre     der / die / das
   */
  function typeDeCarte(atelier, langue) {
    if (atelier.carte === 'genre') return 'genre';
    if (atelier.carte === 'vedette') return 'vers-' + langue;
    return 'vers-' + (langue === 'de' ? 'fr' : 'de');
  }

  /* Une carte de papier : juste de quoi retrouver le mot et dire quoi demander.
   * `reussites` est mis haut pour que rien, dans les exercices, ne dépende de
   * la maturité — l'atelier impose son type de toute façon. */
  function carteDePapier(mot, atelier) {
    return {
      langue: mot.langue, mot: mot.mot, tranche: mot.tranche,
      type: typeDeCarte(atelier, mot.langue),
      reussites: 9, echecs: 0, etat: 'revision', intervalle: 1,
      facilite: Revision.FACILITE_INITIALE, palier: 0, echeance: 0, vu: 0,
    };
  }

  async function motsSuivis(langue) {
    const cartes = await Store.toutesLesCartes();
    const vus = new Map();
    for (const carte of cartes) {
      if (carte.langue !== langue) continue;
      const cle = carte.langue + ' ' + carte.mot;
      if (!vus.has(cle)) {
        vus.set(cle, { langue: carte.langue, mot: carte.mot, tranche: carte.tranche });
      }
    }
    return [...vus.values()];
  }

  async function motsRecents(langue) {
    const lus = await Store.historique().catch(() => []);
    const sortie = [];
    for (const lu of lus) {
      if (lu.langue !== langue) continue;
      const trouve = Lexique.resoudre(lu.mot, langue);
      if (trouve) sortie.push({ langue, mot: trouve.mot, tranche: trouve.tranche });
    }
    return sortie;
  }

  /* Au hasard dans le dictionnaire, en commençant par le vocabulaire courant :
   * s'entraîner sur des mots rares n'apprend rien d'utile, et le tirage brut en
   * donnerait surtout — ils sont les plus nombreux. */
  async function motsAuHasard(langue, combien) {
    const lot = await Lexique.entreesAuHasard(langue, combien * 12);
    const courants = lot.filter((e) => e.bande <= 2);
    return melanger(courants.length >= combien ? courants : lot)
      .map((e) => ({ langue, mot: e.mot, tranche: e.tranche }));
  }

  async function motsDe(source, langue, combien) {
    if (source === 'suivis') return motsSuivis(langue);
    if (source === 'recents') return motsRecents(langue);
    return motsAuHasard(langue, combien);
  }

  /* Tous les mots ne conviennent pas à tous les exercices : on ne demande pas
   * le pluriel d'un verbe ni le genre d'un adverbe. Plutôt que de deviner sur
   * l'index, qui ne porte ni nature ni flexion, on ouvre les entrées et on
   * garde celles qui répondent — c'est quelques tranches de lues, et cela évite
   * de poser une question sans réponse.
   */
  function convient(atelier, entree) {
    if (atelier.type === 'genre') {
      return entree.langue === 'de' && !!Exercices.genreDe(entree);
    }
    if (atelier.type === 'saisie-article') return !!Exercices.avecArticle(entree);
    if (atelier.type === 'pluriel') {
      const pluriel = Exercices.formeFlechie(entree, 'pl');
      return !!pluriel && pluriel.graphie !== entree.mot;
    }
    if (atelier.type === 'conjugaison') {
      return ['pret', 'part', 'pres3', 'pres1', 'inf']
        .some((code) => Exercices.formeFlechie(entree, code));
    }
    if (atelier.type === 'synonyme') return Exercices.synonymesDe(entree).length > 0;
    if (atelier.type === 'trou' || atelier.type === 'paire-phrase') {
      return phrasesDe(entree).length > 0;
    }
    return Exercices.traductions(entree).length > 0;
  }

  function phrasesDe(entree) {
    const numeros = (entree.phrases || []).slice();
    for (const lecture of entree.lectures) {
      for (const bloc of lecture[4]) {
        for (const numero of (bloc[3] || [])) numeros.push(numero);
      }
    }
    return numeros;
  }

  async function filePour(atelier) {
    const candidats = melanger(await motsDe(etat.source, etat.langue, etat.longueur));
    const file = [];
    /* On s'arrête dès qu'on a de quoi, mais on ne balaie pas tout le
     * dictionnaire pour autant : au-delà de quelques centaines d'entrées
     * ouvertes, c'est que l'atelier ne convient pas à cette sélection. */
    const plafond = Math.min(candidats.length, etat.longueur * 20 + 40);
    for (let i = 0; i < plafond && file.length < etat.longueur; i += 1) {
      const entree = await Lexique.ouvrir(candidats[i]).catch(() => null);
      if (entree && convient(atelier, entree)) {
        file.push(carteDePapier(candidats[i], atelier));
      }
    }
    return file;
  }

  // ── L'écran ───────────────────────────────────────────────────────────────

  function raisonDe(atelier) {
    if (!atelier.possible) return null;
    const verdict = atelier.possible(etat);
    return verdict === true ? null : verdict;
  }

  function segments(nom, valeurs, courant, cle, surChoix) {
    const bloc = element('div', 'atelier-choix');
    bloc.appendChild(element('span', 'atelier-choix-titre', I18n.t(nom)));
    const groupe = element('div', 'segments');
    groupe.setAttribute('role', 'group');
    for (const valeur of valeurs) {
      const bouton = element('button', null, I18n.t(cle + valeur));
      bouton.type = 'button';
      bouton.setAttribute('aria-pressed', String(valeur === courant));
      bouton.addEventListener('click', () => surChoix(valeur));
      groupe.appendChild(bouton);
    }
    bloc.appendChild(groupe);
    return bloc;
  }

  async function demarrer(atelier) {
    const file = await filePour(atelier);
    if (!file.length) {
      const avis = $('#atelier-avis');
      avis.textContent = I18n.t('atelier.vide');
      avis.hidden = false;
      return;
    }
    $('#atelier-avis').hidden = true;
    await Seance.lancer(file, {
      enregistrer: false,
      type: atelier.type,
      reprendre: () => demarrer(atelier),
    });
  }

  function dessiner() {
    if (!hote) return;
    hote.textContent = '';

    hote.appendChild(segments('atelier.langue', ['de', 'fr'], etat.langue,
      'langue.', (valeur) => { etat.langue = valeur; dessiner(); }));
    hote.appendChild(segments('atelier.source', SOURCES, etat.source,
      'atelier.source.', (valeur) => { etat.source = valeur; dessiner(); }));
    hote.appendChild(segments('atelier.longueur', LONGUEURS, etat.longueur,
      'atelier.longueur.', (valeur) => { etat.longueur = valeur; dessiner(); }));

    const grille = element('div', 'ateliers');
    for (const atelier of ATELIERS) {
      const raison = raisonDe(atelier);
      const vignette = element('button', 'atelier' + (raison ? ' impossible' : ''));
      vignette.type = 'button';
      vignette.appendChild(element('span', 'atelier-nom', I18n.t('atelier.' + atelier.nom)));
      vignette.appendChild(element('span', 'atelier-detail',
        I18n.t(raison || ('atelier.' + atelier.nom + '.detail'))));
      if (raison) {
        vignette.disabled = true;
      } else {
        vignette.addEventListener('click', () => demarrer(atelier));
      }
      grille.appendChild(vignette);
    }
    hote.appendChild(grille);
  }

  function brancher() {
    hote = $('#ateliers');
    dessiner();
  }

  racine.Atelier = { brancher, dessiner, ATELIERS };

})(window);
