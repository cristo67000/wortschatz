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
- **Licence** : Creative Commons Attribution — Partage dans les mêmes conditions
  3.0 non transposé (CC BY-SA 3.0), telle qu'annoncée dans l'en-tête TEI.
  <https://creativecommons.org/licenses/by-sa/3.0/legalcode>
- **Source amont** : Wiktionnaire (<https://www.wiktionary.org/>), via DBnary
  (<http://kaiko.getalp.org/about-dbnary/>), projet de Gilles Sérasset.

Ce que nous en tirons : la forme vedette, la transcription phonétique (API), la
nature grammaticale, **le genre des noms allemands**, les formes fléchies, la
définition en langue source et les traductions. Les bases SQLite ne servent qu'à
une chose : `simple_translation.rel_importance`, qui dit à quel point un mot est
courant, et qui sert à classer le vocabulaire par bandes de fréquence.

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

## 3. Sept entrées écrites pour l'application

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

## 4. Ce que nous ajoutons

Le code de l'application, les regroupements par famille de mots, les listes
thématiques et les bandes de fréquence sont notre travail. Les familles de mots
sont calculées par un procédé automatique décrit dans `familles.py`, corrigé à la
main dans `exclusions.txt` : ce sont des **voisinages utiles**, pas des assertions
étymologiques, et l'interface les présente comme tels.

## 5. Ce que nous ne pouvons pas utiliser

Les listes de vocabulaire officielles des certifications (Goethe-Institut, telc,
DELF/DALF) sont protégées. L'application n'affiche donc **aucun niveau A1/A2/B1** :
elle classe le vocabulaire par fréquence d'usage constatée, ce qui est mesurable,
vérifiable et libre.
