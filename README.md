# Wortschatz — dictionnaire et mémorisation français ⇄ allemand

Une application de téléphone qui fait trois choses que les autres séparent :
**chercher** instantanément un mot ou une expression dans les deux sens,
**retenir** durablement ce qu'on vient de chercher, et **parler** — des phrases
toutes faites et de courts dialogues pour les situations courantes, à écouter,
à apprendre, à jouer.

Tout fonctionne **hors ligne**. Pas de compte, pas de serveur, pas de mesure
d'audience, pas de publicité. La politique de sécurité de la page
(`connect-src 'self'`) lui interdit techniquement de contacter quoi que ce soit
d'autre que le site d'où elle vient.

---

## Ce qu'elle fait

**Chercher.** Un seul champ, les deux langues à la fois. Les résultats tombent
à la frappe — la recherche est une dichotomie dans un index tenu en mémoire, pas
une requête. Les formes fléchies sont reconnues : *ging* mène à *gehen*,
*Häuser* à *Haus*, *faut* à *falloir*, *nationaux* à *national*. Les expressions
aussi : *dans l'ensemble*, *tout de suite*, *avoir lieu*.

**Comprendre.** Chaque fiche donne l'article coloré des noms allemands (der
bleu, die rouge, das vert — le code des tableaux de classe), la prononciation
avec un bouton pour l'écouter, les formes irrégulières, et les mots du même
voisinage.

**Écouter.** La lecture à voix haute passe par les voix de l'appareil, sans
réseau. Un texte allemand n'est lu que par une voix allemande, un texte
français que par une voix française — s'il manque une voix, rien n'est lu,
plutôt que mal, et l'écran le dit pour la langue qui manque. Les Réglages
montrent la voix retenue pour chaque langue, permettent d'en préférer une
autre parmi celles du système, et la font lire une phrase à sons pièges —
« Zehn Züge fahren zum Zoo. » : ses quatre « z » doivent sonner « ts ».
L'application transmet le texte tel quel, sans réécrire une lettre, à la voix
qu'elle nomme ; sous « Détails techniques », elle dit à quelle voix elle a
**demandé** le dernier énoncé — la phrase d'essai, ou celle qui sonnait
faux —, avec le système et le navigateur. C'est un indice, pas une preuve :
le moteur du système ne dit pas quelle voix il a réellement employée, et un
nom allemand affiché n'attribue pas encore le défaut à cette voix. Ce qui
départage, sur l'appareil, c'est l'essai de chaque voix allemande sur la
phrase d'essai ; si toutes prononcent mal, ou si aucune n'apparaît, c'est un
défaut à signaler avec ces lignes. Le code ne contient aucun repli sur une
voix d'une autre langue ; cela ne prouve pas, à lui seul, que le défaut vient
de l'appareil — seul l'essai le dit.

Chaque **signification** porte ses propres exemples : une citation du
Wiktionnaire dans la langue du mot, et les phrases traduites de Tatoeba qui
l'illustrent vraiment. *See* est un lac au masculin et la mer au féminin, avec
des phrases distinctes ; *abbauen* a cinq sens, chacun avec le sien. Le tableau
des formes qu'il faut retenir — pluriel et génitif, temps primitifs, comparatif,
conjugaison — se déplie sous chaque lecture.

**Tout mot affiché est cliquable.** Dans une définition, dans une citation, dans
une phrase d'exemple et dans sa traduction : un clic ouvre un cartouche avec la
vedette, sa prononciation, ses traductions, et le bouton *Apprendre*. Un mot
inconnu rencontré en lisant entre dans les révisions sans quitter la fiche.

**Retenir.** Un bouton *Apprendre ce mot* verse le mot dans une file de
révision espacée (SM-2 simplifié). Huit exercices se relaient, de difficulté
croissante : reconnaître, choisir, écrire — et pour un nom, l'écrire avec son
article (« die Bohne », et non « Bohne ») —, le genre der/die/das, la phrase à
trou, l'appariement de phrases, l'écoute. La correction est tolérante mais
instructive — une majuscule oubliée sur un nom allemand n'est pas comptée
fausse, elle est expliquée, et l'article oublié ne se paie pas comme l'article
faux.

Un mot appris dans les deux sens compte **deux cartes** : produire l'allemand et
produire le français s'oublient à des rythmes différents, et une échéance
commune suivrait le plus facile des deux. Le réglage *Sens de travail* permet de
n'en garder qu'une.

**Les ateliers.** Douze exercices se réclament directement — genre, écriture
avec article, phrase à trou, écoute, pluriel, conjugaison, synonymes — sur les
mots de son choix : ceux qu'on suit, ceux qu'on vient de consulter, ou au hasard
dans le vocabulaire courant. Un atelier **ne touche jamais à l'échéancier** :
on s'entraîne autant qu'on veut sans faire croire au planificateur qu'un mot est
su. Un atelier impossible reste affiché, grisé, et dit pourquoi.

