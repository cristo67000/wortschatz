'use strict';
/*
 * L'interface : onglets, recherche, ouverture des fiches, réglages.
 *
 * La recherche est synchrone. Chercher un préfixe dans 107 000 entrées est une
 * dichotomie — une quinzaine de comparaisons — et coûte moins qu'un battement
 * de cil ; ce qui coûte, c'est de dessiner la liste. Il n'y a donc pas de
 * temporisation à la frappe : les résultats suivent la touche, ce qui est
 * exactement ce qu'on attend d'un dictionnaire posé sur l'appareil.
 */
(function (racine) {

  const $ = (selecteur) => document.querySelector(selecteur);

  const elements = {};
  let reglages = null;
  let manifeste = null;
  let annulationTelechargement = null;

  function element(balise, classe, texte) {
    const noeud = document.createElement(balise);
    if (classe) noeud.className = classe;
    if (texte !== undefined && texte !== null) noeud.textContent = texte;
    return noeud;
  }

  // ── Onglets ───────────────────────────────────────────────────────────────

  function basculer(nom) {
    for (const vue of document.querySelectorAll('.vue')) {
      vue.hidden = vue.id !== 'vue-' + nom;
    }
    for (const bouton of elements.onglets.querySelectorAll('button')) {
      const actif = bouton.dataset.vue === nom;
      if (actif) bouton.setAttribute('aria-current', 'true');
      else bouton.removeAttribute('aria-current');
    }
    if (nom === 'reglages') dessinerReglages();
    if (nom === 'reviser') Seance.rafraichir();
    if (nom === 'progres') Progres.dessiner(elements.progresContenu);
    if (nom === 'chercher') elements.q.focus({ preventScroll: true });
    racine.scrollTo(0, 0);
  }

  // ── Recherche ─────────────────────────────────────────────────────────────

  function dessinerResultats(resultats, saisie) {
    const liste = elements.resultats;
    liste.textContent = '';

    for (const resultat of resultats) {
      const bouton = element('button', 'resultat');
      bouton.type = 'button';
      bouton.appendChild(element('span', 'pastille', I18n.t('langue.' + resultat.langue + '.court')));
      bouton.appendChild(element('span', 'mot', resultat.mot));
      if (resultat.via) {
        /* La flèche se lit dans le sens de la recherche : on a tapé « Häuser »,
         * on arrive à « Haus ». Écrire « forme de Häuser » à côté de « Haus »
         * se lisait à l'envers. */
        const note = element('span', 'via', '← ' + resultat.via);
        note.title = resultat.via + ' : ' + I18n.t('chercher.via') + ' ' + resultat.mot;
        bouton.appendChild(note);
      }
      bouton.appendChild(element('span', 'traduction', resultat.apercu));
      bouton.addEventListener('click', () => ouvrirFiche(resultat));
      const ligne = element('li');
      ligne.appendChild(bouton);
      liste.appendChild(ligne);
    }

    const aQuelqueChose = resultats.length > 0;
    liste.hidden = !aQuelqueChose;
    elements.accueil.hidden = !!saisie;
    elements.rien.hidden = !saisie || aQuelqueChose;
    elements.rienConseil.textContent = I18n.t(
      Lexique.paquet === 'complet' ? 'chercher.rien.complet' : 'chercher.rien.conseil');
  }

  function chercher() {
    const saisie = elements.q.value.trim();
    elements.qVider.hidden = !saisie;
    dessinerResultats(saisie ? Lexique.chercher(saisie) : [], saisie);
  }

  // ── Fiche ─────────────────────────────────────────────────────────────────

  async function ouvrirFiche(resultat) {
    const entree = await Lexique.ouvrir(resultat);
    if (!entree) return;
    elements.ficheContenu.textContent = '';
    elements.ficheContenu.appendChild(Fiche.construire(entree, fermerFiche));
    elements.fiche.hidden = false;
    elements.fiche.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    Store.consulter(entree.langue, entree.mot).catch(() => {});
  }

  function fermerFiche() {
    elements.fiche.hidden = true;
    document.body.style.overflow = '';
    Voix.taire();
  }

  // ── Accueil : suggestions et mots récents ─────────────────────────────────

  function dessinerSuggestions() {
    elements.suggestions.textContent = '';
    for (const mot of I18n.SUGGESTIONS) {
      const bouton = element('button', null, mot);
      bouton.type = 'button';
      bouton.addEventListener('click', () => {
        elements.q.value = mot;
        chercher();
      });
      elements.suggestions.appendChild(bouton);
    }
  }

  async function dessinerRecents() {
    const recents = await Store.historique().catch(() => []);
    elements.recents.textContent = '';
    if (!recents.length) return;
    elements.recents.appendChild(element('h3', null, I18n.t('chercher.resultats')));
    const liste = element('ul');
    liste.style.listStyle = 'none';
    liste.style.padding = '0';
    liste.style.margin = '0';
    for (const recent of recents.slice(0, 8)) {
      const bouton = element('button', 'resultat');
      bouton.type = 'button';
      bouton.appendChild(element('span', 'pastille', I18n.t('langue.' + recent.langue + '.court')));
      bouton.appendChild(element('span', 'mot', recent.mot));
      bouton.addEventListener('click', () => {
        elements.q.value = recent.mot;
        chercher();
      });
      const ligne = element('li');
      ligne.appendChild(bouton);
      liste.appendChild(ligne);
    }
    elements.recents.appendChild(liste);
  }

  // ── Réglages ──────────────────────────────────────────────────────────────

  function dessinerReglages() {
    for (const bouton of document.querySelectorAll('[data-langue]')) {
      bouton.setAttribute('aria-pressed', String(bouton.dataset.langue === I18n.langue));
    }

    elements.reglageVoix.checked = !!reglages.voix;
    elements.reglageNouveautes.value = String(reglages.nouveautesParJour);
    elements.etatVoix.textContent = Voix.possible('de') && Voix.possible('fr')
      ? '' : I18n.t('fiche.aucune-voix');

    const versions = manifeste
      ? `Wortschatz · données ${manifeste.construit} · Wiktionnaire (WikDict, CC BY-SA) · Tatoeba (CC BY 2.0 FR)`
      : '';
    elements.aproposVersions.textContent = versions;

    dessinerDictionnaire();
  }

  async function dessinerDictionnaire() {
    const zone = elements.zoneTelechargement;
    zone.textContent = '';
    if (!manifeste) return;

    const installeComplet = Lexique.paquet === 'complet';
    const nombre = installeComplet
      ? manifeste.paquets.complet.entrees.de + manifeste.paquets.complet.entrees.fr
      : manifeste.paquets.noyau.entrees.de + manifeste.paquets.noyau.entrees.fr;
    elements.etatDictionnaire.textContent = I18n.t(
      installeComplet ? 'reglages.dictionnaire.complet' : 'reglages.dictionnaire.noyau',
      { n: nombre.toLocaleString(I18n.langue) });

    if (installeComplet) {
      const bouton = element('button', 'bouton-discret', I18n.t('reglages.supprimer'));
      bouton.type = 'button';
      bouton.addEventListener('click', async () => {
        const taille = Paquets.humain(Paquets.poids(manifeste), I18n.langue);
        if (!racine.confirm(I18n.t('reglages.supprimer.confirme', { taille }))) return;
        await Paquets.supprimer();
        await Lexique.charger('noyau');
        await Store.ecrireReglage('paquet', 'noyau');
        reglages.paquet = 'noyau';
        dessinerReglages();
        chercher();
      });
      zone.appendChild(bouton);
      return;
    }

    const complets = manifeste.paquets.complet.entrees;
    const noyaux = manifeste.paquets.noyau.entrees;
    const detail = element('p', 'discret', I18n.t('reglages.telecharger.detail', {
      n: (complets.de + complets.fr - noyaux.de - noyaux.fr).toLocaleString(I18n.langue),
    }));
    const bouton = element('button', 'bouton-principal', I18n.t('reglages.telecharger', {
      taille: Paquets.humain(Paquets.poids(manifeste), I18n.langue),
    }));
    bouton.type = 'button';
    bouton.addEventListener('click', () => lancerTelechargement(zone, bouton));
    zone.appendChild(bouton);
    zone.appendChild(detail);
  }

  async function lancerTelechargement(zone, bouton) {
    bouton.disabled = true;
    bouton.textContent = I18n.t('reglages.telechargement');

    const jauge = element('div', 'jauge');
    const barre = element('div');
    jauge.appendChild(barre);
    const compteur = element('p', 'discret', '');
    const arreter = element('button', 'bouton-discret', I18n.t('reglages.telechargement.arreter'));
    arreter.type = 'button';
    zone.appendChild(jauge);
    zone.appendChild(compteur);
    zone.appendChild(arreter);

    annulationTelechargement = new AbortController();
    arreter.addEventListener('click', () => annulationTelechargement.abort());

    try {
      const fini = await Paquets.telecharger(manifeste, ({ faits, total, octets }) => {
        barre.style.width = Math.round(100 * faits / total) + '%';
        compteur.textContent = `${faits} / ${total} — ${Paquets.humain(octets, I18n.langue)}`;
      }, annulationTelechargement.signal);

      if (!fini) { dessinerDictionnaire(); return; }

      await Lexique.charger('complet');
      await Store.ecrireReglage('paquet', 'complet');
      reglages.paquet = 'complet';
      dessinerReglages();
      chercher();
    } catch (erreur) {
      if (erreur && erreur.name === 'AbortError') { dessinerDictionnaire(); return; }
      zone.textContent = '';
      zone.appendChild(element('p', 'discret', I18n.t('reglages.telechargement.echec')));
      const reessayer = element('button', 'bouton-principal', I18n.t('reglages.telecharger', {
        taille: Paquets.humain(Paquets.poids(manifeste), I18n.langue),
      }));
      reessayer.type = 'button';
      reessayer.addEventListener('click', () => lancerTelechargement(zone, reessayer));
      zone.appendChild(reessayer);
    } finally {
      annulationTelechargement = null;
    }
  }

  // ── Mise en place ─────────────────────────────────────────────────────────

  function brancher(etatInitial) {
    reglages = etatInitial.reglages;
    manifeste = etatInitial.manifeste;

    Object.assign(elements, {
      q: $('#q'),
      qVider: $('#q-vider'),
      resultats: $('#resultats'),
      accueil: $('#accueil'),
      rien: $('#rien'),
      rienConseil: $('#rien-conseil'),
      suggestions: $('#suggestions'),
      recents: $('#recents'),
      onglets: $('#onglets'),
      fiche: $('#fiche'),
      ficheContenu: $('#fiche-contenu'),
      zoneTelechargement: $('#zone-telechargement'),
      etatDictionnaire: $('#etat-dictionnaire'),
      reglageVoix: $('#reglage-voix'),
      reglageNouveautes: $('#reglage-nouveautes'),
      etatVoix: $('#etat-voix'),
      aproposVersions: $('#apropos-versions'),
      progresContenu: $('#progres-contenu'),
    });

    Seance.brancher(reglages);

    elements.q.addEventListener('input', chercher);
    elements.qVider.addEventListener('click', () => {
      elements.q.value = '';
      chercher();
      elements.q.focus();
    });

    elements.onglets.addEventListener('click', (e) => {
      const bouton = e.target.closest('button[data-vue]');
      if (bouton) basculer(bouton.dataset.vue);
    });

    for (const bouton of document.querySelectorAll('[data-langue]')) {
      bouton.addEventListener('click', async () => {
        I18n.definir(bouton.dataset.langue);
        await Store.ecrireReglage('langue', bouton.dataset.langue);
      });
    }

    elements.reglageNouveautes.addEventListener('change', async () => {
      const valeur = Math.max(0, Math.min(60, Number(elements.reglageNouveautes.value) || 0));
      elements.reglageNouveautes.value = String(valeur);
      reglages.nouveautesParJour = valeur;
      Seance.quota = valeur;
      await Store.ecrireReglage('nouveautesParJour', valeur);
      Seance.rafraichir();
    });

    elements.reglageVoix.addEventListener('change', async () => {
      Voix.actif = elements.reglageVoix.checked;
      reglages.voix = elements.reglageVoix.checked;
      await Store.ecrireReglage('voix', reglages.voix);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !elements.fiche.hidden) fermerFiche();
    });

    // Un changement de langue redessine ce qui est déjà affiché : les résultats
    // et la fiche portent des textes traduits qu'`I18n.appliquer` ne voit pas,
    // puisqu'ils ont été fabriqués en JavaScript.
    document.addEventListener('langue-changee', () => {
      dessinerSuggestions();
      dessinerRecents();
      chercher();
      if (!elements.fiche.hidden) fermerFiche();
      if (!$('#vue-reglages').hidden) dessinerReglages();
      if (!$('#vue-reviser').hidden) Seance.rafraichir();
      if (!$('#vue-progres').hidden) Progres.dessiner(elements.progresContenu);
    });

    Voix.actif = !!reglages.voix;
    dessinerSuggestions();
    dessinerRecents();
    basculer('chercher');
  }

  racine.App = { brancher, basculer, ouvrirFiche, chercher };

})(window);
