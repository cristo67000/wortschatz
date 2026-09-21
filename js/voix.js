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
 * Si la voix manque, on le dit une fois, calmement, et on n'y revient pas. Une
 * application qui réclame l'installation d'un module à chaque mot est vite
 * insupportable.
 */
(function (racine) {

  const disponible = typeof speechSynthesis !== 'undefined'
    && typeof SpeechSynthesisUtterance !== 'undefined';

  let voix = [];
  let actif = true;

  function recenser() {
    if (!disponible) return;
    voix = speechSynthesis.getVoices() || [];
  }

  if (disponible) {
    recenser();
    // Sur la plupart des navigateurs la liste arrive après coup, de façon
    // asynchrone : sans cet écouteur, un premier appui sur « écouter » resterait
    // muet alors que la voix existe.
    speechSynthesis.addEventListener('voiceschanged', recenser);
  }

  function voixPour(langue) {
    if (!disponible) return null;
    if (!voix.length) recenser();
    const cible = langue === 'de' ? 'de' : 'fr';
    // Une voix locale est préférée : elle marche sans réseau, et c'est tout
    // l'objet de cette application.
    const candidates = voix.filter((v) => (v.lang || '').toLowerCase().startsWith(cible));
    if (!candidates.length) return null;
    return candidates.find((v) => v.localService) || candidates[0];
  }

  function possible(langue) {
    return !!voixPour(langue);
  }

  /* Une parole, prête à partir. Un peu en dessous de la vitesse normale : on
   * écoute pour apprendre à prononcer, pas pour aller vite. */
  function parole(texte, choisie) {
    const p = new SpeechSynthesisUtterance(texte);
    p.voice = choisie;
    p.lang = choisie.lang;
    p.rate = 0.9;
    return p;
  }

  function dire(texte, langue) {
    if (!disponible || !actif || !texte) return false;
    const choisie = voixPour(langue);
    if (!choisie) return false;
    taire();
    speechSynthesis.speak(parole(texte, choisie));
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
      speechSynthesis.speak(p);
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
    get disponible() { return disponible; },
    get actif() { return actif; },
    set actif(valeur) { actif = !!valeur; if (!actif) taire(); },
    possible,
    dire,
    enchainer,
    taire,
  };

})(window);
