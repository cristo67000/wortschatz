'use strict';
/*
 * Amorçage : réglages, langue, dictionnaire, service worker.
 *
 * L'ordre compte. On lit d'abord les réglages, pour savoir dans quelle langue
 * afficher un éventuel message d'erreur. On demande ensuite au cache lequel des
 * deux paquets est réellement installé, plutôt que de croire le réglage sur
 * parole : l'utilisateur a pu vider les données du site depuis le navigateur,
 * auquel cas le réglage annoncerait un dictionnaire complet qui n'est plus là.
 *
 * Le service worker est enregistré en dernier, une fois l'application à
 * l'écran. Il sert au deuxième lancement, pas au premier ; le retarder évite de
 * disputer la bande passante aux fichiers dont l'affichage a besoin tout de
 * suite. Son enregistrement est confié à `MiseAJour`, qui surveille l'arrivée
 * d'une version et se charge de l'annoncer.
 */
(function () {

  async function quelPaquet(manifeste, reglages) {
    if (reglages.paquet !== 'complet') return 'noyau';
    try {
      return (await Paquets.complet(manifeste)) ? 'complet' : 'noyau';
    } catch (erreur) {
      return 'noyau';
    }
  }

  async function demarrer() {
    const ecran = document.getElementById('demarrage');

    let reglages;
    try {
      reglages = await Store.lireReglages();
    } catch (erreur) {
      // Un navigateur en navigation privée peut refuser IndexedDB. Ce n'est pas
      // une raison pour ne pas ouvrir le dictionnaire : on continue sans
      // mémoire, l'essentiel de l'application n'en a pas besoin.
      reglages = Object.assign({}, Store.DEFAUTS);
    }

    I18n.definir(reglages.langue || I18n.langueDuNavigateur());

    try {
      const reponse = await fetch('data/manifeste.json');
      if (!reponse.ok) throw new Error('manifeste : ' + reponse.status);
      const manifeste = await reponse.json();
      const paquet = await quelPaquet(manifeste, reglages);
      Lexique.etat.manifeste = manifeste;
      await Lexique.charger(paquet);

      // Le réglage suit ce qui est vraiment là, pas l'inverse.
      if (reglages.paquet !== paquet) {
        reglages.paquet = paquet;
        Store.ecrireReglage('paquet', paquet).catch(() => {});
      }

      App.brancher({ reglages, manifeste });
      ecran.classList.add('parti');
      setTimeout(() => { ecran.hidden = true; }, 300);
    } catch (erreur) {
      ecran.textContent = '';
      const message = document.createElement('p');
      message.textContent = I18n.t('demarrage.echec');
      ecran.appendChild(message);
      const detail = document.createElement('p');
      detail.className = 'discret';
      detail.textContent = String(erreur && erreur.message ? erreur.message : erreur);
      ecran.appendChild(detail);
      return;
    }

    if ('serviceWorker' in navigator) {
      /* Sans service worker l'application marche encore, simplement elle ne
       * survit pas à la coupure du réseau — c'est-à-dire qu'elle perd sa raison
       * d'être. Rien à dire à l'utilisateur, qui n'y peut rien et dont le
       * navigateur a ses raisons (page servie en http, navigation privée…),
       * mais l'échec doit laisser une trace dans la console : une panne
       * d'installation entièrement muette a déjà coûté une soirée. */
      navigator.serviceWorker.register('sw.js')
        .then((enregistrement) => MiseAJour.surveiller(enregistrement))
        .catch((erreur) => {
          console.warn('Wortschatz : service worker non installé —', erreur);
        });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', demarrer);
  } else {
    demarrer();
  }

})();