L'onglet Réviser liste les mots suivis, avec leur prochaine échéance, et permet
d'en retirer. Un retrait ne demande pas confirmation : il s'annule, et remet la
carte telle qu'elle était — intervalle, facilité, réussites. Retirer un mot puis
le rajouter par sa fiche, au contraire, en refait un mot neuf.

**Les expressions usuelles.** Taper « feu » donne « à petit feu », « Ahnung »
donne « keine Ahnung », « chance » donne « au petit bonheur la chance » — et
aussi « viel Glück », par sa traduction. L'index des vedettes ne sait trouver
que des débuts de mot ; un second index, par mot, range chaque expression sous
chacun de ses mots et sous ceux de ses traductions, dans les deux langues. Les
expressions forment un groupe à part sous les résultats, et chaque fiche de mot
se termine par celles qui le contiennent. Une expression s'apprend comme un
mot, dans les deux directions, sans carte de genre — on n'apprend pas « der »
sur « kein Problem ». Ce qui fait l'expression, c'est sa provenance, pas ses
espaces : « base de données » reste un nom. Pour un mot à soi de plusieurs
mots, le formulaire pose la question — expression usuelle, oui ou non — et
n'y répond pas à votre place.

Quand une entrée a plusieurs sens aux équivalents distincts — « à petit feu »
est *auf kleiner Flamme* pour une cuisson et *langsam* pour une agonie —, la
question de révision en vise **un**, montre sa définition, et attend ses
équivalents ; répondre par ceux d'un autre sens vaut « presque », et la
remarque nomme le sens demandé. Dans la direction « produire », la réponse
est la vedette quel que soit le sens : l'énoncé n'aligne alors que les
équivalents d'un même sens.

Ce que les sources n'ont pas ou traduisent mal, un petit supplément relu à la
main le corrige — [build/expressions_editoriales.json](build/expressions_editoriales.json)
dit ce qu'il ajoute, ce qu'il écarte, et pourquoi. Les expressions sans
équivalent connu restent consultables, marquées telles, après les autres.

Ce qui fait qu'une suite de mots est une expression et non un nom composé, et
d'où viennent les équivalents des formules que les tables de traduction
ignorent, est dit dans [build/SOURCES.md](build/SOURCES.md).

**Phrases et dialogues.** Un onglet à part, rangé par situation — saluer et se
présenter, demander son chemin, transports, restaurant et café, achats et
paiement, hôtel, rendez-vous, demander de l'aide, faire répéter, et depuis la
version 3.3 deux situations de plus : *au quotidien* (réagir, proposer,
encourager — « ça marche », « pas de souci », « ça dépend », « ça vaut le
coup », « tiens-moi au courant », « je croise les doigts pour toi ») et
*recevoir et être invité*. Deux cent quatre-vingts phrases bilingues, chacune
avec sa situation d'emploi, son registre quand elle s'adresse à quelqu'un
(*poli · vouvoiement*, *familier · tutoiement*), ses variantes acceptées et un
bouton d'écoute par langue ; et quarante dialogues de quatre à huit répliques,
à deux voix. Les expressions courantes y sont données en situation — « Bon
courage ! » n'a pas le même équivalent avant un examen (*Viel Erfolg!*) et
devant une journée difficile (*Halt die Ohren steif!*), et la fiche le dit.
Quand une phrase contient une expression usuelle du dictionnaire — « kein
Problem », « alles klar », « bon courage » —, sa fiche y mène : c'est une
passerelle, pas une fusion, chacune garde ses cartes. Un dialogue
s'écoute d'une traite dans la langue choisie, avec une pause entre les
répliques et un bouton Arrêter ; ses traductions se masquent ; et l'on peut
**jouer un rôle** — A ou B — dont les répliques se cachent, à révéler une par
une, sans que rien ne soit noté.

Une phrase s'apprend comme un mot, dans les deux directions selon le sens de
travail, jamais avec une carte de genre. La correction tolère la ponctuation,
la casse, l'apostrophe et le trait d'union, et une étourderie ; elle n'accepte
que les formulations enregistrées, et le dit après la réponse en les
montrant toutes. Apprendre « Ist es weit? » depuis le dialogue de la poste ou
depuis sa fiche donne les **mêmes cartes** : chaque réplique a un identifiant
canonique, celui de la phrase qu'elle reprend. La recherche générale ajoute
un groupe « Phrases et dialogues » sous les mots et les expressions, atteint
par n'importe quel mot des deux langues — « poste », « Post », « rechts »,
« Bahnhof » —, pendant la frappe.

