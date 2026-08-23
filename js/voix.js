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

  function dire(texte, langue) {
    if (!disponible || !actif || !texte) return false;
    const choisie = voixPour(langue);
    if (!choisie) return false;
    speechSynthesis.cancel();
    const parole = new SpeechSynthesisUtterance(texte);
    parole.voice = choisie;
    parole.lang = choisie.lang;
    // Un peu en dessous de la vitesse normale : on écoute pour apprendre à
    // prononcer, pas pour aller vite.
    parole.rate = 0.9;
    speechSynthesis.speak(parole);
    return true;
  }

  function taire() {
    if (disponible) speechSynthesis.cancel();
  }

  racine.Voix = {
    get disponible() { return disponible; },
    get actif() { return actif; },
    set actif(valeur) { actif = !!valeur; if (!actif) taire(); },
    possible,
    dire,
    taire,
  };

})(window);
