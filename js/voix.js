'use strict';
/*
 * Prononciation, par la synthèse vocale du système.
 *
 * Aucun fichier son n'est embarqué : enregistrer 100 000 mots pèserait des
 * gigaoctets, et les téléphones savent déjà lire. `speechSynthesis` utilise les
 * voix installées sur l'appareil — celles d'Android ou d'iOS — et fonctionne
 * donc **hors ligne**, à condition que la langue soit installée. Aucune requête
 * réseau n'est émise : la politique de sécurité de l'application n'autorise de
 * toute façon que sa propre origine.
 *
 * ── Jamais une voix d'une autre langue ─────────────────────────────────────
 *
 * Un texte allemand n'est lu que par une voix dont la langue est l'allemand ;
 * s'il n'y en a aucune, il n'est pas lu du tout, et l'interface le dit. Lire
 * « Zehn Züge » avec une voix française donnerait un « z » à la française —
 * exactement le genre d'erreur qu'un apprenant retient sans le savoir. Le
 * moteur du système, lui, peut encore tricher : sur Android, une voix
 * allemande annoncée sans son paquet de langue installé retombe sur la langue
 * par défaut du téléphone. L'application ne peut pas le détecter ; elle peut
 * en revanche dire quelle voix elle a demandée, et laisser en choisir une autre.
 *
 * ── Le choix de la voix ────────────────────────────────────────────────────
 *
 * Par défaut, la première voix **locale** de la langue — elle marche sans
 * réseau, et c'est tout l'objet de l'application —, sinon la première venue.
 * Les Réglages permettent d'en préférer une autre, par langue, et de l'essayer
 * sur une phrase choisie pour ses sons pièges. Le choix est retenu par
 * `voiceURI` et par nom ; une voix disparue (désinstallée, autre appareil)
 * rend la main au choix automatique, et le diagnostic le signale.
 *
 * ── Les voix arrivent en retard ────────────────────────────────────────────
 *
 * Sur la plupart des navigateurs, `getVoices()` rend une liste vide au premier
 * appel et la remplit après coup, par `voiceschanged`. Un bouton ▸ dessiné
 * avant cela se croirait sans voix pour toujours : ceux qui se déclarent par
 * `brancherBouton` sont repeints à l'arrivée de la liste, et l'événement
 * `voix-changees` sur le document prévient les écrans qui affichent un état.
 *
 * Si la voix manque, on le dit une fois, calmement, et on n'y revient pas. Une
 * application qui réclame l'installation d'un module à chaque mot est vite
 * insupportable.
 */
