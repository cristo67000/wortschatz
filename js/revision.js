'use strict';
/*
 * Le planificateur : quoi revoir, et quand.
 *
 * ── Pourquoi une répétition espacée ────────────────────────────────────────
 *
 * On oublie vite ce qu'on vient d'apprendre, puis de plus en plus lentement à
 * chaque rappel réussi. Revoir un mot juste avant de l'oublier coûte peu et
 * rapporte beaucoup ; le revoir trop tôt ne rapporte rien, trop tard revient à
 * l'apprendre à neuf. Tout le travail de ce fichier consiste à placer chaque
 * mot au bon moment, et il n'y a pas d'autre moyen connu de faire tenir
 * quelques milliers de mots dans une tête.
 *
 * L'algorithme est un SM-2 simplifié : chaque carte porte un intervalle et une
 * « facilité » ; une réussite multiplie l'intervalle par la facilité, un échec
 * renvoie la carte en apprentissage et rabote sa facilité.
 *
 * ── Trois sortes de cartes ─────────────────────────────────────────────────
 *
 *   vers-de  produire l'allemand :  « maison » → Haus
 *   vers-fr  produire le français : « Haus »   → maison
 *   genre    der / die / das, pour les noms allemands seulement
 *
 * Les cartes portent le nom de **la langue de la réponse**, et non celui du mot.
 * C'est le seul repère qui ne s'inverse pas : pour l'entrée allemande « Haus »,
 * la carte `vers-de` demande de produire « Haus » à partir de « maison », et
 * pour l'entrée française « maison » elle demande exactement la même chose. Le
 * réglage « sens de travail » se lit alors sans détour.
 *
 * En version 1, une seule carte « sens » couvrait les deux directions : l'exercice
 * tiré décidait, un jour dans un sens, un jour dans l'autre, sur une seule
 * échéance. On croyait donc travailler les deux sens et on n'en consolidait
 * aucun — reconnaître « Haus » et savoir le produire s'oublient à des rythmes
 * différents, et une échéance commune suit le plus facile des deux.
 *
 * Le genre a sa carte à lui parce qu'il s'oublie séparément : on peut très bien
 * savoir que « Tisch » est une table et ne plus savoir si c'est der ou die. Les
 * mêler ferait passer pour su un mot qu'on ne saurait qu'à moitié, et le genre
 * est précisément ce qu'un francophone rate le plus longtemps.
 *
 * ── Ce que la carte ne contient pas ────────────────────────────────────────
 *
 * Ni le mot ni sa traduction : seulement de quoi les retrouver (langue, vedette,
 * numéro de tranche). Le dictionnaire peut ainsi être remplacé par une version
 * plus récente sans que les révisions en soient affectées.
 */
