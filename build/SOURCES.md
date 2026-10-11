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

### Les vedettes que le TEI n'a pas encore (version 3.4)

Le TEI « recommended » n'a pas été republié depuis le 21 novembre 2025 ; la
base SQLite du même projet en est à la mouture 2026-06. Entre les deux, des
mots de tous les jours ont reçu leur traduction — *mission*, *faveur*,
*définition*, *norme*, *divers*, *Stabilität*, *Konstruktion*, *blockieren*,
*Signal*, *Video* — et le TEI les ignorait. `build/wikdict_sqlite.py` lit la
table `translation` de `de-fr.sqlite3` et `fr-de.sqlite3` (sens par sens : la
glose et ses traductions) et verse au dictionnaire les vedettes absentes du TEI,
**5 986 allemandes et 9 368 françaises**. Le TEI garde la main sur tout ce qu'il
connaît ; le genre, la prononciation et les formes de ces vedettes viennent du
Wiktionnaire.

La base mêle des traductions sûres et des devinettes ; on ne garde que les
lignes rattachées à une entrée du Wiktionnaire (`lexentry`) **et** jugées bonnes
par WikDict (`is_good`) ou de score au moins 10. En dessous, sur 75 lignes
relues, une sur deux était fausse (« Pasta → diffuser », « Befall →
apostropher »). Sont aussi écartés : les affixes, les prénoms et noms de
famille, un nom propre écrit pareil dans les deux langues (« Manchester »), et
la traduction d'un adjectif, d'un adverbe ou d'un verbe français par un nom
allemand (« gouvernemental → Regierung »), seule incohérence que la graphie
trahit à coup sûr.

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
« phrase à trou » et de corpus consultable pour les expressions ; et l'un des
deux témoins de la fréquence d'usage (voir § 2 bis).

## 2 bis. wordfreq — la fréquence d'usage réelle (version 3.4)

- **Projet** : <https://github.com/rspeer/wordfreq> — Robyn Speer, version
  3.1.1 (listes « large » de l'allemand et du français)
- **Licence des données** : Creative Commons Attribution — Partage dans les
  mêmes conditions 4.0 (CC BY-SA 4.0) ; le code est sous licence Apache 2.0.
  <https://creativecommons.org/licenses/by-sa/4.0/legalcode>
- **Ce qu'il agrège** : sous-titres de films et de séries, réseaux sociaux,
  presse, Wikipédia, livres. Le détail des sources et de leurs licences est
  dans le dépôt de wordfreq.

wordfreq n'est pas redistribué : il ne sert qu'à la construction, et rien de
lui n'est recopié dans `data/` sinon le **rang** des mots. Il sert à trois
choses :

1. **Classer le vocabulaire.** Jusqu'à la version 3.3, le rang venait du seul
   Tatoeba : quelques millions de mots écrits par des apprenants, où « Tom » est
   le douzième mot de l'allemand et où un mot absent passait pour rare, quel que
   soit son usage. Le rang est désormais la **moyenne géométrique** des deux
   témoins : un mot courant dans la langue *et* dans les phrases d'apprenants
   passe devant un mot que l'un des deux seulement connaît — « Hund » devant
   « Bundesregierung », que la presse seule ferait monter. Tatoeba étant petit,
   un mot qu'il n'emploie pas reçoit de wordfreq un a priori plutôt qu'un zéro :
   « Workshop » n'est plus jeté parmi les raretés.
2. **Attester les formes engendrées par règle** — conjugaisons françaises,
   déclinaisons allemandes — en plus de Tatoeba : une forme n'entre à l'index
   que si l'un des deux l'emploie (2,5 sur l'échelle de Zipf pour wordfreq,
   assez pour « produisent », trop peu pour la faute « appelent »).
3. **Choisir les mots courants** que les gloses croisées et le supplément
   éditorial font entrer (3 sur l'échelle de Zipf, une occurrence par million
   de mots).

Quatre défauts du classement précédent ont été trouvés et corrigés en chemin :
l'apostrophe typographique des vedettes (« aujourd’hui » ne rencontrait jamais
l'« aujourd'hui » de Tatoeba : le mot était classé rare, hors du noyau) ; le
premier mot de chaque phrase écarté du décompte (« Tja », « Danke »,
« Bonjour » passaient pour rares) ; l'auxiliaire rangé parmi les formes d'un
verbe par le TEI (« bauchreden » héritait de la fréquence de « haben » et
figurait parmi les mille deux cents premiers mots) ; et les lettres seules
rangées parmi les formes (« Urethan » avait pour formes C, H, N et O).

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