(function (racine) {

  const disponible = typeof speechSynthesis !== 'undefined'
    && typeof SpeechSynthesisUtterance !== 'undefined';

  const LANGUES = ['de', 'fr'];

  /* Ce qu'on fait lire pour juger une voix : des sons que la langue voisine
   * prononce autrement. Le « z » allemand se dit « ts », jamais comme un « s »
   * doux ; les nasales et les finales muettes du français n'existent pas en
   * allemand. */
  const PHRASES_D_ESSAI = {
    de: 'Zehn Züge fahren zum Zoo.',
    fr: 'Les enfants chantent dans le jardin.',
  };

  let voix = [];                 // toutes les voix du système, telles quelles
  let pret = false;              // la liste est-elle arrivée au moins une fois ?
  let signature = '';            // pour ne signaler que les vrais changements
  let actif = true;
  const choisies = { de: null, fr: null };   // { uri, nom } préféré, par langue
  const boutons = new Map();     // bouton → langue, à repeindre à l'arrivée des voix

  /* Un énoncé en cours doit rester référencé : Chrome ramasse un énoncé que
   * plus rien ne tient, et n'appelle alors jamais `end`. */
  let enCours = null;

  // ── Les voix ──────────────────────────────────────────────────────────────

  /* « de-DE », « de_DE », « DE » : la balise de langue varie d'un moteur à
   * l'autre. On compare sur le code de langue, et l'on remet un tiret là où
   * un moteur Android écrit un tiret bas — un énoncé porteur d'une balise
   * mal formée peut être lu avec la voix par défaut. */
  function baliseDe(valeur) {
    return String(valeur || '').replace(/_/g, '-');
  }

  function codeDe(valeur) {
    return baliseDe(valeur).toLowerCase().split('-')[0];
  }

  function recenser() {
    if (!disponible) return false;
    let liste = [];
    try { liste = speechSynthesis.getVoices() || []; } catch (erreur) { liste = []; }
    voix = liste;
    if (liste.length) pret = true;
    const nouvelle = liste.map((v) => v.voiceURI + '|' + v.lang + '|' + (v.localService ? 'l' : 'r')).join('\n');
    if (nouvelle === signature) return false;
    signature = nouvelle;
    return true;
  }

  function annoncer() {
    for (const [bouton, langue] of boutons) {
      if (!bouton.isConnected) { boutons.delete(bouton); continue; }
      peindreBouton(bouton, langue);
    }
    if (typeof document !== 'undefined' && typeof CustomEvent !== 'undefined'
        && document.dispatchEvent) {
      document.dispatchEvent(new CustomEvent('voix-changees'));
    }
  }

  if (disponible) {
    recenser();
    // Sur la plupart des navigateurs la liste arrive après coup, de façon
    // asynchrone : sans cet écouteur, un premier appui sur « écouter » resterait
    // muet alors que la voix existe.
    speechSynthesis.addEventListener('voiceschanged', () => {
      if (recenser()) annoncer();
    });
    /* Un appareil sans aucune voix ne signale jamais rien : passé un délai,
     * la liste vide est tenue pour définitive, et les Réglages cessent de
     * dire qu'elle n'est pas encore arrivée. */
    const delai = setTimeout(() => {
      if (pret) return;
      recenser();
      pret = true;
      annoncer();
    }, 4000);
    if (delai && typeof delai.unref === 'function') delai.unref();
  }

  function candidates(langue) {
    if (!disponible) return [];
    if (!voix.length) recenser();
    return voix.filter((v) => codeDe(v.lang) === langue);
  }

  /* Le choix automatique : une voix locale d'abord. */
  function automatique(langue) {
    const liste = candidates(langue);
    if (!liste.length) return null;
    return liste.find((v) => v.localService) || liste[0];
  }

  /* La voix retenue dans les réglages, si elle est toujours là — et si elle
   * est bien de la langue demandée : un réglage importé d'ailleurs ne fera
   * jamais lire de l'allemand par une voix française. */
  function preferee(langue) {
    const choix = choisies[langue];
    if (!choix) return null;
    const liste = candidates(langue);
    return liste.find((v) => v.voiceURI === choix.uri)
      || liste.find((v) => v.name === choix.nom)
      || null;
  }

  function voixPour(langue) {
    const cible = langue === 'de' ? 'de' : 'fr';
    return preferee(cible) || automatique(cible);
  }

  function possible(langue) {
    return !!voixPour(langue);
  }

  function decrire(v) {
    if (!v) return null;
    return { uri: v.voiceURI, nom: v.name, lang: baliseDe(v.lang), locale: !!v.localService };
  }

  /* Les voix qu'on peut choisir pour une langue, dans l'ordre du système. */
  function lister(langue) {
    return candidates(langue).map(decrire);
  }

  /* Ce que les Réglages affichent, et ce qu'on demande à qui signale un
   * défaut de prononciation : la voix effectivement retenue, si elle vient
   * d'un choix ou du défaut, et si un choix enregistré est introuvable. */
  function diagnostic(langue) {
    const liste = candidates(langue);
    const choix = choisies[langue];
    const pref = preferee(langue);
    const retenue = pref || automatique(langue);
    return {
      langue,
      disponible,
      pret,
      actif,
      nombre: liste.length,
      total: voix.length,
      voix: decrire(retenue),
      choix: choix ? { uri: choix.uri, nom: choix.nom } : null,
      choixIntrouvable: !!(choix && !pref),
      automatique: !pref,
    };
  }

  /* De quoi nommer l'appareil dans un signalement : système et navigateur,
   * tels que le navigateur les annonce. Rien n'est envoyé nulle part. */
  function appareil() {
    const n = typeof navigator !== 'undefined' ? navigator : {};
    const donnees = n.userAgentData || null;
    return {
      plateforme: (donnees && donnees.platform) || n.platform || '',
      navigateur: n.userAgent || '',
    };
  }

  // ── Les réglages ──────────────────────────────────────────────────────────

  function choixValide(valeur) {
    if (!valeur || typeof valeur !== 'object') return null;
    const uri = typeof valeur.uri === 'string' ? valeur.uri.slice(0, 300) : '';
    const nom = typeof valeur.nom === 'string' ? valeur.nom.slice(0, 200) : '';
    return uri || nom ? { uri, nom } : null;
  }

  /* Lit les réglages `voixDe` et `voixFr` — `{uri, nom}` ou rien. */
  function configurer(reglages) {
    const r = reglages || {};
    choisies.de = choixValide(r.voixDe);
    choisies.fr = choixValide(r.voixFr);
    annoncer();
  }

  /* Retient une voix pour une langue (`null` : choix automatique). Rend ce
   * qu'il faut écrire dans les réglages. */
  function choisir(langue, uri) {
    if (LANGUES.indexOf(langue) === -1) return null;
    const v = uri ? candidates(langue).find((c) => c.voiceURI === uri) : null;
    choisies[langue] = v ? { uri: v.voiceURI, nom: v.name } : null;
    annoncer();
    return choisies[langue];
  }

  function phraseDEssai(langue) {
    return PHRASES_D_ESSAI[langue] || PHRASES_D_ESSAI.de;
  }

  function essayer(langue) {
    return dire(phraseDEssai(langue), langue);
  }

  // ── Les boutons ▸ ─────────────────────────────────────────────────────────

  function peindreBouton(bouton, langue) {
    const sans = !possible(langue);
    bouton.disabled = sans;
    if (sans) {
      bouton.title = racine.I18n ? I18n.t('voix.aucune.' + langue) : '';
    } else {
      bouton.removeAttribute('title');
    }
  }

  /* Un bouton d'écoute qui suit l'arrivée des voix : grisé tant qu'aucune
   * voix de la langue n'est là, repeint dès que la liste change. */
  function brancherBouton(bouton, langue) {
    boutons.set(bouton, langue);
    peindreBouton(bouton, langue);
    return bouton;
  }

  // ── Parler ────────────────────────────────────────────────────────────────

  /* Une parole, prête à partir. Un peu en dessous de la vitesse normale : on
   * écoute pour apprendre à prononcer, pas pour aller vite. */
  function parole(texte, choisie) {
    const p = new SpeechSynthesisUtterance(texte);
    p.voice = choisie;
    p.lang = baliseDe(choisie.lang);
    p.rate = 0.9;
    return p;
  }

  function lancer(p) {
    enCours = p;
    const relacher = () => { if (enCours === p) enCours = null; };
    p.addEventListener('end', relacher);
    p.addEventListener('error', relacher);
    speechSynthesis.speak(p);
  }

  function dire(texte, langue) {
    if (!disponible || !actif || !texte) return false;
    const choisie = voixPour(langue);
    if (!choisie) return false;
    taire();
    lancer(parole(texte, choisie));
    return true;
  }

  /* Une suite de répliques, avec un silence entre chacune.
   *
   * C'est ce qu'il faut pour écouter un dialogue : chaque réplique part quand
   * la précédente est finie, après une pause — le temps de suivre des yeux,
   * ou de répéter. `items` est une liste de `{texte, langue, silence}` ; un
   * item sans texte ne fait qu'attendre `silence` millisecondes, ce qui
   * laisse un tour de parole vide à qui joue un rôle.
   *
   * `surItem(i)` est appelé quand l'item i commence, `surFin(interrompu)`
   * quand tout est fini ou arrêté. Rend `{arreter}`. Une seule suite à la
   * fois : en lancer une autre, ou `dire()`, ou `taire()`, arrête celle-ci —
   * la synthèse n'a qu'une voix, et un dialogue par-dessus un autre ne serait
   * qu'un brouhaha.
   *
   * Les navigateurs ne signalent pas tous la fin d'une parole annulée ; le
   * numéro de suite fait garde-fou, et une parole qui n'appelle jamais `end`
   * est rattrapée par un délai proportionné à sa longueur. */
  let suiteCourante = null;

  function enchainer(items, options) {
    const reglages = options || {};
    const pause = reglages.pause === undefined ? 900 : reglages.pause;
    taire();
    if (!disponible || !actif) {
      if (reglages.surFin) reglages.surFin(true);
      return { arreter() {} };
    }

    const suite = { active: true, minuterie: null, finir: null };
    suiteCourante = suite;
    let position = 0;

    function finir(interrompu) {
      if (!suite.active) return;
      suite.active = false;
      if (suite.minuterie) clearTimeout(suite.minuterie);
      if (suiteCourante === suite) suiteCourante = null;
      if (reglages.surFin) reglages.surFin(interrompu);
    }
    suite.finir = finir;

    function suivant() {
      if (!suite.active) return;
      if (position >= items.length) { finir(false); return; }
      const item = items[position];
      const rang = position;
      position += 1;
      if (reglages.surItem) reglages.surItem(rang);
      const silence = item.silence === undefined ? pause : item.silence;

      if (!item.texte) {
        suite.minuterie = setTimeout(suivant, silence);
        return;
      }
      const choisie = voixPour(item.langue);
      if (!choisie) {
        // Pas de voix pour cette langue : on passe, la suite continue.
        suite.minuterie = setTimeout(suivant, silence);
        return;
      }
      const p = parole(item.texte, choisie);
      let fini = false;
      const apres = () => {
        if (fini || !suite.active) return;
        fini = true;
        if (suite.minuterie) clearTimeout(suite.minuterie);
        suite.minuterie = setTimeout(suivant, silence);
      };
      p.onend = apres;
      p.onerror = (e) => {
        // Une parole interrompue par `cancel()` signale une erreur : ce n'est
        // pas la nôtre à traiter, `arreter` a déjà tout fermé.
        if (e && (e.error === 'interrupted' || e.error === 'canceled')) return;
        apres();
      };
      // Le filet : 120 ms par signe, jamais moins de trois secondes — plus
      // que la voix la plus lente, pour ne pas lui couper la parole.
      suite.minuterie = setTimeout(apres, 3000 + item.texte.length * 120);
      lancer(p);
    }

    suivant();
    return {
      arreter() {
        if (!suite.active) return;
        finir(true);
        speechSynthesis.cancel();
      },
    };
  }

  function taire() {
    if (suiteCourante) {
      // Le module qui écoutait doit savoir que c'est fini.
      const suite = suiteCourante;
      suiteCourante = null;
      suite.finir(true);
    }
    if (disponible) speechSynthesis.cancel();
  }

  racine.Voix = {
    LANGUES,
    get disponible() { return disponible; },
    get pret() { return pret; },
    get actif() { return actif; },
    set actif(valeur) { actif = !!valeur; if (!actif) taire(); },
    possible,
    lister,
    diagnostic,
    appareil,
    configurer,
    choisir,
    phraseDEssai,
    essayer,
    brancherBouton,
    dire,
    enchainer,
    taire,
  };

})(window);