(function (racine) {

  const JOUR = 24 * 60 * 60 * 1000;
  const MINUTE = 60 * 1000;

  /* Les paliers d'apprentissage, avant qu'une carte n'entre en révision
   * espacée. Le premier est court exprès : revoir dix minutes plus tard une
   * carte qu'on vient de rater est ce qui la fait tenir jusqu'au lendemain. */
  const PALIERS = [10 * MINUTE, JOUR];

  const FACILITE_INITIALE = 2.5;
  const FACILITE_MIN = 1.3;
  const FACILITE_MAX = 2.8;

  /* Les quatre jugements possibles, du pire au meilleur. */
  const RATE = 0, DIFFICILE = 1, CORRECT = 2, FACILE = 3;

  function maintenant() {
    return Date.now();
  }

  function neuve(langue, mot, tranche, type) {
    return {
      id: Store.identifiant(langue, mot, type),
      langue, mot, tranche, type,
      etat: 'nouveau',
      palier: 0,
      intervalle: 0,
      facilite: FACILITE_INITIALE,
      echeance: maintenant(),
      reussites: 0,
      echecs: 0,
      cree: maintenant(),
      vu: 0,
    };
  }

  /* Le sens de travail : quelles directions on veut réviser.
   *
   * Réglé depuis les Réglages, il ne vaut que pour les cartes **créées
   * ensuite**. Repasser de « les deux » à « vers l'allemand » n'efface pas les
   * cartes françaises déjà acquises : on ne détruit pas des mois de révisions
   * sur un changement de préférence, on cesse simplement d'en fabriquer. */
  let sensDeTravail = 'les-deux';

  function directionsPour(langue) {
    if (sensDeTravail === 'vers-de') return ['vers-de'];
    if (sensDeTravail === 'vers-fr') return ['vers-fr'];
    // « Les deux » : produire le mot, et produire sa traduction.
    return ['vers-' + langue, langue === 'de' ? 'vers-fr' : 'vers-de'];
  }

  /* Quelles cartes créer pour une entrée. Une ou deux pour le sens, selon le
   * sens de travail ; une pour le genre si c'est un nom allemand dont le genre
   * est connu — 2 % ne le sont pas, et interroger sur un genre absent des
   * données serait insensé. */
  function cartesPour(entree) {
    const types = directionsPour(entree.langue);
    if (entree.langue === 'de') {
      const aUnGenre = entree.lectures.some((l) => l[0] === 'n' && l[1]);
      if (aUnGenre) types.push('genre');
    }
    return types.map((type) => neuve(entree.langue, entree.mot, entree.tranche, type));
  }

  /* La carte demande-t-elle de produire la vedette elle-même, ou sa traduction ?
   *
   * C'est la question dont dépend tout le reste : quel exercice poser, quoi
   * afficher, quoi attendre. Elle se répond d'une comparaison, et vaut mieux
   * qu'un champ de plus dans la carte, qui pourrait mentir. */
  function produitLaVedette(carte) {
    return carte.type === 'vers-' + carte.langue;
  }

  async function apprendre(entree) {
    const existantes = await Store.cartesDuMot(entree.langue, entree.mot);
    const deja = new Set(existantes.map((c) => c.type));
    const creees = [];
    for (const carte of cartesPour(entree)) {
      if (deja.has(carte.type)) continue;
      await Store.ecrireCarte(carte);
      creees.push(carte);
    }
    return creees;
  }

  async function oublier(langue, mot) {
    for (const carte of await Store.cartesDuMot(langue, mot)) {
      await Store.supprimerCarte(carte.id);
    }
  }

  async function estAppris(langue, mot) {
    return (await Store.cartesDuMot(langue, mot)).length > 0;
  }

  // ── Le calcul de la prochaine échéance ────────────────────────────────────

  function borner(valeur, bas, haut) {
    return Math.max(bas, Math.min(haut, valeur));
  }

  /* Applique un jugement à une carte et renvoie la carte mise à jour.
   * Fonction pure : elle n'écrit rien, ce qui la rend vérifiable. */
  function juger(carte, qualite, quand) {
    const t = quand || maintenant();
    const suite = Object.assign({}, carte, { vu: t });

    if (qualite === RATE) {
      suite.etat = 'apprentissage';
      suite.palier = 0;
      suite.echecs = carte.echecs + 1;
      suite.facilite = borner(carte.facilite - 0.2, FACILITE_MIN, FACILITE_MAX);
      suite.echeance = t + PALIERS[0];
      /* L'intervalle n'est pas remis à zéro mais divisé : un mot su pendant
       * trois mois puis raté une fois n'est pas revenu au premier jour. */
      suite.intervalle = Math.max(1, Math.round(carte.intervalle * 0.3));
      return suite;
    }

    suite.reussites = carte.reussites + 1;

    if (suite.etat === 'nouveau' || suite.etat === 'apprentissage') {
      /* Une carte neuve n'a franchi aucun palier : sa première réussite la
       * place au palier 0, dix minutes plus tard — et non au palier 1, le
       * lendemain. Compter `palier + 1` pour elle comme pour les autres lui
       * faisait sauter le rappel court, celui qui fait justement tenir un mot
       * neuf jusqu'au jour suivant. */
      const suivant = qualite === FACILE ? PALIERS.length
        : (suite.etat === 'nouveau' ? 0 : carte.palier + 1);
      if (suivant >= PALIERS.length) {
        suite.etat = 'revision';
        suite.intervalle = qualite === FACILE ? 4 : Math.max(1, suite.intervalle || 1);
        suite.echeance = t + suite.intervalle * JOUR;
      } else {
        suite.etat = 'apprentissage';
        suite.palier = suivant;
        suite.echeance = t + PALIERS[suivant];
      }
      return suite;
    }

    // En révision : l'intervalle grandit à la mesure de la facilité.
    const ajustement = qualite === FACILE ? 0.1 : (qualite === DIFFICILE ? -0.15 : 0);
    suite.facilite = borner(carte.facilite + ajustement, FACILITE_MIN, FACILITE_MAX);
    const coefficient = qualite === DIFFICILE ? 1.2 : suite.facilite;
    suite.intervalle = Math.max(1, Math.round(Math.max(carte.intervalle, 1) * coefficient));
    // Au-delà de deux ans, l'espacement n'apporte plus rien de mesurable.
    suite.intervalle = Math.min(suite.intervalle, 730);
    suite.echeance = t + suite.intervalle * JOUR;
    return suite;
  }

  async function noter(carte, qualite, exercice) {
    const suite = juger(carte, qualite);
    await Store.ecrireCarte(suite);
    await Store.noter({
      quand: maintenant(),
      carte: carte.id,
      langue: carte.langue,
      mot: carte.mot,
      type: carte.type,
      exercice: exercice || null,
      qualite,
      etatAvant: carte.etat,
    });
    return suite;
  }

  // ── Composition d'une séance ──────────────────────────────────────────────

  function memeJour(a, b) {
    const x = new Date(a);
    const y = new Date(b);
    return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth()
      && x.getDate() === y.getDate();
  }

  /* Combien de cartes neuves ont déjà été entamées aujourd'hui. On le lit dans
   * le journal plutôt que de tenir un compteur : un compteur se désynchronise,
   * le journal est la trace de ce qui s'est réellement passé. */
  async function nouveautesDuJour() {
    const debut = new Date();
    debut.setHours(0, 0, 0, 0);
    const lignes = await Store.journalDepuis(debut.getTime());
    const vues = new Set();
    for (const ligne of lignes) {
      if (ligne.etatAvant === 'nouveau') vues.add(ligne.carte);
    }
    return vues.size;
  }

  /* La file d'une séance : d'abord ce qui est dû, puis quelques nouveautés.
   *
   * L'ordre n'est pas aléatoire. Deux cartes du même mot — le sens et le genre
   * — ne doivent pas se suivre : la première donnerait la réponse de la
   * seconde. On les écarte donc l'une de l'autre.
   */
  async function file(quota) {
    const t = maintenant();
    const dues = (await Store.cartesDues(t)).filter((c) => c.etat !== 'nouveau');
    const neuves = (await Store.toutesLesCartes()).filter((c) => c.etat === 'nouveau');

    const place = Math.max(0, (quota === undefined ? 10 : quota) - await nouveautesDuJour());
    neuves.sort((a, b) => a.cree - b.cree);

    const lot = dues.concat(neuves.slice(0, place));
    return espacer(melanger(lot));
  }

  function melanger(liste) {
    const copie = liste.slice();
    for (let i = copie.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copie[i], copie[j]] = [copie[j], copie[i]];
    }
    return copie;
  }

  /* Éloigne les cartes qui portent sur le même mot.
   *
   * Un nom allemand en compte désormais trois — produire l'allemand, produire
   * le français, le genre — et les trois se donnent mutuellement la réponse :
   * qui vient de lire « Haus » en face de « maison » n'a plus rien à retrouver
   * quand on lui demande le genre de « Haus ». On regarde donc plus loin en
   * arrière qu'avec deux cartes. */
  function espacer(liste) {
    const sortie = [];
    const attente = [];
    for (const carte of liste) {
      const recents = sortie.slice(-5).map((c) => c.langue + c.mot);
      if (recents.indexOf(carte.langue + carte.mot) !== -1) attente.push(carte);
      else sortie.push(carte);
    }
    return sortie.concat(attente);
  }

  /* Deux unités, et il faut les deux. Ce qu'il reste à faire se compte en
   * cartes — c'est le nombre de questions qui viennent. Ce qu'on suit se compte
   * en mots : un nom allemand en occupe deux, le sens et le genre, et annoncer
   * « 24 mots suivis » à qui en a mis 16 dans sa liste serait faux. */
  async function compter() {
    const t = maintenant();
    const toutes = await Store.toutesLesCartes();
    return {
      total: toutes.length,
      mots: new Set(toutes.map((c) => c.langue + ' ' + c.mot)).size,
      nouvelles: toutes.filter((c) => c.etat === 'nouveau').length,
      apprentissage: toutes.filter((c) => c.etat === 'apprentissage').length,
      revision: toutes.filter((c) => c.etat === 'revision').length,
      dues: toutes.filter((c) => c.etat !== 'nouveau' && c.echeance <= t).length,
    };
  }

  racine.Revision = {
    RATE, DIFFICILE, CORRECT, FACILE,
    JOUR, PALIERS, FACILITE_INITIALE,
    neuve, cartesPour, apprendre, oublier, estAppris, produitLaVedette,
    juger, noter, file, compter, nouveautesDuJour, memeJour,
    get sensDeTravail() { return sensDeTravail; },
    set sensDeTravail(v) { sensDeTravail = v; },
  };

})(window);
