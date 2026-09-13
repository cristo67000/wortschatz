# Provenance et licences des données

Wortschatz ne fabrique aucune donnée linguistique : il met en forme, pour un usage
hors ligne, des ressources libres existantes. Ce fichier dit lesquelles, sous quelle
licence, et ce que l'application en fait. Les mêmes mentions figurent dans
« À propos » et dans `confidentialite.html`, car les licences l'exigent.

## 1. WikDict — dictionnaires bilingues

- **Site** : <https://www.wikdict.com/>
- **Auteur** : Karl Bartel
- **Fichiers utilisés**
  - `https://download.wikdict.com/dictionaries/tei/recommended/deu-fra.tei`
    — 59 631 entrées, mouture 2025.11.21
  - `https://download.wikdict.com/dictionaries/tei/recommended/fra-deu.tei`
    — 48 578 entrées, mouture 2025.11.21
  - `https://download.wikdict.com/dictionaries/sqlite/<mouture>/de-fr.sqlite3`
  - `https://download.wikdict.com/dictionaries/sqlite/<mouture>/fr-de.sqlite3`
    — mouture 2_2026-06
  - `https://download.wikdict.com/dictionaries/sqlite/<mouture>/fr.sqlite3`,
    rangée sous `fr-lang.sqlite3` — mouture 2_2026-06
- **Licence** : Creative Commons Attribution — Partage dans les mêmes conditions
  3.0 non transposé (CC BY-SA 3.0), telle qu'annoncée dans l'en-tête TEI.
  <https://creativecommons.org/licenses/by-sa/3.0/legalcode>
