# Wortschatz — dictionnaire et mémorisation français ⇄ allemand

Une application de téléphone qui fait deux choses que les autres séparent :
**chercher** instantanément un mot ou une expression dans les deux sens, et
**retenir** durablement ce qu'on vient de chercher.

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
| [WikDict](https://www.wikdict.com/) (TEI + SQLite) | 106 000 entrées : mot, phonétique, nature, **genre**, formes, définitions, traductions | CC BY-SA 3.0 |
| [Wiktionnaire](https://www.wiktionary.org/) intégral, via [wiktextract](https://kaikki.org/) | définitions, **exemples par sens**, synonymes, tableaux de formes | CC BY-SA + GFDL |
| [Tatoeba](https://tatoeba.org/) | phrases allemand/français alignées, et la mesure de fréquence d'usage | CC BY 2.0 FR |
| `build/grammaire.py` | sept mots-outils français absents du dictionnaire source | écrits pour l'application |

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
- **complet** — 106 000 mots, 70 Mo, téléchargé depuis les Réglages sur
  décision de l'utilisateur.

**95,7 % des sens allemands et 84,9 % des sens français du noyau** portent au
moins un exemple. `build/verifier.py` mesure ce chiffre à chaque construction et
échoue en dessous de 60 %.

## Construire les données

```bash
python build/telecharger.py    # ~1,6 Go de sources, une seule fois
python build/wiktionnaire.py   # extrait les 2 Go de dumps, ~2 minutes
python build/construire.py     # produit data/, environ deux minutes
python build/verifier.py       # contrôle tout, et écrit build/rapport.txt
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
js/voix.js       synthèse vocale du système, sans réseau
js/revision.js   planificateur SM-2, et les cartes par direction
js/exercices.js  les douze exercices et la correction tolérante
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

## Cas de contrôle

```bash
node build/essais.mjs             # correction, choix de l'exercice, planification
python build/essais_alignement.py # appariement des sens
python build/commun.py            # normalisation des clés
python build/verifier.py          # tout le reste, y compris les trois ci-dessus
```

`build/mesurer_alignement.py` répond à la seule question dont dépend la
version 2 : combien de significations ont vraiment leur exemple. Il affiche un
échantillon reproductible d'appariements, à relire — aucun programme ne sait
juger si une phrase illustre bien un sens.

## Licence

Le code est libre. Les données produites dans `data/` sont sous **CC BY-SA**,
par héritage de WikDict et du Wiktionnaire : qui les réutilise doit citer la
même origine et partager aux mêmes conditions.
