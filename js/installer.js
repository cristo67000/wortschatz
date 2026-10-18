'use strict';
/*
 * Installer l'application, et la partager.
 *
 * ── Installer ──────────────────────────────────────────────────────────────
 *
 * Une application web installable l'est déjà techniquement — le navigateur
 * propose « Ajouter à l'écran d'accueil » quelque part dans son menu. Encore
 * faut-il le savoir : la plupart des gens ne l'ont jamais remarqué, et une
 * application consultée dans un onglet perd tout ce qui fait son intérêt ici,
 * l'icône sur l'écran d'accueil et le fonctionnement hors ligne.
 *
 * D'où un bouton explicite, dans les Réglages et sur une carte de l'accueil
 * des téléphones. Mais une application web n'a pas de « version d'Android » :
 * c'est le navigateur qui, au moment de l'installation, fabrique pour elle une
 * petite application Android (un « WebAPK »). Les cas diffèrent vraiment :
 *
 *   Chrome            le WebAPK est fabriqué et signé par Google, pour une
 *                     version d'Android récente : Play Protect l'accepte.
 *                     `beforeinstallprompt` est émis ; on le retient et on le
 *                     déclenche au clic. Installation en un geste.
 *   Samsung Internet  le WebAPK est fabriqué par le serveur de Samsung, qui
 *                     déclare une version d'Android ancienne (targetSdk trop
 *                     bas) : depuis Android 14, Play Protect le bloque —
 *                     « Appli non sécurisée bloquée… conçue pour une version
 *                     plus ancienne d'Android ». Défaut connu, non corrigé par
 *                     Samsung (SamsungInternet/support, ticket 123, 2026).
 *                     On ne déclenche donc JAMAIS l'installation de Samsung
 *                     Internet : on propose d'ouvrir Wortschatz dans Chrome
 *                     (lien d'intention Android), ou, à défaut, un simple
 *                     raccourci sur l'écran d'accueil.
 *   autre Android     l'invite du navigateur est gardée, Chrome conseillé.
 *   iOS, Safari       l'événement n'existe pas, et rien ne permet de
 *                     déclencher l'installation par programme. Reste à
 *                     expliquer le geste : Partager, puis « Sur l'écran
 *                     d'accueil ».
 *   déjà installée    on n'affiche rien du tout.
 *
 * ── Partager ───────────────────────────────────────────────────────────────
 *
 * `navigator.share` ouvre la feuille de partage du système — messages, courriel,
 * ce que la personne utilise. Là où elle manque (la plupart des navigateurs de
 * bureau), on copie l'adresse dans le presse-papiers, et on le dit.
 */