### Les gloses de l'édition d'en face, et toutes les formes (version 3.4)

Le Wiktionnaire français décrit des dizaines de milliers de mots allemands **en
français**, l'allemand des milliers de mots français **en allemand** ; ces gloses
sont, le plus souvent, des traductions — « Handy » → *Téléphone portable*,
« Kita » → *Crèche*, « abgeschlagen » → *fatigué, crevé*. Jusqu'ici on n'en
lisait que les expressions. `build/croisees.py` (d'après le module du même nom
de l'application Vocabulary) s'en sert désormais pour **créer les vedettes
courantes que rien d'autre ne traduit** — 817 allemandes et 113 françaises —,
à trois conditions : l'usage est attesté (wordfreq ou Tatoeba), le mot a son
entrée dans l'édition de sa langue, qui donne définition, exemple, genre et
formes, et ce n'est pas une forme fléchie d'une vedette déjà là. Une glose qui
n'est qu'un renvoi (« tschüss » → *Variante de tschüs.*) fait de la graphie
une forme de sa vedette. La liste des vedettes créées est écrite à chaque
construction dans `build/croisees-creees.tsv`, pour relecture.

L'extraction garde aussi, pour chaque nom, verbe et adjectif, **toutes ses
formes d'un mot** (le champ `ff`), et pas seulement la douzaine que la fiche
affiche : qui lit « zeitlosen » ou « blockierte » doit arriver à « zeitlos » et
« blockieren », y compris pour les vedettes que le TEI n'a pas.

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
une phrase de Tatoeba seule pour une expression. Et chaque équivalent relevé
passe encore deux filtres : rien qui reste en suspens (« Alors là… »), rien qui
déborde l'expression de plus de deux mots (« Je te souhaite bonne chance » pour
« viel Glück » traduit la phrase, pas la formule) ; trois équivalents au plus,
les mieux attestés d'abord. Plusieurs traductions ne prouvent pas qu'une
traduction convient à tous les emplois : ce que Tatoeba donne est attesté **en
contexte**, et la fiche le dit.

**3. L'édition d'en face.** Le Wiktionnaire français décrit « keine Ahnung » en
français — « Aucune idée. Je n'en sais rien. » — et l'allemand décrit des
expressions françaises en allemand. Une glose de quatre mots au plus est un
équivalent ; une glose plus longue est une explication, gardée pour ce qu'elle
est et affichée sous la vedette. Cette source n'atteste rien à elle seule :
elle enrichit ce que sa propre édition ou l'anglaise a déjà attesté.

**4. Le supplément éditorial.** Les sources s'arrêtent où elles s'arrêtent :
« alles gut », « moins que rien », « simple comme bonjour » n'ont d'équivalent
nulle part, « Ich habe keine Lust » n'a de page dans aucune édition — c'est une
phrase, pas un lemme, et pourtant c'est ce qu'on dit. Et une table de
traduction se trompe parfois : WikDict rend « au petit bonheur la chance » par
« querbeet », qui veut dire « pêle-mêle ». Pour cela il y a
[`expressions_editoriales.json`](expressions_editoriales.json) : une poignée
d'entrées relues à la main, avec pour chacune ses sens, ses équivalents
vérifiés, un exemple rédigé et traduit, une explication de contexte quand il
en faut, et — c'est le plus important — la liste de ce qu'on a **écarté** des
sources et pourquoi, écrite pour être contredite. Le supplément passe en
dernier, par-dessus tout : une entrée qui existait garde sa vedette, sa
prononciation, ses formes et ses citations du Wiktionnaire (chaque sens dit
lesquelles il reprend), et reçoit les sens et les équivalents relus. Sa
provenance devient `editorial`, et la fiche dit que des mains humaines sont
passées. Le supplément n'est pas une source de plus : c'est un correctif, et
il doit rester petit.

