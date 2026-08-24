'use strict';
/*
 * Textes de l'interface, en français et en allemand.
 *
 * L'application s'adresse aux deux publics : un francophone qui apprend
 * l'allemand, et un germanophone qui apprend le français. La langue de
 * l'interface est donc un réglage à part entière, sans rapport avec le sens de
 * traduction — on peut très bien chercher un mot allemand dans une interface
 * allemande.
 *
 * Dans le HTML, un élément porte `data-t="clé"` pour son contenu, `data-t-ph`
 * pour son texte indicatif, `data-t-aria` pour son étiquette d'accessibilité.
 * `I18n.appliquer()` repasse sur tout le document à chaque changement de
 * langue : aucune chaîne n'est écrite en dur dans le HTML.
 *
 * Une clé absente est renvoyée telle quelle, bien visible entre chevrons :
 * mieux vaut un texte laid qu'un bouton vide.
 */
(function (racine) {

  const TEXTES = {

    fr: {
      'app.nom': 'Wortschatz',
      'app.sous-titre': 'français ⇄ allemand',

      'onglet.chercher': 'Chercher',
      'onglet.reviser': 'Réviser',
      'onglet.progres': 'Progrès',
      'onglet.reglages': 'Réglages',

      'chercher.champ': 'Un mot ou une expression…',
      'chercher.aria': 'Chercher un mot en français ou en allemand',
      'chercher.vider': 'Effacer la recherche',
      'chercher.rien': 'Aucun mot ne commence ainsi.',
      'chercher.rien.conseil': 'Vérifiez l’orthographe, ou téléchargez le dictionnaire complet dans les Réglages.',
      'chercher.rien.complet': 'Vérifiez l’orthographe : le dictionnaire complet est déjà installé.',
      'chercher.accueil.titre': 'Cherchez dans les deux langues à la fois',
      'chercher.accueil.texte': 'Tapez en français ou en allemand : les deux dictionnaires répondent ensemble. Tout fonctionne sans réseau.',
      'chercher.essayez': 'Essayez',
      'chercher.resultats': 'Résultats',
      'chercher.via': 'forme de',
      'chercher.expressions': 'Expressions contenant ce mot',

      'fiche.fermer': 'Fermer',
      'fiche.ecouter': 'Écouter',
      'fiche.apprendre': 'Apprendre ce mot',
      'fiche.appris': 'Dans mes révisions',
      'fiche.retirer': 'Retirer de mes révisions',
      'fiche.formes': 'Formes :',
      'fiche.exemples': 'En contexte',
      'fiche.autour': 'Autour de ce mot',
      'fiche.autour.note': 'Mots de forme voisine, rapprochés automatiquement — un voisinage utile, pas une filiation établie.',
      'fiche.definition': 'Définition',
      'fiche.traductions': 'Traductions',
      'fiche.sens': 'Sens',
      'fiche.aucune-voix': 'Aucune voix installée pour cette langue sur cet appareil.',

      'langue.de': 'allemand',
      'langue.fr': 'français',
      'langue.de.court': 'DE',
      'langue.fr.court': 'FR',

      'bande.0': 'Premiers pas',
      'bande.1': 'Courant',
      'bande.2': 'Étendu',
      'bande.3': 'Rare',
      'bande.explication': 'Rang d’usage constaté dans un corpus de phrases réelles.',

      'genre.masc': 'masculin',
      'genre.fem': 'féminin',
      'genre.neut': 'neutre',

      'nature.n': 'nom',
      'nature.pn': 'nom propre',
      'nature.v': 'verbe',
      'nature.adj': 'adjectif',
      'nature.adv': 'adverbe',
      'nature.preposition': 'préposition',
      'nature.postposition': 'postposition',
      'nature.conjunction': 'conjonction',
      'nature.interjection': 'interjection',
      'nature.numeral': 'numéral',
      'nature.article': 'article',
      'nature.particle': 'particule',
      'nature.letter': 'lettre',
      'nature.abbreviation': 'abréviation',
      'nature.suffix': 'suffixe',
      'nature.prefix': 'préfixe',
      'nature.indefinitePronoun': 'pronom indéfini',
      'nature.demonstrativePronoun': 'pronom démonstratif',
      'nature.pronominalAdverb': 'adverbe pronominal',

      'reglages.titre': 'Réglages',
      'reglages.interface': 'Langue de l’interface',
      'reglages.dictionnaire': 'Dictionnaire',
      'reglages.dictionnaire.noyau': 'Noyau installé — {n} mots',
      'reglages.dictionnaire.complet': 'Dictionnaire complet installé — {n} mots',
      'reglages.telecharger': 'Télécharger le dictionnaire complet ({taille})',
      'reglages.telecharger.detail': 'Ajoute {n} mots, la reconnaissance des formes conjuguées et déclinées, et toutes les expressions. Se fait une seule fois ; ensuite tout reste sur l’appareil.',
      'reglages.telechargement': 'Téléchargement…',
      'reglages.telechargement.fini': 'Dictionnaire complet installé.',
      'reglages.telechargement.echec': 'Le téléchargement a échoué. Le noyau reste utilisable ; vous pouvez réessayer.',
      'reglages.telechargement.arreter': 'Arrêter',
      'reglages.supprimer': 'Supprimer le dictionnaire complet',
      'reglages.supprimer.confirme': 'Supprimer les {taille} du dictionnaire complet ? Le noyau restera installé et vos révisions ne seront pas touchées.',
      'reglages.installer': 'Installer sur cet appareil',
      'reglages.installer.detail': 'Installée, l’application a son icône sur l’écran d’accueil, s’ouvre sans barre d’adresse et fonctionne sans réseau.',
      'reglages.installer.bouton': 'Installer Wortschatz',
      'reglages.installer.ios.1': 'Touchez le bouton Partager, en bas de Safari.',
      'reglages.installer.ios.2': 'Faites défiler, puis touchez « Sur l’écran d’accueil ».',
      'reglages.installer.ios.3': 'Confirmez par « Ajouter ».',
      'reglages.partager': 'Partager',
      'reglages.partager.detail': 'L’application est gratuite, sans compte et sans publicité. Ce lien suffit pour l’installer.',
      'reglages.partager.bouton': 'Partager le lien',
      'reglages.partager.texte': 'Dictionnaire français ⇄ allemand hors ligne, avec des exercices de mémorisation. Gratuit, sans compte.',
      'reglages.partager.copie': 'Adresse copiée.',
      'reglages.rythme': 'Rythme',
      'reglages.rythme.nouveautes': 'Nouveaux mots par jour',
      'reglages.rythme.note': 'Dix par jour font trois mille par an, et demandent une dizaine de minutes. Mieux vaut peu tous les jours que beaucoup une fois par semaine : c’est l’espacement qui fait tenir, pas la quantité.',
      'reglages.exigence': 'Exigence',
      'reglages.exigence.article': 'Exiger l’article des noms',
      'reglages.exigence.note': 'Une fois le mot écrit juste, la question monte d’un cran : il faut le retrouver avec son article — « die Bohne », et non « Bohne ». Un nom su sans son genre ne se laisse pas employer.',
      'reglages.voix': 'Prononciation',
      'reglages.voix.active': 'Lire les mots à voix haute',
      'reglages.apropos': 'À propos',
      'maj.prete': 'Une nouvelle version est prête.',
      'maj.bouton': 'Mettre à jour',
      'maj.plus-tard': 'Plus tard',
      'maj.verifier': 'Vérifier les mises à jour',
      'maj.recherche': 'Recherche…',
      'maj.etat.prete': 'Une nouvelle version est prête.',
      'maj.etat.en-cours': 'La nouvelle version se télécharge…',
      'maj.etat.a-jour': 'Vous avez la dernière version.',
      'maj.etat.trop-tot': 'Vérifié à l’instant.',
      'maj.etat.echec': 'Vérification impossible — sans réseau, il n’y a rien à chercher.',
      'maj.etat.sans-service-worker': 'Ce navigateur ne garde pas l’application hors ligne : il charge toujours la dernière version.',
      'reglages.sources': 'Origine des données',
      'reglages.confidentialite': 'Confidentialité',

      'commun.oui': 'Oui',
      'commun.non': 'Non',
      'commun.annuler': 'Annuler',
      'commun.fermer': 'Fermer',
      'commun.chargement': 'Chargement…',
      'commun.erreur': 'Quelque chose n’a pas fonctionné.',

      'reviser.titre': 'Réviser',
      'reviser.commencer': 'Commencer la séance',
      'reviser.arreter': 'Arrêter',
      'reviser.compteur.dues': 'à revoir',
      'reviser.compteur.nouvelles': 'nouveaux',
      'reviser.compteur.total': 'mots suivis',
      'reviser.vide.texte': 'Vous n’apprenez encore aucun mot. Cherchez-en un, puis touchez « Apprendre ce mot » sur sa fiche : il reviendra ici aux bons moments pour ne plus s’oublier.',
      'reviser.vide.bouton': 'Chercher un mot',
      'reviser.rien-du-jour': 'Rien à revoir pour l’instant. Revenez plus tard, ou ajoutez de nouveaux mots depuis une fiche.',
      'reviser.bilan.titre': 'Séance terminée',
      'reviser.bilan.justes': 'justes',
      'reviser.bilan.presque': 'presque',
      'reviser.bilan.faux': 'ratés',
      'reviser.bilan.mots': '{n} mots travaillés.',
      'reviser.bilan.mots.un': '1 mot travaillé.',
      'reviser.bilan.continuer': 'Continuer',
      'reviser.bilan.terminer': 'Terminer',

      'exercice.consigne.qcm-comprendre': 'Que veut dire ce mot ?',
      'exercice.consigne.qcm-produire': 'Comment le dit-on en {langue} ?',
      'exercice.consigne.saisie': 'Écrivez-le en {langue}.',
      'exercice.consigne.saisie-article': 'Écrivez-le en {langue}, avec son article.',
      'exercice.consigne.genre': 'Der, die ou das ?',
      'exercice.consigne.trou': 'Complétez la phrase.',
      'exercice.consigne.paire-phrase': 'Quelle est la traduction ?',
      'exercice.consigne.ecoute': 'Écoutez, puis écrivez le mot.',
      'exercice.valider': 'Valider',
      'exercice.je-ne-sais-pas': 'Je ne sais pas',
      'exercice.saisie.aria': 'Votre réponse',
      'exercice.juste': 'Juste.',
      'exercice.presque': 'Presque : {reponse}',
      'exercice.faux': 'C’était : {reponse}',
      'exercice.suivant': 'Suivant',
      'exercice.facile': 'C’était facile',
      'exercice.voir-fiche': 'Voir la fiche',
      'exercice.remarque.majuscule': 'En allemand, les noms prennent une majuscule : {mot}.',
      'exercice.remarque.accents': 'Attention aux accents : {mot}.',
      'exercice.remarque.article-manque': 'Il manque l’article : {mot}.',
      'exercice.remarque.article-forme': 'On apprend le nom sous cette forme : {mot}.',
      'exercice.remarque.article-faux': 'Le mot est juste ; c’est l’article qui ne l’est pas.',

      'progres.titre': 'Progrès',
      'progres.suivis': 'mots suivis',
      'progres.produits': 'sus par cœur',
      'progres.reconnus': 'en cours',
      'progres.nouveaux': 'pas encore vus',
      'progres.serie': '{n} jours d’affilée',
      'progres.serie.un': '1 jour d’affilée',
      'progres.explication': '« Sus par cœur » compte les mots que vous avez su écrire, pas seulement reconnaître — c’est la seule mesure qui ne se flatte pas.',
      'progres.difficiles': 'Les plus rétifs',
      'progres.vide': 'Rien à montrer tant qu’aucune séance n’a eu lieu.',
      'progres.semaine': 'Ces sept derniers jours',
      'progres.reponses': '{n} réponses',
      'progres.reponses.un': '1 réponse',

      'demarrage.chargement': 'Ouverture du dictionnaire…',
      'demarrage.echec': 'Le dictionnaire n’a pas pu être ouvert. Rechargez la page.',
    },

    de: {
      'app.nom': 'Wortschatz',
      'app.sous-titre': 'Französisch ⇄ Deutsch',

      'onglet.chercher': 'Suchen',
      'onglet.reviser': 'Üben',
      'onglet.progres': 'Fortschritt',
      'onglet.reglages': 'Einstellungen',

      'chercher.champ': 'Ein Wort oder ein Ausdruck…',
      'chercher.aria': 'Ein deutsches oder französisches Wort suchen',
      'chercher.vider': 'Suche löschen',
      'chercher.rien': 'Kein Wort beginnt so.',
      'chercher.rien.conseil': 'Prüfen Sie die Schreibweise, oder laden Sie in den Einstellungen das vollständige Wörterbuch.',
      'chercher.rien.complet': 'Prüfen Sie die Schreibweise: das vollständige Wörterbuch ist bereits installiert.',
      'chercher.accueil.titre': 'In beiden Sprachen zugleich suchen',
      'chercher.accueil.texte': 'Tippen Sie deutsch oder französisch: beide Wörterbücher antworten gemeinsam. Alles läuft ohne Netz.',
      'chercher.essayez': 'Probieren Sie',
      'chercher.resultats': 'Treffer',
      'chercher.via': 'Form von',
      'chercher.expressions': 'Wendungen mit diesem Wort',

      'fiche.fermer': 'Schließen',
      'fiche.ecouter': 'Anhören',
      'fiche.apprendre': 'Dieses Wort lernen',
      'fiche.appris': 'In meinen Wiederholungen',
      'fiche.retirer': 'Aus den Wiederholungen nehmen',
      'fiche.formes': 'Formen:',
      'fiche.exemples': 'Im Satz',
      'fiche.autour': 'Rund um dieses Wort',
      'fiche.autour.note': 'Formverwandte Wörter, automatisch zusammengestellt — eine nützliche Nachbarschaft, keine belegte Verwandtschaft.',
      'fiche.definition': 'Definition',
      'fiche.traductions': 'Übersetzungen',
      'fiche.sens': 'Bedeutung',
      'fiche.aucune-voix': 'Für diese Sprache ist auf diesem Gerät keine Stimme installiert.',

      'langue.de': 'Deutsch',
      'langue.fr': 'Französisch',
      'langue.de.court': 'DE',
      'langue.fr.court': 'FR',

      'bande.0': 'Erste Schritte',
      'bande.1': 'Gebräuchlich',
      'bande.2': 'Erweitert',
      'bande.3': 'Selten',
      'bande.explication': 'Gebrauchsrang, gemessen an einem Korpus echter Sätze.',

      'genre.masc': 'männlich',
      'genre.fem': 'weiblich',
      'genre.neut': 'sächlich',

      'nature.n': 'Substantiv',
      'nature.pn': 'Eigenname',
      'nature.v': 'Verb',
      'nature.adj': 'Adjektiv',
      'nature.adv': 'Adverb',
      'nature.preposition': 'Präposition',
      'nature.postposition': 'Postposition',
      'nature.conjunction': 'Konjunktion',
      'nature.interjection': 'Interjektion',
      'nature.numeral': 'Zahlwort',
      'nature.article': 'Artikel',
      'nature.particle': 'Partikel',
      'nature.letter': 'Buchstabe',
      'nature.abbreviation': 'Abkürzung',
      'nature.suffix': 'Suffix',
      'nature.prefix': 'Präfix',
      'nature.indefinitePronoun': 'Indefinitpronomen',
      'nature.demonstrativePronoun': 'Demonstrativpronomen',
      'nature.pronominalAdverb': 'Pronominaladverb',

      'reglages.titre': 'Einstellungen',
      'reglages.interface': 'Sprache der Oberfläche',
      'reglages.dictionnaire': 'Wörterbuch',
      'reglages.dictionnaire.noyau': 'Grundwortschatz installiert — {n} Wörter',
      'reglages.dictionnaire.complet': 'Vollständiges Wörterbuch installiert — {n} Wörter',
      'reglages.telecharger': 'Vollständiges Wörterbuch laden ({taille})',
      'reglages.telecharger.detail': 'Fügt {n} Wörter hinzu, dazu das Erkennen gebeugter Formen und sämtliche Wendungen. Einmalig; danach bleibt alles auf dem Gerät.',
      'reglages.telechargement': 'Wird geladen…',
      'reglages.telechargement.fini': 'Vollständiges Wörterbuch installiert.',
      'reglages.telechargement.echec': 'Das Laden ist fehlgeschlagen. Der Grundwortschatz bleibt nutzbar; Sie können es erneut versuchen.',
      'reglages.telechargement.arreter': 'Abbrechen',
      'reglages.supprimer': 'Vollständiges Wörterbuch löschen',
      'reglages.supprimer.confirme': 'Die {taille} des vollständigen Wörterbuchs löschen? Der Grundwortschatz bleibt installiert, Ihre Wiederholungen bleiben unberührt.',
      'reglages.installer': 'Auf diesem Gerät installieren',
      'reglages.installer.detail': 'Installiert hat die App ein Symbol auf dem Startbildschirm, öffnet ohne Adressleiste und läuft ohne Netz.',
      'reglages.installer.bouton': 'Wortschatz installieren',
      'reglages.installer.ios.1': 'Tippen Sie unten in Safari auf „Teilen“.',
      'reglages.installer.ios.2': 'Blättern Sie nach unten und tippen Sie auf „Zum Home-Bildschirm“.',
      'reglages.installer.ios.3': 'Bestätigen Sie mit „Hinzufügen“.',
      'reglages.partager': 'Teilen',
      'reglages.partager.detail': 'Die App ist kostenlos, ohne Konto und ohne Werbung. Dieser Link genügt zur Installation.',
      'reglages.partager.bouton': 'Link teilen',
      'reglages.partager.texte': 'Offline-Wörterbuch Französisch ⇄ Deutsch mit Vokabeltraining. Kostenlos, ohne Konto.',
      'reglages.partager.copie': 'Adresse kopiert.',
      'reglages.rythme': 'Tempo',
      'reglages.rythme.nouveautes': 'Neue Wörter pro Tag',
      'reglages.rythme.note': 'Zehn pro Tag sind dreitausend im Jahr und kosten etwa zehn Minuten. Wenig jeden Tag bringt mehr als viel einmal pro Woche: es ist der Abstand, der hält, nicht die Menge.',
      'reglages.exigence': 'Anspruch',
      'reglages.exigence.article': 'Bei Substantiven den Artikel verlangen',
      'reglages.exigence.note': 'Sitzt das Wort einmal, wird die Frage eine Stufe schwerer: es will mit Artikel geschrieben sein — „une abeille“, nicht „abeille“. Ein Substantiv ohne sein Geschlecht lässt sich nicht gebrauchen.',
      'reglages.voix': 'Aussprache',
      'reglages.voix.active': 'Wörter vorlesen',
      'reglages.apropos': 'Über',
      'maj.prete': 'Eine neue Version steht bereit.',
      'maj.bouton': 'Aktualisieren',
      'maj.plus-tard': 'Später',
      'maj.verifier': 'Nach Updates suchen',
      'maj.recherche': 'Wird gesucht…',
      'maj.etat.prete': 'Eine neue Version steht bereit.',
      'maj.etat.en-cours': 'Die neue Version wird geladen…',
      'maj.etat.a-jour': 'Sie haben die neueste Version.',
      'maj.etat.trop-tot': 'Gerade eben geprüft.',
      'maj.etat.echec': 'Prüfen nicht möglich — ohne Netz gibt es nichts zu holen.',
      'maj.etat.sans-service-worker': 'Dieser Browser hält die App nicht offline vor: er lädt stets die neueste Version.',
      'reglages.sources': 'Herkunft der Daten',
      'reglages.confidentialite': 'Datenschutz',

      'commun.oui': 'Ja',
      'commun.non': 'Nein',
      'commun.annuler': 'Abbrechen',
      'commun.fermer': 'Schließen',
      'commun.chargement': 'Wird geladen…',
      'commun.erreur': 'Etwas hat nicht funktioniert.',

      'reviser.titre': 'Üben',
      'reviser.commencer': 'Übung beginnen',
      'reviser.arreter': 'Abbrechen',
      'reviser.compteur.dues': 'fällig',
      'reviser.compteur.nouvelles': 'neu',
      'reviser.compteur.total': 'Wörter im Plan',
      'reviser.vide.texte': 'Sie lernen noch kein Wort. Suchen Sie eines und tippen Sie auf seiner Karte auf « Dieses Wort lernen » — es kommt dann zum richtigen Zeitpunkt zurück, damit es nicht wieder verloren geht.',
      'reviser.vide.bouton': 'Ein Wort suchen',
      'reviser.rien-du-jour': 'Im Moment nichts zu wiederholen. Kommen Sie später wieder, oder nehmen Sie neue Wörter von einer Karte auf.',
      'reviser.bilan.titre': 'Übung beendet',
      'reviser.bilan.justes': 'richtig',
      'reviser.bilan.presque': 'fast',
      'reviser.bilan.faux': 'falsch',
      'reviser.bilan.mots': '{n} Wörter geübt.',
      'reviser.bilan.mots.un': '1 Wort geübt.',
      'reviser.bilan.continuer': 'Weiter',
      'reviser.bilan.terminer': 'Beenden',

      'exercice.consigne.qcm-comprendre': 'Was bedeutet dieses Wort?',
      'exercice.consigne.qcm-produire': 'Wie heißt das auf {langue}?',
      'exercice.consigne.saisie': 'Schreiben Sie es auf {langue}.',
      'exercice.consigne.saisie-article': 'Schreiben Sie es auf {langue}, mit Artikel.',
      'exercice.consigne.genre': 'Der, die oder das?',
      'exercice.consigne.trou': 'Ergänzen Sie den Satz.',
      'exercice.consigne.paire-phrase': 'Welche Übersetzung passt?',
      'exercice.consigne.ecoute': 'Hören Sie zu und schreiben Sie das Wort.',
      'exercice.valider': 'Prüfen',
      'exercice.je-ne-sais-pas': 'Weiß ich nicht',
      'exercice.saisie.aria': 'Ihre Antwort',
      'exercice.juste': 'Richtig.',
      'exercice.presque': 'Fast: {reponse}',
      'exercice.faux': 'Richtig wäre: {reponse}',
      'exercice.suivant': 'Weiter',
      'exercice.facile': 'War leicht',
      'exercice.voir-fiche': 'Karte ansehen',
      'exercice.remarque.majuscule': 'Im Deutschen werden Substantive großgeschrieben: {mot}.',
      'exercice.remarque.accents': 'Achten Sie auf die Akzente: {mot}.',
      'exercice.remarque.article-manque': 'Der Artikel fehlt: {mot}.',
      'exercice.remarque.article-forme': 'So lernt man das Substantiv: {mot}.',
      'exercice.remarque.article-faux': 'Das Wort stimmt, der Artikel nicht.',

      'progres.titre': 'Fortschritt',
      'progres.suivis': 'Wörter im Plan',
      'progres.produits': 'aktiv beherrscht',
      'progres.reconnus': 'im Aufbau',
      'progres.nouveaux': 'noch ungesehen',
      'progres.serie': '{n} Tage in Folge',
      'progres.serie.un': '1 Tag in Folge',
      'progres.explication': '« Aktiv beherrscht » zählt die Wörter, die Sie schreiben konnten — nicht nur wiedererkannt. Das ist das einzige Maß, das sich nicht selbst schmeichelt.',
      'progres.difficiles': 'Die hartnäckigsten',
      'progres.vide': 'Nichts zu zeigen, solange keine Übung stattgefunden hat.',
      'progres.semaine': 'Die letzten sieben Tage',
      'progres.reponses': '{n} Antworten',
      'progres.reponses.un': '1 Antwort',

      'demarrage.chargement': 'Wörterbuch wird geöffnet…',
      'demarrage.echec': 'Das Wörterbuch konnte nicht geöffnet werden. Laden Sie die Seite neu.',
    },
  };

  /* Mots proposés sur l'écran d'accueil : un dans chaque langue, choisis pour
   * montrer ce que la fiche sait faire (genre, pluriel, plusieurs sens). */
  const SUGGESTIONS = ['Haus', 'gehen', 'Schloss', 'maison', 'temps', 'aller'];

  let courante = 'fr';

  function t(cle, valeurs) {
    const table = TEXTES[courante] || TEXTES.fr;
    let texte = table[cle];
    if (texte === undefined) texte = TEXTES.fr[cle];
    if (texte === undefined) return '‹' + cle + '›';
    if (valeurs) {
      texte = texte.replace(/\{(\w+)\}/g, (tout, nom) =>
        (valeurs[nom] === undefined ? tout : valeurs[nom]));
    }
    return texte;
  }

  /* Accord en nombre. Cherche d'abord `cle.un` quand il n'y en a qu'un, sinon
   * `cle`. Le français et l'allemand se contentent tous deux de cette
   * distinction ; une langue à duel demanderait mieux. */
  function n(cle, nombre, valeurs) {
    const complet = Object.assign({ n: nombre }, valeurs);
    if (Math.abs(nombre) <= 1) {
      const table = TEXTES[courante] || TEXTES.fr;
      if (table[cle + '.un'] !== undefined) return t(cle + '.un', complet);
    }
    return t(cle, complet);
  }

  function appliquer(racineElement) {
    const zone = racineElement || document;
    zone.querySelectorAll('[data-t]').forEach((el) => {
      el.textContent = t(el.dataset.t);
    });
    zone.querySelectorAll('[data-t-ph]').forEach((el) => {
      el.setAttribute('placeholder', t(el.dataset.tPh));
    });
    zone.querySelectorAll('[data-t-aria]').forEach((el) => {
      el.setAttribute('aria-label', t(el.dataset.tAria));
    });
    zone.querySelectorAll('[data-t-titre]').forEach((el) => {
      el.setAttribute('title', t(el.dataset.tTitre));
    });
    if (zone === document) {
      document.documentElement.lang = courante;
      document.title = t('app.nom') + ' — ' + t('app.sous-titre');
    }
  }

  function definir(langue) {
    courante = TEXTES[langue] ? langue : 'fr';
    appliquer();
    document.dispatchEvent(new CustomEvent('langue-changee', { detail: courante }));
  }

  /* Au tout premier lancement, on suit la langue du navigateur : un appareil
   * réglé en allemand ouvre l'application en allemand. */
  function langueDuNavigateur() {
    const liste = navigator.languages || [navigator.language || 'fr'];
    for (const balise of liste) {
      const code = String(balise).slice(0, 2).toLowerCase();
      if (TEXTES[code]) return code;
    }
    return 'fr';
  }

  racine.I18n = {
    t,
    n,
    appliquer,
    definir,
    langueDuNavigateur,
    get langue() { return courante; },
    LANGUES: Object.keys(TEXTES),
    SUGGESTIONS,
  };

})(window);