On écrit aussi les siens : une phrase bilingue avec ses variantes, ou un
dialogue composé réplique par réplique. Ils se cherchent, s'écoutent et
s'apprennent comme les autres ; corriger leur texte ne perd ni les notes ni la
progression, parce que les cartes ne portent que des identifiants ; et ils
partent avec la sauvegarde (format 2 — un fichier de format 1 se relit tel
quel).

Le contenu fourni est **original, rédigé pour l'application par un assistant
d'écriture**. Le texte allemand des vingt-six dialogues de la version 3.2 a
été **validé par une locutrice native** ; les phrases isolées, les traductions
françaises et tout ce que la version 3.3 ajoute ne l'ont pas encore été.
Chaque fiche dit dans lequel des deux cas elle est — le fichier le porte
dialogue par dialogue (`relu`) —, et [build/SOURCES.md](build/SOURCES.md)
détaille ce qui a été contrôlé par programme : structure, tutoiement et
vouvoiement, ponctuation, doublons. Ce qui attend relecture est rassemblé dans
[build/RELECTURE-3.3.md](build/RELECTURE-3.3.md).

**Mes notes.** Chaque fiche — d'un mot, d'une phrase, d'un dialogue — porte une
section où l'on écrit ce qu'aucun dictionnaire ne sait : le moyen
mnémotechnique qu'on s'est trouvé, le piège où l'on retombe, la phrase où l'on
a rencontré le mot. Les notes sont à part du
dictionnaire — elles survivent au téléchargement du paquet complet, à sa
suppression, à une version plus récente des données. Pendant une révision,
elles n'apparaissent **qu'après la réponse** : une note contient souvent le
moyen de retrouver le mot, c'est-à-dire la réponse elle-même.

**Mes mots.** Le dictionnaire ne contient pas le vocabulaire du chantier où l'on
travaille, ni l'expression entendue hier au marché. Un bouton *Ajouter un mot*
attend sous toute recherche restée vide, prérempli de ce qu'on vient de taper.
Trois champs suffisent — le mot, sa langue, une traduction ; le reste est
facultatif, et l'application s'adapte à ce qui manque : pas de genre saisi, pas
de question der/die/das ; pas de pluriel, pas d'exercice de pluriel. Ces entrées
se cherchent **dans les deux sens** — par la vedette et par ses traductions —
portent la mention *Personnel*, s'apprennent comme les autres, et respectent le
réglage du sens de travail.

Leur identifiant ne dépend pas de leur orthographe : corriger « Baguet » en
« Baguette » ne perd ni la note ni les révisions. Supprimer un mot déjà appris
demande confirmation, dit ce qu'on perd, et s'annule — l'intervalle et la
facilité reviennent à l'identique.

**Sauvegarder.** Rien ne sort de l'appareil, ce qui veut dire que rien n'y est à
l'abri. Les Réglages écrivent un fichier JSON versionné — mots personnels,
notes, cartes de révision, réglages — qu'on range où l'on veut. À la relecture,
l'application **montre d'abord** ce qui entrerait, ce qui existe déjà, ce qui se
contredit, et demande quoi faire des conflits. Rien n'est jamais écrasé en
silence.

**Se situer.** L'onglet Progrès distingue ce qu'on **sait produire** de ce qu'on
sait seulement reconnaître. C'est la seule mesure qui ne se flatte pas.

L'interface est en **français ou en allemand**, au choix, et l'on apprend dans
les deux sens.

## Ce qu'elle ne fait pas

Traduire une phrase quelconque. Elle traduit des **mots** et des
**expressions**, et montre comment on dit vraiment les choses en cherchant dans
un corpus de phrases. Un traducteur de phrases libres demanderait un modèle,
donc un serveur — l'inverse de ce qui est cherché ici.

---

## Les données

Rien n'est inventé. Voir [build/SOURCES.md](build/SOURCES.md) pour le détail et
les licences.