Ce qui n'a ni traduction ni équivalent attesté n'est pas inventé. Une expression
que le Wiktionnaire range lui-même parmi ses expressions entre tout de même,
avec sa définition et, s'il s'en trouve, une phrase de Tatoeba qui la contient —
mais sa fiche dit qu'aucun équivalent n'est connu, elle ne se révise pas, les
résultats la placent après les expressions traduites avec la mention « sans
équivalent — à consulter », et le manifeste compte les deux à part
(`expressions_traduites`, `expressions_sans_equivalent`). Le noyau, lui, n'en
reçoit aucune : il ne contient que des expressions traduites, faites de ses
propres mots — et tout le supplément éditorial.

Chaque expression dit sa provenance sur sa fiche : `dico` (une table de
traduction), `tatoeba`, `croisee` (glose de l'édition d'en face), `attestee`
(définition seule), `editorial` (relue à la main).

L'index par mot (`expressions-<langue>.idx`) est **complet** : chaque
expression y figure sous chacun de ses mots et de ceux de ses traductions,
sans plafond. « de » réunit près de deux mille expressions dans le paquet
complet ; une ligne de cinquante kilooctets se lit en une dichotomie, tandis
qu'un plafond aurait rendu la quarante-et-unième introuvable pour toujours, y
compris par « de » suivi d'un second mot qui l'aurait isolée. Sous chaque mot,
les expressions traduites passent devant les autres ; c'est à l'affichage de
n'en montrer que six, puis deux douzaines à chaque « Voir plus », jusqu'à la
dernière.

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

## 5. Ce qui est écrit pour l'application

### Sept entrées grammaticales

WikDict ne retient que les entrées dotées d'une traduction bien attestée, et
quelques mots-outils français passent au travers. Sept d'entre eux sont donc
rédigés à la main, dans `build/grammaire.py` :

    mon, notre, votre, leur, ce, celui, ne

Ce sont les tout premiers mots qu'un débutant cherche — « mes », « cette »,
« ne … pas » figurent parmi les vingt formes les plus fréquentes du corpus
qu'aucune entrée ne savait résoudre. Rien d'autre n'est ajouté : le reste du
dictionnaire vient des sources, avec ses qualités et ses manques, et il n'est
pas question de le retoucher mot à mot — on ne saurait plus ce qui vient d'où.

Le côté allemand a ses vedettes — *mein*, *dieser*, *nicht*, *kein* y sont
toutes —, mais pas leurs **formes** : le TEI n'en donne aucune pour les articles,
les pronoms et les déterminants, et « das », « eine », « ihm », « deinen » ou
« im » ne menaient nulle part. Depuis la version 3.4, `grammaire.py` porte leur
déclinaison, liste close de toutes les grammaires (et les contractions :
« im », « zur », « beim »…). Ce ne sont pas des entrées, seulement des renvois
vers des vedettes existantes.

### Le supplément éditorial des mots courants (version 3.4)

Après WikDict, sa base SQLite, les tables du Wiktionnaire et les gloses de
l'édition d'en face, la construction mesure ce qui manque encore : des mots que
tout le monde emploie (wordfreq ≥ 3,6), que le Wiktionnaire de leur langue
décrit, et qu'**aucune source libre ne traduit**. Une liste fermée de ces mots
est traduite dans [`mots_editoriaux.json`](mots_editoriaux.json) — 75 allemands
(*naja*, *sorry*, *nochmal*, *Abo*, *Pommes*, *Prof*, *Rückweg*…) et 168
français (*bof*, *bah*, *resto*, *ordi*, *appli*, *nettement*, *similaire*,
*répartition*, *affronter*…) —, avec une vingtaine de graphies familières
rattachées à leur vedette (« heut » → *heute*, « bcp » → *beaucoup*).

- **Provenance** : traductions rédigées pour l'application par un assistant
  d'écriture (Claude, Anthropic), le 2026-10-11 ; **non relues par un locuteur
  natif**.
