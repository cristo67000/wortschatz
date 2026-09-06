'use strict';
/*
 * « Mes notes » — ce qu'on écrit soi-même sur un mot.
 *
 * ── Pourquoi elles ne vivent pas dans le dictionnaire ───────────────────────
 *
 * Un moyen mnémotechnique, une remarque de grammaire, la phrase où l'on a
 * rencontré le mot pour la première fois : rien de tout cela n'appartient au
 * dictionnaire, et tout cela vaut plus, pour celui qui l'écrit, que la
 * définition qu'il recopie. Une note est donc rangée à part, dans son propre
 * magasin, désignée par une référence :
 *
 *   dico:de Haus    une entrée du dictionnaire
 *   perso:p-1a2b3c  un mot qu'on a ajouté soi-même
 *
 * La conséquence est celle qu'on cherche : télécharger le dictionnaire complet,
 * le supprimer, en installer une version plus récente ne touche à aucune note.
 * Les paquets vont et viennent dans le cache du service worker ; les notes sont
 * dans IndexedDB et n'en sortent pas.
 *
 * Pour un mot personnel, la référence est l'identifiant, jamais la graphie :
 * corriger une faute de frappe dans « Baguet » ne perd pas la note.
 *
 * ── Ce qu'on écrit reste du texte ───────────────────────────────────────────
 *
 * Une note est affichée avec `textContent`, jamais avec `innerHTML`. Les sauts
 * de ligne sont rendus par la feuille de style (`white-space: pre-wrap`), et
 * non en fabriquant du balisage. Une note qui contiendrait « <b>x</b> » affiche
 * ces six signes ; rien de ce qu'on tape n'est jamais interprété.
 *
 * ── Ce qui se sauve tout seul ───────────────────────────────────────────────
 *
 * Le bouton « Enregistrer » existe, mais la note se sauve aussi d'elle-même
 * après une seconde d'inactivité. Perdre trois lignes écrites au clavier d'un
 * téléphone parce qu'on a refermé la fiche serait la seule faute impardonnable
 * de cette fonction.
 */