(function (racine) {

  const ADRESSE = 'https://cristo67000.github.io/wortschatz/';
  const PLAY_CHROME = 'https://play.google.com/store/apps/details?id=com.android.chrome';
  /* La carte de l'accueil, une fois refermée, revient au bout d'un mois.
   * Préférence de cet appareil seulement : elle n'a pas sa place dans une
   * sauvegarde, d'où localStorage plutôt que la base. */
  const CLE_CARTE = 'wortschatz-carte-installation';
  const UN_MOIS = 30 * 86400000;

  let invite = null;          // l'événement beforeinstallprompt retenu
  let elements = {};

  function element(balise, classe, texte) {
    const noeud = document.createElement(balise);
    if (classe) noeud.className = classe;
    if (texte !== undefined && texte !== null) noeud.textContent = texte;
    return noeud;
  }

  function estInstallee() {
    return racine.matchMedia('(display-mode: standalone)').matches
      || racine.navigator.standalone === true;
  }

  function estApple() {
    // iPadOS 13+ se présente comme un Mac ; le point tactile le trahit.
    const ua = racine.navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua)
      || (/Macintosh/.test(ua) && racine.navigator.maxTouchPoints > 1);
  }

  /* Le navigateur, pour l'installation : 'chrome', 'samsung', 'android' (un
   * autre navigateur Android), 'apple' ou 'autre' (ordinateur). */
  function navigateur() {
    const ua = racine.navigator.userAgent;
    if (estApple()) return 'apple';
    if (!/Android/i.test(ua)) return 'autre';
    if (/SamsungBrowser/i.test(ua)) return 'samsung';
    if (/MiuiBrowser|HuaweiBrowser|HeyTapBrowser|OppoBrowser|VivoBrowser|UCBrowser|YaBrowser|OPR\/|Opera|EdgA|Firefox|DuckDuckGo|Brave|; wv\)/i.test(ua)) return 'android';
    return /Chrome\/\d/.test(ua) ? 'chrome' : 'android';
  }

  /* Un lien qui rouvre la page dans Chrome (intention Android) ; sans Chrome,
   * le Play Store propose de l'installer. */
  function lienChrome() {
    const schema = racine.location.protocol.replace(':', '');
    return 'intent://' + racine.location.host + racine.location.pathname
      + '#Intent;scheme=' + schema + ';package=com.android.chrome;S.browser_fallback_url='
      + encodeURIComponent(PLAY_CHROME) + ';end';
  }

  function lien(classe, texte, adresse) {
    const a = element('a', classe, texte);
    a.href = adresse;
    return a;
  }

  /* Chrome émet `beforeinstallprompt` très tôt, souvent avant que
   * l'application n'ait fini de s'installer elle-même. On l'écoute donc dès le
   * chargement du fichier, sans attendre que l'interface soit prête. */
  racine.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    // Samsung Internet : son installation est bloquée par Play Protect.
    if (navigateur() === 'samsung') { invite = null; return; }
    invite = e;
    dessiner();
  });

  racine.addEventListener('appinstalled', () => {
    invite = null;
    dessiner();
  });

  // ── Installation ──────────────────────────────────────────────────────────

  function etapes(cles) {
    const marche = element('ol', 'marche-a-suivre');
    for (const cle of cles) marche.appendChild(element('li', null, I18n.t(cle)));
    return marche;
  }

  /* Le contenu du bloc d'installation, selon le navigateur. Renvoie null s'il
   * n'y a rien à proposer. `compact` : pour la carte de l'accueil. */
  function contenu(compact) {
    if (estInstallee()) return null;
    const nav = navigateur();
    const boite = element('div', 'installation');

    if (nav === 'samsung') {
      const p = element('p');
      p.appendChild(element('strong', null, I18n.t('reglages.installer.samsung.titre')));
      p.appendChild(document.createTextNode(' ' + I18n.t('reglages.installer.samsung')));
      boite.appendChild(p);
      boite.appendChild(lien('bouton-principal', I18n.t('reglages.installer.chrome.ouvrir'), lienChrome()));
      if (!compact) {
        boite.appendChild(element('p', 'discret', I18n.t('reglages.installer.samsung.puis')));
        boite.appendChild(element('p', 'discret', I18n.t('reglages.installer.samsung.sans')));
      }
      return boite;
    }

    if (invite) {
      const bouton = element('button', 'bouton-principal', I18n.t('reglages.installer.bouton'));
      bouton.type = 'button';
      bouton.addEventListener('click', async () => {
        bouton.disabled = true;
        try {
          invite.prompt();
          const choix = await invite.userChoice;
          if (choix && choix.outcome === 'accepted') invite = null;
        } catch (erreur) {
          /* L'invite ne peut servir qu'une fois ; si elle a expiré, on la
           * relâche et le navigateur en émettra une autre au besoin. */
          invite = null;
        }
        dessiner();
      });
      boite.appendChild(bouton);
      if (nav === 'android' && !compact) {
        const p = element('p', 'discret', I18n.t('reglages.installer.play-protect'));
        p.appendChild(lien(null, I18n.t('reglages.installer.play-protect.lien'), lienChrome()));
        p.appendChild(document.createTextNode('.'));
        boite.appendChild(p);
      }
      return boite;
    }

    if (nav === 'apple') {
      boite.appendChild(etapes(['reglages.installer.ios.1', 'reglages.installer.ios.2',
                                'reglages.installer.ios.3']));
      return boite;
    }

    /* Chrome sans invite : il ne l'a pas encore émise, ou la personne l'a
     * déjà refusée. Son menu, lui, sait toujours installer. */
    if (nav === 'chrome') {
      boite.appendChild(etapes(['reglages.installer.chrome.1', 'reglages.installer.chrome.2']));
      return boite;
    }

    if (nav === 'android') {
      boite.appendChild(element('p', null, I18n.t('reglages.installer.android')));
      boite.appendChild(lien('bouton-principal', I18n.t('reglages.installer.chrome.ouvrir'), lienChrome()));
      return boite;
    }

    /* Ordinateur sans invite : soit le navigateur ne sait pas installer, soit
     * il l'a déjà proposé et l'utilisateur a refusé. Rien à dire d'utile — on
     * se tait plutôt que d'afficher une consigne qui ne mènerait nulle part. */
    return null;
  }

  function dessinerInstallation() {
    const bloc = elements.blocInstaller;
    const zone = elements.zoneInstaller;
    if (!bloc || !zone) return;
    zone.textContent = '';
    const c = contenu(false);
    bloc.hidden = !c;
    if (c) zone.appendChild(c);
  }

  function carteRefermee() {
    try {
      const quand = Number(racine.localStorage.getItem(CLE_CARTE));
      return quand > 0 && Date.now() - quand < UN_MOIS;
    } catch (erreur) {
      return false;   // stockage refusé (navigation privée) : la carte reste
    }
  }

  /* La carte de l'accueil : seulement sur téléphone, refermable. */
  function dessinerCarte() {
    const carte = elements.carte;
    if (!carte) return;
    carte.textContent = '';
    const c = navigateur() !== 'autre' && !carteRefermee() ? contenu(true) : null;
    carte.hidden = !c;
    if (!c) return;
    const entete = element('div', 'entete-installation');
    const textes = element('div');
    textes.appendChild(element('p', 'carte-installation-titre', I18n.t('reglages.installer.carte.titre')));
    textes.appendChild(element('p', 'discret', I18n.t('reglages.installer.carte.texte')));
    entete.appendChild(textes);
    const fermer = element('button', 'carte-installation-fermer', '✕');
    fermer.type = 'button';
    fermer.setAttribute('aria-label', I18n.t('reglages.installer.carte.masquer'));
    fermer.addEventListener('click', () => {
      try { racine.localStorage.setItem(CLE_CARTE, String(Date.now())); } catch (erreur) { /* rien */ }
      carte.hidden = true;
      carte.textContent = '';
    });
    entete.appendChild(fermer);
    carte.appendChild(entete);
    carte.appendChild(c);
  }

  // ── Partage ───────────────────────────────────────────────────────────────

  function dessinerPartage() {
    const zone = elements.zonePartager;
    if (!zone) return;
    zone.textContent = '';

    const bouton = element('button', 'bouton-discret', I18n.t('reglages.partager.bouton'));
    bouton.type = 'button';
    const retour = element('p', 'discret retour-partage', '');
    retour.hidden = true;

    bouton.addEventListener('click', async () => {
      const contenu = {
        title: I18n.t('app.nom'),
        text: I18n.t('reglages.partager.texte'),
        url: ADRESSE,
      };
      if (racine.navigator.share) {
        try {
          await racine.navigator.share(contenu);
          return;
        } catch (erreur) {
          // Partage annulé : ce n'est pas une erreur, on ne dit rien.
          if (erreur && erreur.name === 'AbortError') return;
        }
      }
      try {
        await racine.navigator.clipboard.writeText(ADRESSE);
        retour.textContent = I18n.t('reglages.partager.copie');
      } catch (erreur) {
        retour.textContent = ADRESSE;
      }
      retour.hidden = false;
    });

    zone.appendChild(bouton);
    zone.appendChild(element('p', 'adresse-partage', ADRESSE));
    zone.appendChild(retour);
  }

  function dessiner() {
    dessinerInstallation();
    dessinerCarte();
    dessinerPartage();
  }

  function brancher() {
    elements = {
      blocInstaller: document.getElementById('bloc-installer'),
      zoneInstaller: document.getElementById('zone-installer'),
      zonePartager: document.getElementById('zone-partager'),
      carte: document.getElementById('carte-installation'),
    };
    dessiner();
    document.addEventListener('langue-changee', dessiner);
  }

  racine.Installer = { brancher, dessiner, estInstallee, estApple, navigateur, lienChrome, ADRESSE };

})(window);