| Source | Ce qu'on en tire | Licence |
|---|---|---|
| [WikDict](https://www.wikdict.com/) (TEI + SQLite) | 106 000 entrées : mot, phonétique, nature, **genre**, formes, définitions, traductions ; et les formes fléchies du français | CC BY-SA 3.0 |
| [Wiktionnaire](https://www.wiktionary.org/) intégral, via [wiktextract](https://kaikki.org/) | définitions, **exemples par sens**, synonymes, tableaux de formes, et **les tables de traduction** | CC BY-SA + GFDL |
| [Tatoeba](https://tatoeba.org/) | phrases allemand/français alignées, et la mesure de fréquence d'usage | CC BY 2.0 FR |
| `build/grammaire.py` | sept mots-outils français absents du dictionnaire source | écrits pour l'application |
| `data/conversation.json` | 280 phrases et 40 dialogues par situation, rédigés par un assistant d'écriture et contrôlés par programme ; l'allemand des 26 dialogues de la 3.2 validé par une locutrice native, le reste non relu | CC BY-SA 4.0, original |

Origine commune du dictionnaire : le Wiktionnaire, via
[DBnary](http://kaiko.getalp.org/about-dbnary/) pour WikDict et directement pour
les exemples.

**Le Dictionnaire de l'Académie française et le Duden sont absents, et ce n'est
pas un oubli** : les conditions du premier interdisent l'extraction automatisée
et la redistribution, le second est purement commercial. Le Wiktionnaire rend le
même service et se laisse redistribuer.

Deux paquets sont produits :

- **noyau** — 24 000 mots, 21 Mo, livré avec l'application et pré-caché : elle
  est utilisable hors ligne dès l'installation. Il est passé de 9 000 à 12 000
  mots par langue en version 2, parce qu'un mot cliquable absent du paquet ne
  mène nulle part ;
- **complet** — 112 000 mots, 75 Mo, téléchargé depuis les Réglages sur
  décision de l'utilisateur. Les Réglages affichent le paquet actif, son poids
  sur l'appareil, le nombre d'entrées traduites, et qu'il est utilisable hors
  ligne.

### Les expressions usuelles, en chiffres

| | noyau | complet |
|---|---|---|
| expressions allemandes traduites | 507 | 1 549 |
| expressions françaises traduites | 1 581 | 2 906 |
| expressions allemandes sans équivalent (consultation seule) | 0 | 2 030 |
| expressions françaises sans équivalent (consultation seule) | 0 | 6 712 |
| poids du paquet | 22.8 Mo | 80.7 Mo |

Le noyau ne reçoit que des expressions traduites, faites de ses propres mots,
et tout le supplément éditorial ; son budget est passé de 22 à 23 Mo pour les
accueillir, et le dit dans `construire.py`. Le paquet complet porte en plus les
expressions que le Wiktionnaire atteste sans leur connaître d'équivalent —
elles se lisent, avec leur définition, mais ne se révisent pas ; leur fiche le
dit, les résultats les marquent et les placent après les autres, et les
Réglages donnent les deux nombres.

### Quand le dictionnaire complet change de mouture

Le format des données passe en version 3, et chaque construction est une
**mouture** : les tranches gardent leur nom mais plus leur contenu, et un
téléchargement ne redemande jamais ce qui est déjà là. Mélanger l'index d'une
mouture aux tranches d'une autre donnerait un dictionnaire troué. Le passage
suit donc trois règles, que `js/paquets.js` tient et que
`build/essais_mise_a_jour.mjs` éprouve :

1. **Rien n'est perdu.** Le paquet complet téléchargé sous la mouture d'avant
   reste **lisible** tant que le nouveau n'est pas entier : `Lexique` le lit
   directement dans son cache, par l'API Cache — ni réseau ni service worker
   entre les deux, donc rien qui puisse y substituer un fichier d'une autre
   mouture. Une révision sur un mot absent du noyau s'ouvre comme avant.
2. **Rien n'est mélangé.** Chaque mouture a son cache, nommé par le format et
   la date de construction (`wortschatz-donnees-3-2026-09-13`). Le service
   worker ne sert les données que depuis la coquille et le cache de *sa*
   mouture ; le nouveau paquet se télécharge à côté, avec un paramètre
   d'adresse qui déjoue même le service worker de la version d'avant.
3. **On le dit.** Un bandeau et les Réglages annoncent qu'un nouveau
   téléchargement est nécessaire, ce qu'il apporte, ce qu'il pèse, et que
   l'ancien paquet sert jusqu'au bout. L'ancien n'est effacé qu'une fois le
   nouveau complet ; interrompre le téléchargement ne détruit rien.

Une carte de révision garde le numéro de tranche du jour où elle est née ;
une mouture déplace les mots d'une tranche à l'autre. `Lexique.ouvrir`
redemande donc à l'index où le mot vit aujourd'hui quand la tranche gardée ne
le porte plus — sans quoi la révision sautait la carte en silence.

Le noyau, les mots personnels, les notes et les révisions ne bougent pas.

### Ce que la version 3 a ajouté au dictionnaire, mesuré

`build/mesurer_gain.py` compare les paquets construits à ceux de la version
précédente. Ce qui suit en sort, et rien n'y est arrondi à l'avantage.

|  | version 2 | version 3 |
|---|---|---|
| entrées allemandes (complet) | 59 027 | **63 280** (+7,2 %) |
| entrées françaises (complet) | 47 340 | **49 108** (+3,7 %) |
| sens français traduits | 65,7 % | **93,9 %** |
| sens allemands traduits | 81,1 % | **87,7 %** |
| sens français traduits *et* illustrés | 38,6 % | **60,1 %** |
| sens allemands traduits *et* illustrés | 69,5 % | **75,8 %** |
| sens illustrés, en nombre (complet, fr) | 57 496 | **59 146** |
| phrases d'exemple (complet) | 40 637 | **42 010** |
| formes fléchies françaises | 48 034 | **48 892** |
| poids du paquet complet | 71,1 Mo | 75,5 Mo (+6,2 %) |
| poids du noyau, celui qu'on installe | 20,8 Mo | 21,5 Mo (+3,0 %) |

Les 6 021 vedettes nouvelles viennent **toutes** d'une traduction attestée du
Wiktionnaire : *Pfefferspray*, *Gelaber*, *Dorfstraße*, *bzw.*, *néophobie*,
*planétarium*, *est-ce que*. Aucune traduction n'est fabriquée, et une vedette
sans traduction n'entre pas — le volume n'est pas le but.

**Une part qui baisse, et pourquoi elle ne dit pas ce qu'elle a l'air de dire.**
La proportion de sens français illustrés passe de 84,9 % à 82,2 % pour le noyau.
Ce n'est pas une perte : le **nombre** de sens illustrés monte (28 253 → 28 425),
c'est le dénominateur qui grandit de 1 322 sens nouvellement traduits. Un sens
qui gagne une traduction sans gagner d'exemple reste un progrès — il passait
avant pour « sens sans traduction connue », c'est-à-dire une définition à
déchiffrer et rien à apprendre.

`build/verifier.py` mesure cette part à chaque construction et échoue en dessous
de 60 %. Elle vaut aujourd'hui **95,7 % côté allemand et 82,2 % côté français**
pour le noyau.

## Construire les données

```bash
python build/telecharger.py    # ~1,6 Go de sources, une seule fois
python build/wiktionnaire.py   # extrait les 2 Go de dumps, ~2 minutes
python build/construire.py     # produit data/, environ deux minutes
python build/verifier.py       # contrôle tout, et écrit build/rapport.txt
python build/mesurer_gain.py   # compare les paquets à ceux de la révision HEAD
```

`verifier.py` **sort en erreur** sur anomalie et distingue ce qui est cassé de
ce qui est seulement à surveiller. Il faut lire `build/rapport.txt` de temps en
temps : il contient les listes qu'aucun programme ne sait juger — la tête du
classement (le vocabulaire que les débutants apprendront en premier), un
échantillon de familles de mots, et les mots pièges. Les erreurs repérées se
corrigent dans `build/exclusions.txt`.

Un troisième script, `build/generer-icones.py`, redessine les icônes.

## Installer sur un téléphone

**<https://cristo67000.github.io/wortschatz/>** — puis, dans l'onglet Réglages,
*Installer sur cet appareil*.

- **Android** (Chrome, Edge, Samsung Internet) : un bouton fait tout.
- **iPhone, iPad** (Safari) : Apple ne permet pas de déclencher l'installation
  par programme ; l'application affiche donc la marche à suivre — Partager,
  puis « Sur l'écran d'accueil ».
- Une fois installée, l'icône est sur l'écran d'accueil et l'application s'ouvre
  sans barre d'adresse. Elle pèse alors 8 Mo et fonctionne déjà sans réseau ;
  le dictionnaire complet (30 Mo) reste facultatif.

Le bouton *Partager le lien* ouvre la feuille de partage du système, ou copie
l'adresse là où elle n'existe pas.

**Les mises à jour se disent.** Une application posée sur l'écran d'accueil ne
se recharge jamais : la version suivante pouvait dormir dans son cache pendant
des semaines. Elle s'installe désormais en silence puis attend, un bandeau
annonce qu'elle est prête, et rien ne bascule avant un clic — recharger sous les
doigts de quelqu'un ferait perdre la séance en cours. Les Réglages permettent
aussi de chercher une mise à jour à la main, et affichent la version installée.
Et une version est **entière ou rien** : la page, les styles, les scripts et
le contenu fourni sont servis depuis le cache de la version en place, la
suivante se prépare dans un cache à elle et n'est proposée qu'une fois tous
ses fichiers arrivés — le réseau peut tomber au milieu, il ne reste ni
bandeau ni cache à moitié plein, et l'application en place continue.

## Essayer en local

```bash
python -m http.server 8143 --directory wortschatz
```

Puis <http://localhost:8143>. Un service worker est nécessaire au mode hors
ligne : il ne s'installe qu'en `https` ou sur `localhost`.

## Architecture

Statique, sans étape de compilation. Des scripts classiques, chargés dans
l'ordre de leurs dépendances.

```
js/i18n.js       textes français et allemands, bascule de langue
js/lexique.js    index en mémoire, recherche, lemmatisation, phrases
js/store.js      IndexedDB : cartes, journal, réglages, historique
js/paquets.js    téléchargement et installation du dictionnaire complet
js/installer.js  installation sur l’appareil, et partage du lien
js/miseajour.js  bandeau de mise à jour, et vérification à la demande
js/voix.js       synthèse vocale du système, sans réseau : une voix par langue,
                 jamais celle d'une autre langue, choix et diagnostic
js/revision.js   planificateur SM-2, et les cartes par direction
js/exercices.js  les douze exercices et la correction tolérante
js/notes.js      « Mes notes » : ce qu'on écrit soi-même sur un mot
js/perso.js      « Mes mots » : les entrées qu'on ajoute soi-même
js/mesmots.js    le formulaire d'ajout, et la liste de ses entrées
js/conversation.js  « Phrases et dialogues » : le contenu, la recherche, les
                 identifiants canoniques, les phrases et dialogues à soi
js/situations.js l'écran du module, les fiches, la lecture enchaînée, le jeu
                 de rôle, les formulaires
js/sauvegarde.js export et import JSON, avec bilan et conflits
js/motsvifs.js   le mot cliquable, et son cartouche
js/fiche.js      affichage d'une entrée, sens par sens
js/seance.js     déroulé d'une séance — deux régimes, un seul moteur
js/atelier.js    le choix de l'exercice, sans effet sur l'échéancier
js/progres.js    statistiques
js/suivis.js     la liste des mots suivis, et leur retrait
js/app.js        onglets, recherche, réglages
js/demarrage.js  amorçage
```

Côté construction, la version 2 ajoute trois modules :

```
build/wiktionnaire.py  extraction en flux des dumps wiktextract
build/alignement.py    rapprochement des sens WikDict / Wiktionnaire
build/phrases.py       + répartition des paires Tatoeba par signification
```

La version 3 en ajoute deux :

```
build/traductions.py   les tables de traduction du Wiktionnaire, et les
                       vedettes que WikDict ignore
build/mesurer_gain.py  ce que la construction a gagné, chiffres à l'appui
```

La version 3.1 en ajoute un :

```
build/expressions.py   reconnaître les expressions usuelles, compléter les
                       formules que les tables ignorent, et les indexer par mot
```

## Trois pièges, pour qui reprendrait le code

**`cle()` existe en deux exemplaires.** `build/commun.py` range les mots sous
une clé calculée en Python ; `js/lexique.js` les cherche sous une clé calculée
en JavaScript. Un écart d'une seule règle rend introuvables des milliers de mots
sans que rien ne le signale. `verifier.py` exécute les deux sur 4 000 vedettes
tirées au sort et échoue si elles divergent. **Toute retouche de l'une doit être
reportée sur l'autre.**

**Le cache des données ne doit jamais être purgé par le service worker.** Il
contient les 30 Mo que l'utilisateur a téléchargés. Il est nommé d'après la
version des *données*, pas celle de l'application, et seul `js/paquets.js` y
touche — sur demande explicite, ou pour installer une version plus récente.

**Les fichiers de données s'écrivent en LF.** Sous Windows, `write_text()`
traduit chaque `\n` en `\r\n` ; le retour chariot traîne alors à la fin du
dernier champ, et l'application cherche le lemme `gehen\r`. C'est pourquoi
`construire.ecrire()` passe `newline=""`.

**L'identifiant d'un mot personnel ne contient pas sa graphie.** Une carte de
révision du dictionnaire se nomme `de Haus vers-de` ; une carte de mot personnel
se nomme `perso:p-1a2b3c vers-de`. Ce n'est pas une coquetterie : si
l'identifiant portait le mot, corriger une faute de frappe fabriquerait une
carte neuve et abandonnerait l'ancienne avec ses trois mois d'intervalle, sans
que rien ne le signale. La même règle vaut pour les notes.

**Une réplique et une phrase peuvent être la même carte.** « Ist es weit? »
est dans la liste des phrases et dans le dialogue de la poste. Chaque réplique
a un identifiant canonique — celui de la phrase qu'elle désigne (`phrase` dans
`data/conversation.json`), ou le sien — et tout ce qui apprend passe par
`Conversation.canonique()`. Écrire des cartes sous l'identifiant de la réplique
fabriquerait un doublon silencieux : deux échéances pour une phrase.

**Le contenu fourni est dans la coquille, pas dans les paquets.**
`data/conversation.json` est pré-caché avec le code et versionné avec lui : il
ne dépend ni du téléchargement du dictionnaire complet ni de la mouture des
données. Ce qu'on écrit soi-même dans le module vit dans IndexedDB (magasin
`conversation`, base en version 4), avec les mots personnels.

**Une version est entière ou rien.** Depuis la 3.3, le service worker sert
la coquille — `index.html`, les feuilles de style, les scripts, le manifeste
et `conversation.json` — **depuis le cache de sa version, et de lui seul**.
Ce qui n'y est pas va au réseau sans rien laisser dans le cache. La version
suivante se prépare dans un cache qui porte son numéro : chaque fichier
obligatoire est téléchargé avec une marque d'adresse qui déjoue les relais
(`?coquille=v…`), tout ou rien ; la page doit porter la version du service
worker (`<meta name="application-version">`), sans quoi l'installation est
refusée — un relais en retard, une publication en cours ; et une installation
qui échoue efface son cache avant de s'arrêter. Le bandeau n'apparaît qu'à
l'état `installed`, donc une fois la coquille entière ; le clic active la
nouvelle version et efface l'ancienne coquille — jamais les caches de
données, qui ne changent pas de règle : cache d'abord, dans la coquille pour
le noyau, dans le cache de la mouture pour le paquet complet.

Jusqu'en 3.2, la coquille était servie **réseau d'abord** : une page ouverte
recevait le code neuf dès sa publication, sous l'ancien service worker, avec
les données d'avant — et une coupure au milieu d'un chargement pouvait lui
donner des scripts de deux versions. Le passage de la 3.2 à la 3.3 se fait
donc encore une fois à l'ancienne, c'est le service worker de la 3.2 qui sert
alors ; `essais_coquille.mjs` le joue tel quel, réseau coupé pendant
l'installation, puis joue la règle nouvelle vers une version suivante
fabriquée pour l'occasion, et une publication incohérente. Empreinte par
empreinte : jamais deux versions dans une même page.

**Les notes et les mots personnels ne sont pas dans le dictionnaire.** Ils
vivent dans IndexedDB, à côté des cartes ; le dictionnaire vit dans le cache du
service worker. C'est cette séparation qui fait qu'un changement de paquet, une
suppression du paquet complet ou une version plus récente des données ne leur
font rien. Toute tentative de les ranger « avec le mot » les perdrait au premier
téléchargement.

## Cas de contrôle

```bash
node build/essais.mjs             # correction, choix de l'exercice, planification
node build/essais_i18n.mjs        # aucun libellé absent, dans l'une ou l'autre langue
node build/essais_donnees.mjs     # migration, notes, mots personnels, sauvegarde
node build/essais_conversation.mjs # le contenu des phrases et dialogues, la recherche,
                                  # les cartes sans doublon, la correction, l'export
node build/essais_voix.mjs        # la voix demandée au moteur : sa langue, son choix,
                                  # jamais une voix d'une autre langue — la logique,
                                  # pas la prononciation, qui se juge à l'oreille
python build/essais_alignement.py # appariement des sens
python build/commun.py            # normalisation des clés
python build/verifier.py          # tout le reste, y compris les trois ci-dessus
```

`build/essais_donnees.mjs` éprouve le stockage sur un IndexedDB de laboratoire
écrit dans `build/faux_indexeddb.mjs` — une centaine de lignes plutôt qu'une
dépendance, pour un dépôt qui n'en a aucune. Il ouvre le **vrai** `data/noyau`
au passage : les recherches qu'il vérifie — « strasse » qui trouve « Straße »,
« ging » qui mène à « gehen », un mot personnel homographe d'une vedette — ne
voudraient rien dire sur un index inventé.

### Ce qu'aucun de ceux-là ne peut voir

Un service worker demande un vrai navigateur. Deux fichiers en lancent un :

```bash
node build/essais_navigateur.mjs  # mode hors ligne, serveur arrêté pour de bon
node build/essais_profils.mjs     # export d'un profil de navigateur à un autre
node build/essais_mise_a_jour.mjs # la version de main, puis celle-ci, au même endroit
node build/essais_migration_phrases.mjs c99b13a # idem, pour l'arrivée des phrases (3.1 → 3.2) :
                                  # la base passe en version 4 sans qu'une carte ne bouge
node build/essais_migration_contenu.mjs # 3.2 → 3.3 : le contenu neuf arrive avec la
                                  # coquille, l'ancien sert jusqu'au clic, rien ne bouge
node build/essais_coquille.mjs    # la coquille d'une seule version : réseau coupé pendant
                                  # l'installation, ancienne version utilisable, suivante
                                  # entière ou rien — depuis la 3.2 publiée, puis au-delà
```

`essais_mise_a_jour.mjs` joue le passage d'une **mouture des données** à la
suivante ; il suppose que `main` porte la mouture d'avant, et ses contrôles sur
l'ancien paquet n'ont pas de sens quand les deux versions partagent les mêmes
données. `essais_migration_phrases.mjs` éprouve l'autre passage, celui du code
et de la base : il relève sur la version publiée l'empreinte de chaque carte,
note, mot et réglage, sert la version en cours au même port, et compare champ
par champ — puis apprend une phrase, relit une sauvegarde de format 1, donne le
feu vert au service worker et coupe le réseau. Il prend en argument la
révision qui joue « la version publiée » — `c99b13a`, la 3.1, puisque `main`
a avancé depuis. `essais_migration_contenu.mjs` fait de même pour le passage
de la 3.2 à la 3.3, où c'est le contenu qui change : phrases apprises, dialogue
à soi, réglage de voix, tout doit rester — et il énumère, fichier par
fichier, ce qui est réellement servi dans l'entre-deux (voir « Ce qui sert
entre le déploiement et le clic », plus haut).

Ils pilotent un Chrome par le protocole DevTools — Node porte un WebSocket
natif, donc toujours aucune dépendance. Le premier installe l'application,
ajoute un mot personnel avec sa note, puis **arrête le serveur HTTP** : la
coupure n'est pas émulée, il n'y a plus rien à l'autre bout. Le second écrit
dans un profil, télécharge le fichier par le bouton de l'application, et
l'importe dans un second profil vierge.

C'est la seule façon d'éprouver ce que l'application promet. La compilation de
`sw.js` et le contrôle de sa liste de pré-cache disent que rien n'a été oublié ;
ils ne disent pas que le mode hors ligne marche.

Le troisième joue une mise à jour réelle : il sert la version de `main` (un
`git worktree`, effacé à la fin), y installe le dictionnaire complet et
apprend un mot absent du noyau ; puis il sert la version en cours **au même
port** — l'origine ne change pas, les caches et le service worker sont ceux
d'un vrai déploiement — et vérifie que la carte s'ouvre toujours, qu'aucune
expression de la nouvelle mouture ne se glisse dans l'ancienne, que le bandeau
et les Réglages le disent, qu'un téléchargement interrompu ne détruit rien,
que le téléchargement complet remplace l'ancien d'un bloc, et que tout tient
hors ligne.

### Et sur le site publié

Les deux précédents travaillent sur un serveur local, donc sur les fichiers du
disque. Deux autres prennent le site tel qu'il est servi.

```bash
node build/essais_en_ligne.mjs    # recherche, ajout d'un mot, notes, export
```

Celui-ci ne passe pas par les fonctions internes : il tape dans le champ de
recherche, clique le bouton d'ajout, remplit le formulaire, écrit une note,
appuie sur « Exporter » et relit le fichier arrivé sur le disque. Ce qu'il
éprouve est ce qu'un doigt ferait.

```bash
node build/essais_migration_en_ligne.mjs semer     # AVANT de publier
#   … publier la nouvelle version, attendre le déploiement …
node build/essais_migration_en_ligne.mjs relever   # après
node build/essais_migration_en_ligne.mjs nettoyer  # ne rien laisser traîner
```

Celui-là éprouve la seule migration qui compte : celle d'une application posée
sur un écran d'accueil depuis des mois, avec ses cartes, ses échéances et ses
réglages, à qui l'on sert un jour une version neuve. Elle ne s'éprouve pas après
coup — il faut avoir semé les données **avec l'ancienne version encore en
ligne**, d'où les deux temps.

`semer` relève l'état exact de chaque carte et l'écrit dans un fichier ;
`relever` le relit et compare, champ par champ. L'empreinte passe par un fichier
et non par la ligne de commande, et ce n'est pas un détail : un identifiant de
carte contient des caractères nuls — c'est le séparateur de
`Store.identifiant()` — qu'aucun shell ne transporte. JSON les échappe en
`\u0000`, le fichier reste du texte lisible, et `JSON.parse` les rend intacts.

Le profil de navigateur et l'empreinte vivent dans le répertoire temporaire du
système, jamais dans le dépôt : un profil pèse quelques dizaines de méga-octets
et contient des bases de données. `WORTSCHATZ_ESSAIS` les place ailleurs,
`WORTSCHATZ_SITE` vise un autre déploiement, et `nettoyer` efface tout.

Ces profils sont créés pour l'occasion et n'ont rien à voir avec le navigateur
de qui que ce soit : aucune donnée personnelle réelle n'est lue ni touchée.

`build/mesurer_alignement.py` répond à la seule question dont dépend la
version 2 : combien de significations ont vraiment leur exemple. Il affiche un
échantillon reproductible d'appariements, à relire — aucun programme ne sait
juger si une phrase illustre bien un sens.

## Licence

Le code est libre. Les données produites dans `data/` sont sous **CC BY-SA**,
par héritage de WikDict et du Wiktionnaire : qui les réutilise doit citer la
même origine et partager aux mêmes conditions.
