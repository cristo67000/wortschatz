'use strict';
/*
 * Le déroulé d'une séance de révision.
 *
 * Une séance est une file de cartes ; pour chacune, `Exercices.preparer()` dit
 * quoi demander, ce fichier le met à l'écran, recueille la réponse, la corrige
 * et transmet le jugement au planificateur.
 *
 * ── Qui juge ───────────────────────────────────────────────────────────────
 *
 * L'application, pas l'apprenant. Les exercices ont une réponse vérifiable :
 * demander « avez-vous trouvé ? » après coup invite à l'indulgence, et une
 * indulgence répétée ruine l'espacement — on croit savoir mille mots et on en
 * sait trois cents. Une seule chose reste à la main de l'apprenant : dire qu'un
 * mot lui était **facile**, ce que l'application ne peut pas deviner et qui
 * mérite d'espacer davantage.
 *
 * ── Ce qui se passe après une erreur ───────────────────────────────────────
 *
 * La bonne réponse est montrée, avec sa fiche en abrégé — genre, prononciation,
 * une phrase d'exemple. Se tromper est le meilleur moment pour apprendre, à
 * condition que la correction arrive tout de suite et donne à voir autre chose
 * que le simple mot juste.
 */
(function (racine) {

  const CLAVIERS = {
    de: ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'],
    fr: ['é', 'è', 'ê', 'à', 'ç', 'ù', 'â', 'î', 'ô', 'û', 'ë', 'ï'],
  };

  const $ = (selecteur) => document.querySelector(selecteur);
  const elements = {};

  let file = [];
  let position = 0;
  let question = null;
  let bilan = null;
  let quota = 10;
  let exigerArticle = true;

  function element(balise, classe, texte) {
    const noeud = document.createElement(balise);
    if (classe) noeud.className = classe;
    if (texte !== undefined && texte !== null) noeud.textContent = texte;
    return noeud;
  }

  function vider(noeud) {
    noeud.textContent = '';
    return noeud;
  }

  // ── Accueil de l'onglet ───────────────────────────────────────────────────

  async function rafraichir() {
    const comptes = await Revision.compter();
    const faites = await Revision.nouveautesDuJour();
    const reste = Math.max(0, quota - faites);
    const aFaire = comptes.dues + Math.min(reste, comptes.nouvelles);

    vider(elements.compteurs);
    for (const [cle, valeur] of [
      ['reviser.compteur.dues', comptes.dues],
      ['reviser.compteur.nouvelles', Math.min(reste, comptes.nouvelles)],
      ['reviser.compteur.total', comptes.total],
    ]) {
      const bloc = element('div', 'compteur');
      bloc.appendChild(element('span', 'chiffre', String(valeur)));
      bloc.appendChild(element('span', 'etiquette-compteur', I18n.t(cle)));
      elements.compteurs.appendChild(bloc);
    }

    elements.vide.hidden = comptes.total > 0;
    elements.avance.hidden = !(comptes.total > 0 && aFaire === 0);
    elements.commencer.hidden = aFaire === 0;
    elements.compteurs.hidden = comptes.total === 0;
  }

  // ── Cycle de vie d'une séance ─────────────────────────────────────────────

  async function commencer() {
    file = await Revision.file(quota);
    position = 0;
    bilan = { justes: 0, presque: 0, faux: 0, total: file.length, mots: new Set() };
    if (!file.length) { await rafraichir(); return; }
    elements.accueil.hidden = true;
    elements.bilan.hidden = true;
    elements.seance.hidden = false;
    await poser();
  }

  function arreter() {
    elements.seance.hidden = true;
    elements.bilan.hidden = true;
    elements.accueil.hidden = false;
    Voix.taire();
    rafraichir();
  }

  async function poser() {
    if (position >= file.length) { return terminer(); }
    const carte = file[position];
    elements.jauge.style.width = Math.round(100 * position / file.length) + '%';

    const entree = await Lexique.ouvrir({
      langue: carte.langue, mot: carte.mot, tranche: carte.tranche,
    });
    if (!entree) {
      /* Le mot a disparu du dictionnaire — une version des données plus
       * récente peut l'avoir retiré. On passe, sans rien casser. */
      position += 1;
      return poser();
    }

    question = await Exercices.preparer(carte, entree, { exigerArticle });
    elements.verdict.hidden = true;
    afficher(question);
  }

  // ── Affichage d'une question ──────────────────────────────────────────────

  function consignePour(type, langue) {
    const autre = langue === 'de' ? 'fr' : 'de';
    return I18n.t('exercice.consigne.' + type, {
      langue: I18n.t('langue.' + langue),
      autre: I18n.t('langue.' + autre),
    });
  }

  function afficher(q) {
    elements.consigne.textContent = consignePour(q.type, q.carte.langue);
    const enonce = vider(elements.enonce);
    const zone = vider(elements.zone);

    if (q.type === 'ecoute') {
      const bouton = element('button', 'bouton-ecoute', '▸');
      bouton.type = 'button';
      bouton.setAttribute('aria-label', I18n.t('fiche.ecouter'));
      bouton.addEventListener('click', () => Voix.dire(q.aEcouter, q.carte.langue));
      enonce.appendChild(bouton);
      Voix.dire(q.aEcouter, q.carte.langue);
    } else if (q.type === 'trou' || q.type === 'paire-phrase') {
      enonce.appendChild(element('p', 'enonce-phrase', q.enonce));
      if (q.indice) enonce.appendChild(element('p', 'enonce-indice', q.indice));
    } else {
      enonce.appendChild(element('p', 'enonce-mot', q.enonce));
    }

    if (q.type === 'genre') {
      for (const genre of q.choix) {
        const bouton = element('button', 'choix-genre article ' + genre,
          Fiche.ARTICLES.de[genre]);
        bouton.type = 'button';
        bouton.addEventListener('click', () => repondre(genre));
        zone.appendChild(bouton);
      }
      return;
    }

    if (q.options) {
      for (const option of q.options) {
        const bouton = element('button', 'choix', option.texte);
        bouton.type = 'button';
        bouton.addEventListener('click', () => repondre(option.texte));
        zone.appendChild(bouton);
      }
      return;
    }

    // Exercices de saisie.
    const champ = element('input', 'saisie');
    champ.type = 'text';
    champ.autocomplete = 'off';
    champ.autocapitalize = 'off';
    champ.spellcheck = false;
    champ.setAttribute('aria-label', I18n.t('exercice.saisie.aria'));
    /* Au palier exigeant, le champ rappelle la forme attendue. Les articles
     * d'une langue sont les mêmes pour tous ses noms : les montrer ne souffle
     * rien du mot, mais dit ce qu'on réclame. */
    if (q.articleExige) {
      const table = Exercices.ARTICLES[q.carte.langue] || {};
      champ.placeholder = Object.values(table).join(' / ') + ' …';
    }
    zone.appendChild(champ);

    const touches = element('div', 'touches');
    for (const signe of CLAVIERS[q.carte.langue] || []) {
      const touche = element('button', 'touche', signe);
      touche.type = 'button';
      touche.tabIndex = -1;
      touche.addEventListener('click', () => {
        const debut = champ.selectionStart;
        champ.value = champ.value.slice(0, debut) + signe + champ.value.slice(champ.selectionEnd);
        champ.focus();
        champ.selectionStart = champ.selectionEnd = debut + signe.length;
      });
      touches.appendChild(touche);
    }
    zone.appendChild(touches);

    const ligne = element('div', 'ligne-boutons');
    const valider = element('button', 'bouton-principal', I18n.t('exercice.valider'));
    valider.type = 'button';
    valider.addEventListener('click', () => repondre(champ.value));
    const passer = element('button', 'bouton-discret', I18n.t('exercice.je-ne-sais-pas'));
    passer.type = 'button';
    passer.addEventListener('click', () => repondre(''));
    ligne.appendChild(valider);
    ligne.appendChild(passer);
    zone.appendChild(ligne);

    champ.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); repondre(champ.value); }
    });
    champ.focus();
  }

  // ── Correction ────────────────────────────────────────────────────────────

  async function repondre(saisie) {
    const q = question;
    if (!q) return;

    let verdict;
    if (q.type === 'genre') {
      verdict = { verdict: saisie === q.attendu ? 'juste' : 'faux',
                  attendu: q.attendu, remarque: null };
    } else if (q.options) {
      verdict = { verdict: saisie === q.attendu ? 'juste' : 'faux',
                  attendu: q.attendu, remarque: null };
    } else {
      verdict = Exercices.corriger(saisie, q.attendus || [q.attendu], {
        langue: q.carte.langue, estNom: q.estNom,
        articleExige: q.articleExige, genres: q.genres,
      });
    }

    const qualite = verdict.verdict === 'juste' ? Revision.CORRECT
      : (verdict.verdict === 'presque' ? Revision.DIFFICILE : Revision.RATE);

    bilan[verdict.verdict === 'juste' ? 'justes'
      : (verdict.verdict === 'presque' ? 'presque' : 'faux')] += 1;
    bilan.mots.add(q.carte.langue + ' ' + q.carte.mot);

    await Revision.noter(q.carte, qualite, q.type);
    montrerVerdict(q, verdict, qualite);
  }

  function montrerVerdict(q, verdict, qualite) {
    vider(elements.zone);
    elements.verdict.hidden = false;
    elements.verdict.className = 'verdict ' + verdict.verdict;

    const attendu = q.type === 'genre'
      ? Fiche.ARTICLES.de[q.attendu] + ' ' + q.entree.mot
      : verdict.attendu;

    elements.verdictTexte.textContent = verdict.verdict === 'juste'
      ? I18n.t('exercice.juste')
      : I18n.t(verdict.verdict === 'presque' ? 'exercice.presque' : 'exercice.faux',
               { reponse: attendu });

    elements.verdictRemarque.textContent = verdict.remarque
      ? I18n.t(verdict.remarque.cle, verdict.remarque.valeurs) : '';
    elements.verdictRemarque.hidden = !verdict.remarque;

    remplirRappel(q);

    const boutons = vider(elements.verdictBoutons);
    const suivant = element('button', 'bouton-principal', I18n.t('exercice.suivant'));
    suivant.type = 'button';
    suivant.addEventListener('click', () => avancer());
    boutons.appendChild(suivant);

    if (qualite === Revision.CORRECT) {
      const facile = element('button', 'bouton-discret', I18n.t('exercice.facile'));
      facile.type = 'button';
      facile.addEventListener('click', async () => {
        await Revision.noter(q.carte, Revision.FACILE, q.type);
        avancer();
      });
      boutons.appendChild(facile);
    }
    suivant.focus();
  }

  /* Un rappel court de la fiche : de quoi ancrer le mot au moment où l'on vient
   * de buter dessus. */
  function remplirRappel(q) {
    const bloc = vider(elements.verdictFiche);
    const entree = q.entree;
    const lecture = entree.lectures[0] || [];

    const ligne = element('p', 'rappel-mot');
    if (lecture[0] === 'n' && Fiche.ARTICLES[entree.langue]
        && Fiche.ARTICLES[entree.langue][lecture[1]]) {
      ligne.appendChild(element('span', 'article ' + lecture[1],
        Fiche.ARTICLES[entree.langue][lecture[1]]));
      ligne.appendChild(document.createTextNode(' '));
    }
    ligne.appendChild(element('b', null, entree.mot));
    if (lecture[2]) ligne.appendChild(element('span', 'api', ' [' + lecture[2] + ']'));
    bloc.appendChild(ligne);

    bloc.appendChild(element('p', 'rappel-sens',
      Exercices.traductions(entree).slice(0, 4).join(' · ')));

    const ouvrir = element('button', 'lien-discret', I18n.t('exercice.voir-fiche'));
    ouvrir.type = 'button';
    ouvrir.addEventListener('click', () => App.ouvrirFiche({
      langue: entree.langue, mot: entree.mot, tranche: q.carte.tranche,
    }));
    bloc.appendChild(ouvrir);
  }

  function avancer() {
    position += 1;
    poser();
  }

  // ── Fin de séance ─────────────────────────────────────────────────────────

  async function terminer() {
    elements.seance.hidden = true;
    elements.bilan.hidden = false;
    elements.jauge.style.width = '100%';

    vider(elements.bilanChiffres);
    for (const [cle, valeur, classe] of [
      ['reviser.bilan.justes', bilan.justes, 'bien'],
      ['reviser.bilan.presque', bilan.presque, 'moyen'],
      ['reviser.bilan.faux', bilan.faux, 'mal'],
    ]) {
      const bloc = element('div', 'compteur ' + classe);
      bloc.appendChild(element('span', 'chiffre', String(valeur)));
      bloc.appendChild(element('span', 'etiquette-compteur', I18n.t(cle)));
      elements.bilanChiffres.appendChild(bloc);
    }
    elements.bilanMot.textContent = I18n.n('reviser.bilan.mots', bilan.mots.size);

    const comptes = await Revision.compter();
    const faites = await Revision.nouveautesDuJour();
    const reste = comptes.dues + Math.max(0, Math.min(quota - faites, comptes.nouvelles));
    elements.continuer.hidden = reste === 0;
  }

  // ── Mise en place ─────────────────────────────────────────────────────────

  function brancher(reglages) {
    quota = reglages.nouveautesParJour || 10;
    exigerArticle = reglages.exigerArticle !== false;
    Object.assign(elements, {
      accueil: $('#revision-accueil'),
      compteurs: $('#revision-compteurs'),
      commencer: $('#b-commencer'),
      vide: $('#revision-vide'),
      avance: $('#revision-avance'),
      seance: $('#seance'),
      jauge: $('#seance-jauge'),
      consigne: $('#seance-consigne'),
      enonce: $('#seance-enonce'),
      zone: $('#seance-zone'),
      verdict: $('#seance-verdict'),
      verdictTexte: $('#verdict-texte'),
      verdictRemarque: $('#verdict-remarque'),
      verdictFiche: $('#verdict-fiche'),
      verdictBoutons: $('#verdict-boutons'),
      bilan: $('#seance-bilan'),
      bilanChiffres: $('#bilan-chiffres'),
      bilanMot: $('#bilan-mot'),
      continuer: $('#b-continuer'),
      terminerBouton: $('#b-terminer'),
      arreter: $('#b-arreter'),
      versRecherche: $('#b-vers-recherche'),
    });

    elements.commencer.addEventListener('click', commencer);
    elements.arreter.addEventListener('click', arreter);
    elements.continuer.addEventListener('click', commencer);
    elements.terminerBouton.addEventListener('click', arreter);
    elements.versRecherche.addEventListener('click', () => App.basculer('chercher'));
  }

  racine.Seance = { brancher, rafraichir, commencer, arreter,
                    get quota() { return quota; },
                    set quota(v) { quota = v; },
                    get exigerArticle() { return exigerArticle; },
                    set exigerArticle(v) { exigerArticle = v; } };

})(window);
