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
    if (nom !== 'reviser' && racine.Suivis) Suivis.reinitialiser();
    if (nom !== 'mesmots' && racine.MesMots) MesMots.reinitialiser();
    if (nom === 'reglages') dessinerReglages();
    if (nom === 'reviser') Seance.rafraichir();
    if (nom === 'mesmots') MesMots.dessiner();
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

    /* « Ajouter ce mot », sous une recherche restée vide.
     *
     * C'est le seul endroit où l'on sait à coup sûr que le mot manque, et le
     * seul moment où on l'a encore sous les yeux, bien orthographié. Le bouton
     * reste aussi accessible sous une liste de résultats — on cherche parfois
     * un mot dont un homographe existe — mais discrètement. */
    elements.ajouterSousRien.hidden = !saisie || aQuelqueChose;
    elements.ajouterSousListe.hidden = !saisie || !aQuelqueChose;
    if (saisie) {
      elements.ajouterSousRien.textContent =
        I18n.t('perso.ajouter.ce-mot', { mot: saisie });
    }
  }

  function ajouterLeMotCherche() {
    const saisie = elements.q.value.trim();
    MesMots.ouvrirFormulaire({ saisie });
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
    /* L'historique de consultation ne retient que le dictionnaire : il sert à
     * retrouver ce qu'on a cherché, et un mot personnel se retrouve dans
     * « Mes mots », qui ne l'oublie jamais. */
    if (!entree.perso) Store.consulter(entree.langue, entree.mot).catch(() => {});
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

    for (const bouton of document.querySelectorAll('[data-sens]')) {
      bouton.setAttribute('aria-pressed',
        String(bouton.dataset.sens === (reglages.sensDeTravail || 'les-deux')));
    }

    elements.reglageVoix.checked = !!reglages.voix;
    elements.reglageArticle.checked = reglages.exigerArticle !== false;
    elements.reglageNouveautes.value = String(reglages.nouveautesParJour);
    elements.etatVoix.textContent = Voix.possible('de') && Voix.possible('fr')
      ? '' : I18n.t('fiche.aucune-voix');

    /* La version de l'application vient du service worker, seul à la connaître ;
     * elle manque au tout premier lancement, avant qu'il ne contrôle la page. */
    const application = 'Wortschatz' + (MiseAJour.version ? ' ' + MiseAJour.version : '');
    const versions = manifeste
      ? `${application} · données ${manifeste.construit} · Wiktionnaire (WikDict et wiktextract, CC BY-SA) · Tatoeba (CC BY 2.0 FR)`
      : '';
    elements.aproposVersions.textContent = versions;
    elements.etatMaj.textContent = '';

    dessinerDictionnaire();
    dessinerSauvegarde();
    Installer.dessiner();
  }

  async function dessinerDictionnaire() {
    const zone = elements.zoneTelechargement;
    zone.textContent = '';
    if (!manifeste) return;

    const installeComplet = Lexique.paquet === 'complet';
    const actif = manifeste.paquets[installeComplet ? 'complet' : 'noyau'];
    const nombre = actif.entrees.de + actif.entrees.fr;
    elements.etatDictionnaire.textContent = I18n.t(
      installeComplet ? 'reglages.dictionnaire.complet' : 'reglages.dictionnaire.noyau',
      { n: nombre.toLocaleString(I18n.langue) });

    /* Ce que le paquet actif pèse, ce qu'il sait faire, et d'où il vient.
     *
     * Trois choses qu'il fallait deviner jusqu'ici. « Installé » se dit
     * explicitement : sur un téléphone, la différence entre « téléchargé et
     * utilisable hors ligne » et « il faut du réseau » est la seule qui
     * compte, et elle ne se lisait nulle part. */
    const traduites = actif.traduites
      ? actif.traduites.de + actif.traduites.fr : nombre;
    const fiche = element('p', 'discret dictionnaire-detail');
    fiche.appendChild(element('span', 'etat-installe',
      I18n.t('reglages.dictionnaire.installe')));
    fiche.appendChild(document.createTextNode(' · ' + I18n.t(
      'reglages.dictionnaire.poids',
      { taille: Paquets.humain(actif.octets, I18n.langue) })));
    fiche.appendChild(document.createTextNode(' · ' + I18n.t(
      'reglages.dictionnaire.traduites',
      { n: traduites.toLocaleString(I18n.langue) })));
    fiche.appendChild(document.createTextNode(' · ' + I18n.t(
      'reglages.dictionnaire.phrases',
      { n: actif.phrases.toLocaleString(I18n.langue) })));
    zone.appendChild(fiche);

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

  // ── Sauvegarde et restauration ────────────────────────────────────────────

  /* Exporter, puis importer en deux temps : examiner, puis appliquer.
   *
   * Le temps intermédiaire n'est pas une politesse, c'est le cœur du sujet. Un
   * fichier peut être plus ancien que ce qu'il y a dans l'appareil ; l'écrire
   * par-dessus sans rien dire détruirait des révisions plus récentes, et
   * personne ne s'en apercevrait avant des semaines. On montre donc d'abord ce
   * qui entrerait, ce qui existe déjà, et ce qui se contredit — puis on demande.
   */
  function dessinerSauvegarde() {
    const zone = elements.zoneSauvegarde;
    if (!zone) return;
    zone.textContent = '';

    const ligne = element('div', 'ligne-boutons');
    const exporter = element('button', 'bouton-discret', I18n.t('sauvegarde.exporter'));
    exporter.type = 'button';
    const importer = element('button', 'bouton-discret', I18n.t('sauvegarde.importer'));
    importer.type = 'button';
    ligne.appendChild(exporter);
    ligne.appendChild(importer);
    zone.appendChild(ligne);

    const fichier = element('input');
    fichier.type = 'file';
    fichier.accept = 'application/json,.json';
    fichier.hidden = true;
    zone.appendChild(fichier);

    const avis = element('div', 'sauvegarde-avis');
    zone.appendChild(avis);

    exporter.addEventListener('click', async () => {
      exporter.disabled = true;
      try {
        await Sauvegarde.exporter();
        avis.textContent = '';
        avis.appendChild(element('p', 'discret',
          I18n.t('sauvegarde.exporte', { fichier: Sauvegarde.nomDeFichier() })));
      } catch (erreur) {
        avis.textContent = I18n.t('sauvegarde.erreur.export');
      } finally {
        exporter.disabled = false;
      }
    });

    importer.addEventListener('click', () => fichier.click());
    fichier.addEventListener('change', async () => {
      const choisi = fichier.files && fichier.files[0];
      fichier.value = '';
      if (!choisi) return;
      avis.textContent = '';
      avis.appendChild(element('p', 'discret', I18n.t('sauvegarde.lecture')));
      const bilan = await Sauvegarde.examiner(choisi);
      avis.textContent = '';
      if (bilan.erreur) {
        avis.appendChild(element('p', 'sauvegarde-echec', I18n.t(bilan.erreur)));
        return;
      }
      dessinerBilanImport(avis, bilan);
    });
  }

  function compteur(hote, cle, valeur) {
    if (!valeur) return;
    hote.appendChild(element('li', null, I18n.n(cle, valeur)));
  }

  function dessinerBilanImport(avis, bilan) {
    avis.appendChild(element('p', null,
      I18n.t('sauvegarde.trouve', { date: bilan.exporte || '?' })));

    const details = element('ul', 'sauvegarde-bilan');
    compteur(details, 'sauvegarde.bilan.mots', bilan.mots.neufs.length);
    compteur(details, 'sauvegarde.bilan.notes', bilan.notes.neufs.length);
    compteur(details, 'sauvegarde.bilan.cartes', bilan.cartes.neufs.length);
    const pareils = bilan.mots.pareils.length + bilan.notes.pareils.length
      + bilan.cartes.pareils.length;
    compteur(details, 'sauvegarde.bilan.identiques', pareils);
    compteur(details, 'sauvegarde.bilan.conflits', bilan.conflits);
    const ignorees = bilan.ignorees.mots + bilan.ignorees.notes + bilan.ignorees.cartes;
    compteur(details, 'sauvegarde.bilan.ignorees', ignorees);
    if (!details.childNodes.length) {
      details.appendChild(element('li', null, I18n.t('sauvegarde.bilan.rien')));
    }
    avis.appendChild(details);

    let politique = 'garder';
    if (bilan.conflits) {
      avis.appendChild(element('p', 'discret', I18n.t('sauvegarde.conflits.question')));
      const choix = element('div', 'segments');
      choix.setAttribute('role', 'group');
      for (const valeur of ['garder', 'remplacer']) {
        const bouton = element('button', null, I18n.t('sauvegarde.conflits.' + valeur));
        bouton.type = 'button';
        bouton.setAttribute('aria-pressed', String(valeur === politique));
        bouton.addEventListener('click', () => {
          politique = valeur;
          for (const autre of choix.querySelectorAll('button')) {
            autre.setAttribute('aria-pressed', String(autre === bouton));
          }
        });
        choix.appendChild(bouton);
      }
      avis.appendChild(choix);
    }

    if (!bilan.neufs && !bilan.conflits) return;

    const boutons = element('div', 'ligne-boutons');
    const valider = element('button', 'bouton-principal', I18n.t('sauvegarde.appliquer'));
    valider.type = 'button';
    valider.addEventListener('click', async () => {
      valider.disabled = true;
      const compte = await Sauvegarde.appliquer(bilan, politique);
      avis.textContent = '';
      const resume = element('ul', 'sauvegarde-bilan');
      compteur(resume, 'sauvegarde.fait.mots', compte.mots);
      compteur(resume, 'sauvegarde.fait.notes', compte.notes);
      compteur(resume, 'sauvegarde.fait.cartes', compte.cartes);
      compteur(resume, 'sauvegarde.fait.gardes', compte.gardes);
      compteur(resume, 'sauvegarde.fait.orphelines', compte.orphelines);
      if (!resume.childNodes.length) {
        resume.appendChild(element('li', null, I18n.t('sauvegarde.fait.rien')));
      }
      avis.appendChild(element('p', null, I18n.t('sauvegarde.fait')));
      avis.appendChild(resume);
      if (racine.MesMots) MesMots.dessiner();
      if (racine.Seance) Seance.rafraichir();
      chercher();
    });
    boutons.appendChild(valider);
    avis.appendChild(boutons);
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
      reglageArticle: $('#reglage-article'),
      reglageNouveautes: $('#reglage-nouveautes'),
      etatVoix: $('#etat-voix'),
      ajouterSousRien: $('#b-ajouter-rien'),
      ajouterSousListe: $('#b-ajouter-liste'),
      zoneSauvegarde: $('#zone-sauvegarde'),
      aproposVersions: $('#apropos-versions'),
      verifierMaj: $('#b-verifier-maj'),
      etatMaj: $('#etat-maj'),
      progresContenu: $('#progres-contenu'),
    });

    Seance.brancher(reglages);
    Installer.brancher();

    /* Un seul écouteur pour tous les mots cliquables de l'application, posé une
     * fois pour toutes : les fiches se redessinent sans avoir à le refaire.
     *
     * Il est branché **avant** la touche Échap ci-dessous, et l'ordre compte :
     * les deux écoutent le document, et Échap doit d'abord refermer le
     * cartouche ouvert par-dessus la fiche, pas la fiche elle-même. */
    MotsVifs.brancher();
    Atelier.brancher();
    MesMots.brancher();

    elements.ajouterSousRien.addEventListener('click', ajouterLeMotCherche);
    elements.ajouterSousListe.addEventListener('click', ajouterLeMotCherche);

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

    for (const bouton of document.querySelectorAll('[data-sens]')) {
      bouton.addEventListener('click', async () => {
        reglages.sensDeTravail = bouton.dataset.sens;
        Revision.sensDeTravail = reglages.sensDeTravail;
        await Store.ecrireReglage('sensDeTravail', reglages.sensDeTravail);
        dessinerReglages();
      });
    }

    elements.reglageArticle.addEventListener('change', async () => {
      reglages.exigerArticle = elements.reglageArticle.checked;
      Seance.exigerArticle = reglages.exigerArticle;
      await Store.ecrireReglage('exigerArticle', reglages.exigerArticle);
    });

    /* Chercher une mise à jour à la main. Le bandeau s'affiche de lui-même si
     * une version arrive ; ce bouton sert à celui qui veut en avoir le cœur net
     * — et à savoir, quand tout va bien, qu'il n'y a rien à faire. */
    elements.verifierMaj.addEventListener('click', async () => {
      elements.verifierMaj.disabled = true;
      elements.etatMaj.textContent = I18n.t('maj.recherche');
      const etat = await MiseAJour.verifier(true);
      elements.verifierMaj.disabled = false;
      elements.etatMaj.textContent = I18n.t('maj.etat.' + etat);
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
      if (racine.MesMots) MesMots.fermerFormulaire();
      if (!$('#vue-reglages').hidden) dessinerReglages();
      if (racine.Atelier) Atelier.dessiner();
      if (!$('#vue-reviser').hidden) Seance.rafraichir();
      if (!$('#vue-mesmots').hidden) MesMots.dessiner();
      if (!$('#vue-progres').hidden) Progres.dessiner(elements.progresContenu);
    });

    Revision.sensDeTravail = reglages.sensDeTravail || 'les-deux';
    Voix.actif = !!reglages.voix;
    dessinerSuggestions();
    dessinerRecents();
    basculer('chercher');
  }

  racine.App = { brancher, basculer, ouvrirFiche, chercher };

})(window);