(function (racine) {

  const TEXTE_MAX = 4000;
  const REPOS = 1100;          // ms d'inactivité avant l'enregistrement silencieux

  function element(balise, classe, texte) {
    const noeud = document.createElement(balise);
    if (classe) noeud.className = classe;
    if (texte !== undefined && texte !== null) noeud.textContent = texte;
    return noeud;
  }

  /* La référence d'une entrée : ce sous quoi sa note est rangée.
   *
   * Elle accepte aussi bien une entrée complète qu'un simple `{langue, mot}` ou
   * `{perso}` — la séance n'a pas toujours l'entrée sous la main. */
  function idPour(entree) {
    if (!entree) return null;
    const uid = entree.perso || entree.uid || null;
    if (uid) return 'perso:' + uid;
    if (!entree.langue || !entree.mot) return null;
    return 'dico:' + entree.langue + ' ' + entree.mot;
  }

  /* Ce qu'on accepte d'écrire.
   *
   * Les sauts de ligne sont conservés — une note est faite pour tenir sur
   * plusieurs lignes. Le reste des signes de commande part : ils ne s'affichent
   * pas, se copient sans qu'on les voie, et n'ont rien à faire dans un fichier
   * d'export qu'on relira ailleurs. */
  function assainir(texte) {
    if (texte === undefined || texte === null) return '';
    return String(texte)
      .replace(/\r\n?/g, '\n')
      .replace(/[\u0000-\u0008\u000B-\u001F\u007F\u2028\u2029]/g, '')
      .slice(0, TEXTE_MAX)
      .replace(/[ \t]+$/gm, '')
      .replace(/\n{4,}/g, '\n\n\n')
      .trim();
  }

  async function lire(entree) {
    const id = idPour(entree);
    if (!id) return null;
    try {
      return (await Store.lireNote(id)) || null;
    } catch (erreur) {
      return null;
    }
  }

  /* Écrit, ou efface si le texte est vide : une note vide n'est pas une note. */
  async function ecrire(entree, texte) {
    const id = idPour(entree);
    if (!id) return null;
    const propre = assainir(texte);
    if (!propre) {
      await Store.supprimerNote(id).catch(() => {});
      return null;
    }
    const ancienne = await lire(entree);
    const maintenant = Date.now();
    const note = {
      id,
      cible: id.startsWith('perso:') ? 'perso' : 'dico',
      langue: entree.langue || (ancienne && ancienne.langue) || null,
      mot: entree.mot || (ancienne && ancienne.mot) || null,
      texte: propre,
      cree: (ancienne && ancienne.cree) || maintenant,
      modifie: maintenant,
    };
    await Store.ecrireNote(note);
    return note;
  }

  async function supprimer(entree) {
    const id = idPour(entree);
    if (!id) return;
    await Store.supprimerNote(id).catch(() => {});
  }

  /* Une note dont le mot a changé de graphie doit suivre : c'est la même note,
   * sur le même identifiant, et seul son étiquetage d'affichage bouge. */
  async function renommer(uid, langue, mot) {
    const id = 'perso:' + uid;
    const note = await Store.lireNote(id).catch(() => null);
    if (!note) return;
    note.langue = langue;
    note.mot = mot;
    await Store.ecrireNote(note).catch(() => {});
  }

  // ── Le bloc « Mes notes » d'une fiche ─────────────────────────────────────

  /* Trois états, un seul bloc :
   *
   *   vide      un bouton « Ajouter une note »
   *   écriture  une zone de saisie, « Enregistrer » et « Annuler »
   *   lue       le texte, « Modifier » et « Supprimer »
   *
   * `construire()` rend l'élément et se redessine tout seul ; l'appelant n'a
   * rien à rappeler.
   */
  function construire(entree) {
    const section = element('section', 'mes-notes');
    section.appendChild(element('h3', null, I18n.t('notes.titre')));
    const corps = element('div', 'note-corps');
    section.appendChild(corps);

    let note = null;
    let effacee = null;          // la note qu'on vient de supprimer, pour l'annuler
    let minuterie = null;

    function vider() {
      corps.textContent = '';
    }

    function marquer(cle) {
      const etat = corps.querySelector('.note-etat');
      if (etat) etat.textContent = cle ? I18n.t(cle) : '';
    }

    function dessinerVide() {
      vider();
      if (effacee) {
        const ligne = element('p', 'note-retrait');
        ligne.appendChild(element('span', null, I18n.t('notes.supprimee')));
        const annuler = element('button', 'lien-discret', I18n.t('notes.annuler-suppression'));
        annuler.type = 'button';
        annuler.addEventListener('click', async () => {
          await Store.ecrireNote(effacee).catch(() => {});
          note = effacee;
          effacee = null;
          dessinerLue();
        });
        ligne.appendChild(annuler);
        corps.appendChild(ligne);
      } else {
        corps.appendChild(element('p', 'discret', I18n.t('notes.vide')));
      }
      const ajouter = element('button', 'bouton-discret', I18n.t('notes.ajouter'));
      ajouter.type = 'button';
      ajouter.addEventListener('click', () => dessinerEcriture(''));
      corps.appendChild(ajouter);
    }

    function dessinerLue() {
      vider();
      const texte = element('p', 'note-texte', note.texte);
      corps.appendChild(texte);
      const boutons = element('div', 'ligne-boutons');
      const modifier = element('button', 'bouton-discret', I18n.t('notes.modifier'));
      modifier.type = 'button';
      modifier.addEventListener('click', () => dessinerEcriture(note.texte));
      const supprimer_ = element('button', 'lien-discret', I18n.t('notes.supprimer'));
      supprimer_.type = 'button';
      supprimer_.addEventListener('click', async () => {
        effacee = note;
        note = null;
        await supprimer(entree);
        dessinerVide();
        const annuler = corps.querySelector('.lien-discret');
        if (annuler) annuler.focus();
      });
      boutons.appendChild(modifier);
      boutons.appendChild(supprimer_);
      corps.appendChild(boutons);
    }

    function dessinerEcriture(valeur) {
      vider();
      effacee = null;
      const zone = element('textarea', 'note-saisie');
      zone.value = valeur || '';
      zone.rows = 4;
      zone.maxLength = TEXTE_MAX;
      zone.setAttribute('aria-label', I18n.t('notes.titre'));
      zone.placeholder = I18n.t('notes.exemple');
      corps.appendChild(zone);

      const boutons = element('div', 'ligne-boutons');
      const enregistrer = element('button', 'bouton-principal', I18n.t('notes.enregistrer'));
      enregistrer.type = 'button';
      const annuler = element('button', 'bouton-discret', I18n.t('notes.annuler'));
      annuler.type = 'button';
      boutons.appendChild(enregistrer);
      boutons.appendChild(annuler);
      corps.appendChild(boutons);
      corps.appendChild(element('span', 'note-etat discret', ''));

      async function sauver(silencieux) {
        if (minuterie) { clearTimeout(minuterie); minuterie = null; }
        note = await ecrire(entree, zone.value);
        if (silencieux) {
          marquer(note ? 'notes.enregistree' : null);
          return;
        }
        if (note) dessinerLue(); else dessinerVide();
      }

      /* L'enregistrement silencieux. Il ne remplace pas le bouton — il évite
       * seulement de perdre ce qui est écrit quand la fiche se referme d'un
       * geste de côté, ce qui arrive au téléphone plus souvent qu'ailleurs. */
      zone.addEventListener('input', () => {
        if (minuterie) clearTimeout(minuterie);
        marquer(null);
        minuterie = setTimeout(() => sauver(true), REPOS);
      });
      zone.addEventListener('blur', () => sauver(true));

      enregistrer.addEventListener('click', () => sauver(false));
      annuler.addEventListener('click', () => {
        if (minuterie) { clearTimeout(minuterie); minuterie = null; }
        if (note) dessinerLue(); else dessinerVide();
      });
      zone.focus();
    }

    lire(entree).then((trouvee) => {
      note = trouvee;
      if (note) dessinerLue(); else dessinerVide();
    }).catch(() => dessinerVide());

    return section;
  }

  /* Le rappel d'une note pendant une révision.
   *
   * Il n'est fabriqué qu'après la réponse — une note contient souvent le moyen
   * de retrouver le mot, c'est-à-dire la réponse elle-même, et l'afficher avant
   * viderait la question de son sens. `seance.js` ne l'appelle donc que depuis
   * le verdict. Renvoie null s'il n'y a pas de note : une section vide n'a rien
   * à dire. */
  async function rappel(entree) {
    const note = await lire(entree);
    if (!note || !note.texte) return null;
    const bloc = element('div', 'rappel-note');
    bloc.appendChild(element('span', 'rappel-note-titre', I18n.t('notes.titre')));
    bloc.appendChild(element('p', 'note-texte', note.texte));
    return bloc;
  }

  racine.Notes = {
    idPour, assainir, lire, ecrire, supprimer, renommer,
    construire, rappel,
    TEXTE_MAX,
  };

})(window);