- **Source amont** : Wiktionnaire (<https://www.wiktionary.org/>), via DBnary
  (<http://kaiko.getalp.org/about-dbnary/>), projet de Gilles Sérasset.

Ce que nous en tirons : la forme vedette, la transcription phonétique (API), la
nature grammaticale, **le genre des noms allemands**, les formes fléchies, la
définition en langue source et les traductions.

Les bases SQLite servent à deux choses. Les bilingues (`de-fr`, `fr-de`)
donnent `simple_translation.rel_importance`, qui dit à quel point un mot est
courant et sert à classer le vocabulaire par bandes de fréquence. La
monolingue française (`fr.sqlite3`) donne ses tables `entry` et `form`,
c'est-à-dire **les formes fléchies du français** : 30 625 renvois de « nationaux »
vers « national » que les bases bilingues ne portent pas et qu'aucune règle ne
devine. Elle manquait à `telecharger.py` jusqu'à la version 3 — `formes_fr.py`
la cherchait et repartait en silence sans elle, ce qui laissait l'index français
aux seuls verbes irréguliers et aux formes reconstruites par règle.

Le partage dans les mêmes conditions s'applique : les paquets de données produits
dans `data/` sont eux aussi sous CC BY-SA, et l'application l'indique.

## 2. Tatoeba — phrases d'exemple alignées

- **Site** : <https://tatoeba.org/>
- **Fichiers utilisés**
  - `https://downloads.tatoeba.org/exports/per_language/deu/deu_sentences.tsv.bz2`
  - `https://downloads.tatoeba.org/exports/per_language/fra/fra_sentences.tsv.bz2`
  - `https://downloads.tatoeba.org/exports/per_language/deu/deu-fra_links.tsv.bz2`
- **Licence** : Creative Commons Attribution 2.0 France (CC BY 2.0 FR) pour
  l'essentiel du corpus, quelques phrases en CC0 1.0.
  <https://creativecommons.org/licenses/by/2.0/fr/>

Ce que nous en tirons : des paires de phrases allemand/français réellement
alignées, qui servent d'exemples sur les fiches, de matière aux exercices
« phrase à trou » et de corpus consultable pour les expressions.

## 3. Wiktionnaire intégral — définitions, exemples et flexions par sens

- **Site** : <https://kaikki.org/> — extraction *wiktextract* de Tatu Ylonen
  (<https://github.com/tatuylonen/wiktextract>)
- **Fichiers utilisés**
  - `https://kaikki.org/dewiktionary/raw-wiktextract-data.jsonl.gz` — 289 Mo,
    édition allemande du Wiktionnaire, mouture du 2026-09-04
  - `https://kaikki.org/frwiktionary/raw-wiktextract-data.jsonl.gz` — 685 Mo,
    édition française, mouture du 2026-09-05

Les moutures ne sont pas recopiées à la main : `telecharger.py` lit l'en-tête
`Last-Modified` de chaque fichier et l'écrit dans `build/sources/moutures.json`,
que `construire.py` reporte dans `data/manifeste.json`. Une date affichée dans
l'application est donc celle de la source, pas celle du téléchargement.
- **Licence** : celles du Wiktionnaire, **CC BY-SA** et GFDL.
  <https://en.wiktionary.org/wiki/Wiktionary:Copyrights>
- **Citation académique** : Tatu Ylonen, *Wiktextract: Wiktionary as
  Machine-Readable Structured Data*, LREC 2022, p. 1317-1325.

Ce que nous en tirons, et que WikDict ne porte pas :

- la **définition de chaque sens** dans la langue du mot ;
- une ou deux **phrases d'exemple par sens**, avec la position du mot vedette
  et la référence de la citation ;
- les **synonymes** ;
- les **formes qu'on apprend par cœur** — pluriel et génitif des noms
  allemands, temps primitifs des verbes, comparatif et superlatif, féminin et
  pluriel des adjectifs français, conjugaison du présent et de l'imparfait ;
- depuis la version 3, les **tables de traduction** — « Übersetzungen » dans
  l'édition allemande, « traductions » dans la française — avec le numéro du
  sens que chacune sert.

### Les traductions du Wiktionnaire, et ce qu'elles changent

Jusqu'à la version 2, WikDict décidait seul de ce qui entrait au dictionnaire :
`wiktionnaire.py` jetait toute vedette dont la clé lui était inconnue, et ne
regardait pas une seule fois le champ `translations`. Le lexique plafonnait donc
à ce que le filtre d'attestation de WikDict avait bien voulu laisser passer.

`build/traductions.py` lit ces tables. Il en tire deux choses distinctes :

- **des traductions pour des sens qui n'en avaient pas.** C'est le gain
  principal, et le moins visible. Un sens que le Wiktionnaire décrit et que
  WikDict ne traduit pas s'affichait « sens sans traduction connue » : une
  définition à déchiffrer, et rien à apprendre. La part des sens traduits passe
  de 51 % à 89 % du côté français, de 69 % à 81 % du côté allemand ;
- **des vedettes entièrement nouvelles** — 4 253 allemandes, 1 768 françaises —
  absentes de WikDict et traduites par le Wiktionnaire : *Pfefferspray*,
  *Gelaber*, *Dorfstraße*, *bzw.*, *néophobie*, *planétarium*, *est-ce que*.

Une vedette n'entre que si elle porte **au moins une traduction attestée**. Le
Wiktionnaire décrit 108 000 vedettes allemandes ; les verser toutes ferait un
dictionnaire monolingue deux fois plus gros où un mot sur deux ne répondrait pas
à la question qu'on lui pose. Rien n'est fabriqué : une traduction retenue ici
est une traduction que le Wiktionnaire écrit, sous le sens où il l'écrit.

Une vedette dont la **clé** existe déjà n'entre pas non plus. « Gehen » le nom
et « gehen » le verbe partagent la clé `gehen` ; les verser côte à côte
fabriquerait deux résultats concurrents là où la greffe des sens fait déjà le
travail sur l'entrée existante.

Deux éditions et non une : l'édition allemande décrit les mots allemands **en
allemand**, la française les mots français **en français**. L'édition anglaise
aurait tenu en un fichier et donné des définitions en anglais, inutilisables ici.

L'appariement des sens avec ceux de WikDict est décrit dans
`build/alignement.py` et mesuré par `build/verifier.py` : **95,7 % des sens
allemands et 84,9 % des sens français du noyau** portent au moins un exemple.

### Les expressions usuelles

Depuis la version 3.1, l'application distingue les **expressions usuelles** —
locutions, tournures, formules de conversation, proverbes — des mots à
plusieurs morceaux qui restent des mots (« base de données », « Republik
Kuba »). Elles se cherchent par n'importe lequel de leurs mots, dans les deux
langues, et se retrouvent au bas de la fiche de chacun. `build/expressions.py`
les reconnaît, les complète et les indexe ; trois sources s'y ajoutent, dans cet
ordre de confiance.

**1. Le dictionnaire lui-même.** WikDict et les tables de traduction du
Wiktionnaire portent déjà des milliers d'expressions traduites, mêlées aux
mots. On les reconnaît à leur nature — verbe, adverbe, adjectif, interjection,
locution, ou rien du tout, car DBnary laisse les tournures allemandes sans
nature — et à la taxonomie du Wiktionnaire lui-même, qui range « simple comme
bonjour » dans « Expressions en français » alors qu'il en fait un adjectif.
Les noms et noms propres sont écartés, les verbes pronominaux aussi.

**2. Une attestation lexicale, un équivalent de Tatoeba.** « kein Problem »,
« viel Glück », « keine Ahnung » n'ont de traduction dans aucune table, et de
page ni dans l'édition allemande ni dans la française du Wiktionnaire. Le
**Wiktionnaire anglais** les décrit — c'est ce qu'on lui demande, et rien
d'autre, ses gloses étant en anglais :

- `https://kaikki.org/dictionary/German/pos-{phrase,intj,proverb,prep_phrase}/…`
- `https://kaikki.org/dictionary/French/pos-{phrase,intj,proverb,prep_phrase}/…`
  — huit fichiers, 5,4 Mo en tout, mêmes licence et provenance que le reste du
  Wiktionnaire (CC BY-SA, GFDL).

L'équivalent vient alors de **Tatoeba**, où ces formules figurent en phrases
complètes traduites par des locuteurs — mais seulement sur deux signaux
indépendants : plusieurs traductions distinctes de la même phrase, ou une
expression que deux éditions du Wiktionnaire décrivent. Tatoeba aligne des
phrases, pas des expressions : « Nach links ! » se traduit par « Tourne à
gauche ! », qui n'est pas l'équivalent de « nach links ». On ne prend jamais
une phrase de Tatoeba seule pour une expression.

**3. L'édition d'en face.** Le Wiktionnaire français décrit « keine Ahnung » en
français — « Aucune idée. Je n'en sais rien. » — et l'allemand décrit des
expressions françaises en allemand. Une glose de quatre mots au plus est un
équivalent ; une glose plus longue est une explication, gardée pour ce qu'elle
est et affichée sous la vedette. Cette source n'atteste rien à elle seule :
elle enrichit ce que sa propre édition ou l'anglaise a déjà attesté.

Ce qui n'a ni traduction ni équivalent attesté n'est pas inventé. Une expression
que le Wiktionnaire range lui-même parmi ses expressions entre tout de même,
avec sa définition et, s'il s'en trouve, une phrase de Tatoeba qui la contient —
mais sa fiche dit qu'aucun équivalent n'est connu, elle ne se révise pas, et le
manifeste la compte à part (`expressions_sans_equivalent`). Le noyau, lui, n'en
reçoit aucune : il ne contient que des expressions traduites, faites de ses
propres mots.

Chaque expression dit sa provenance sur sa fiche : `dico` (une table de
traduction), `tatoeba`, `croisee` (glose de l'édition d'en face), `attestee`
(définition seule).

## 4. Ce que nous ne pouvons pas utiliser

Deux dictionnaires ont été demandés, envisagés, et écartés — non par choix
technique mais parce que leurs conditions l'interdisent.

**Le Dictionnaire de l'Académie française.** Ses conditions générales
d'utilisation interdisent explicitement « d'utiliser un système automatisé pour
aspirer ou extraire les données du site », et ne concèdent aucune licence de
réutilisation : l'Académie conserve l'intégralité de ses droits. La 8ᵉ édition
(1932-1935) est, elle, dans le domaine public, mais décrit un français de
quatre-vingt-dix ans — d'un intérêt historique certain et d'un intérêt nul pour
qui apprend la langue d'aujourd'hui.

**Le Duden.** Ressource entièrement commerciale, sans jeu de données libre.

Le Wiktionnaire remplit le même office et se laisse redistribuer : c'est
pourquoi il est ici. Nous préférons le dire plutôt que de laisser croire à un
oubli.

Les listes de vocabulaire officielles des certifications (Goethe-Institut, telc,
DELF/DALF) sont également protégées. L'application n'affiche donc **aucun niveau
A1/A2/B1** : elle classe le vocabulaire par fréquence d'usage constatée, ce qui
est mesurable, vérifiable et libre.

## 5. Sept entrées écrites pour l'application

WikDict ne retient que les entrées dotées d'une traduction bien attestée, et
quelques mots-outils français passent au travers. Sept d'entre eux sont donc
rédigés à la main, dans `build/grammaire.py` :

    mon, notre, votre, leur, ce, celui, ne

Ce sont les tout premiers mots qu'un débutant cherche — « mes », « cette »,
« ne … pas » figurent parmi les vingt formes les plus fréquentes du corpus
qu'aucune entrée ne savait résoudre. Rien d'autre n'est ajouté : le reste du
dictionnaire vient des sources, avec ses qualités et ses manques, et il n'est
pas question de le retoucher mot à mot — on ne saurait plus ce qui vient d'où.

Le côté allemand est complet ; *mein*, *dieser*, *nicht*, *kein* y sont tous.

## 6. Ce que nous ajoutons

Le code de l'application, les regroupements par famille de mots, les listes
thématiques et les bandes de fréquence sont notre travail. Les familles de mots
sont calculées par un procédé automatique décrit dans `familles.py`, corrigé à la
main dans `exclusions.txt` : ce sont des **voisinages utiles**, pas des assertions
étymologiques, et l'interface les présente comme tels.