- **Ce qui n'est pas rédigé** : la définition, les exemples, la prononciation et
  les formes, qui viennent du Wiktionnaire de la langue du mot.
- **Une source passe toujours devant** : une entrée n'est appliquée qu'à un mot
  encore absent ; le jour où WikDict le traduit, elle cède sa place d'elle-même
  et la construction le signale.
- **Licence** : CC BY-SA 4.0.

## 6. Les phrases et dialogues — un contenu rédigé pour l'application

`data/conversation.json` : 280 phrases et 40 dialogues (260 répliques), rangés
en onze situations — saluer et se présenter, demander son chemin, transports,
restaurant, achats, hôtel, rendez-vous, demander de l'aide, faire répéter, et,
depuis la version 3.3, au quotidien (réagir, proposer, encourager) et recevoir
ou être invité. La 3.2 en comptait 148 et 26 ; la 3.3 ajoute 132 phrases et
14 dialogues autour des expressions courantes — « ça marche », « pas de
souci », « ce n'est pas grave », « ça dépend », « ça vaut le coup », « j'ai
hâte », « tiens-moi au courant », « je me débrouille », « je croise les doigts
pour toi », « bon courage » — données en situation, tutoiement et vouvoiement
distingués.

- **Provenance** : contenu original, écrit pour Wortschatz par un assistant
  d'écriture (Claude, Anthropic) — le 2026-09-20 pour la version 3.2, le
  2026-09-21 pour les ajouts de la 3.3. Aucune source externe n'a été copiée ;
  aucun manuel, aucun guide de conversation n'a été reproduit.
- **Contrôles** : `build/essais_conversation.mjs` vérifie à chaque exécution la
  structure, l'unicité des identifiants, le nombre de répliques (4 à 8), la
  cohérence du tutoiement et du vouvoiement — dans une phrase, entre ses deux
  langues, et dans tout un dialogue —, la ponctuation française et allemande,
  et l'absence de doublons non déclarés.
- **Ce qui a été relu, et ce qui ne l'a pas été** : le texte allemand des
  26 dialogues de la version 3.2 a été validé par une locutrice native. Chacun
  de ces dialogues porte `"relu": { "de": "natif" }` ; c'est la seule forme
  reconnue, et `essais_conversation.mjs` vérifie qu'elle n'est posée que là.
  Cette validation ne s'étend pas : ni aux phrases isolées — même quand un
  dialogue validé les reprend, leurs variantes et leur notice n'ont pas été
  vues —, ni aux traductions françaises, ni aux 132 phrases et 14 dialogues
  de la 3.3, qui restent **non relus par un locuteur natif** tant que la
  relecture n'a pas été confirmée. Le fichier le dit dans son champ
  `provenance`, l'application le dit sur chaque fiche — deux mentions
  distinctes —, et `confidentialite.html` le redit. Ce qui attend relecture
  est rassemblé dans `RELECTURE-3.3.md`, dans l'ordre des répliques. Une
  formulation jugée peu naturelle se corrige dans le fichier, sans toucher aux
  identifiants — les cartes de révision ne portent jamais le texte.
- **Passerelle vers les expressions usuelles** : quand une phrase contient,
  mot pour mot, une expression du dictionnaire à plusieurs mots — « kein
  Problem », « alles klar », « bon courage » —, sa fiche y mène
  (`Conversation.expressionsDans`). Rien n'est fusionné : la phrase et
  l'expression gardent chacune leurs cartes et leurs sens ; la comparaison
  garde les accents pour que « de la rue » ne mène pas à « de là ».
- **Licence** : CC BY-SA 4.0, comme le reste des données.

Ce qu'on écrit soi-même dans le module vit dans IndexedDB (magasin
`conversation`), jamais dans ce fichier.

## 7. Ce que nous ajoutons

Le code de l'application, les regroupements par famille de mots, les listes
thématiques et les bandes de fréquence sont notre travail. Les familles de mots
sont calculées par un procédé automatique décrit dans `familles.py`, corrigé à la
main dans `exclusions.txt` : ce sont des **voisinages utiles**, pas des assertions
étymologiques, et l'interface les présente comme tels.
