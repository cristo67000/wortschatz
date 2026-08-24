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
avec un bouton pour l'écouter, les formes irrégulières, jusqu'à trois sens avec
leur définition, deux à quatre phrases d'exemple réelles où le mot est
surligné, et les mots du même voisinage.

**Retenir.** Un bouton *Apprendre ce mot* verse le mot dans une file de
révision espacée (SM-2 simplifié). Huit exercices se relaient, de difficulté
croissante : reconnaître, choisir, écrire — et pour un nom, l'écrire avec son
article (« die Bohne », et non « Bohne ») —, le genre der/die/das, la phrase à
trou, l'appariement de phrases, l'écoute. La correction est tolérante mais
instructive — une majuscule oubliée sur un nom allemand n'est pas comptée
fausse, elle est expliquée, et l'article oublié ne se paie pas comme l'article
faux.

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
| [Tatoeba](https://tatoeba.org/) | phrases allemand/français alignées, et la mesure de fréquence d'usage | CC BY 2.0 FR |
| `build/grammaire.py` | sept mots-outils français absents du dictionnaire source | écrits pour l'application |

Origine commune du dictionnaire : le Wiktionnaire, via
[DBnary](http://kaiko.getalp.org/about-dbnary/).

Deux paquets sont produits :

- **noyau** — 18 000 mots, 8 Mo, livré avec l'application et pré-caché : elle
  est utilisable hors ligne dès l'installation ;
- **complet** — 106 000 mots, 30 Mo, téléchargé depuis les Réglages sur
  décision de l'utilisateur.

## Construire les données

```bash
python build/telecharger.py    # ~160 Mo de sources, une seule fois
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
js/revision.js   planificateur SM-2
js/exercices.js  les huit exercices et la correction tolérante
js/fiche.js      affichage d'une entrée
js/seance.js     déroulé d'une séance
js/progres.js    statistiques
js/app.js        onglets, recherche, réglages
js/demarrage.js  amorçage
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
node build/essais.mjs      # correction des réponses, planification des révisions
python build/commun.py     # normalisation des clés
python build/verifier.py   # tout le reste, y compris les deux ci-dessus
```

## Licence

Le code est libre. Les données produites dans `data/` sont sous **CC BY-SA**,
par héritage de WikDict et du Wiktionnaire : qui les réutilise doit citer la
même origine et partager aux mêmes conditions.
