#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Les vedettes que le TEI de WikDict n'a pas encore : sa base SQLite.

── Pourquoi ce fichier existe (version 3.4) ────────────────────────────────

Le dictionnaire bilingue vient du fichier TEI « recommended » de WikDict. Sa
mouture date du 21 novembre 2025 et n'a pas été republiée depuis, alors que les
bases SQLite du même projet, déjà téléchargées pour d'autres usages, en sont à
la mouture 2026-06. Entre les deux, le Wiktionnaire a gagné des traductions —
et le TEI ignore des mots de tous les jours :

    mission, faveur, définition, norme, divers, similaire, mobilité, inspiration
    Stabilität, Konstruktion, Kommando, Grundsatz, blockieren, Signal, Video

Ni l'un ni l'autre n'est une rareté. Ils manquaient pour une raison
d'intendance, pas de qualité : leur traduction est arrivée au Wiktionnaire
après la dernière publication du TEI, ou elle vit dans un format de table que
wiktextract ne sait pas lire (« Stabilität » a bien sa table « Übersetzungen »,
mais l'extraction kaikki la manque) et que DBnary, en amont de WikDict, lit.

La table `translation` de la base donne, sens par sens, ce que le TEI donnerait :
la vedette, sa nature (dans l'identifiant `lexentry`), la glose du sens et ses
traductions. Même source, même licence, même format une fois relu ici — tout ce
qui suit dans la construction n'en voit pas la différence.

── Ce qu'on garde, et ce qu'on laisse ──────────────────────────────────────

La base mêle des traductions sûres et des devinettes. On ne garde que :

* les lignes rattachées à une vraie entrée du Wiktionnaire (`lexentry`). Celles
  qui n'en ont pas sont **inférées** depuis l'autre langue, et l'échantillon
  relu en dit assez : « une → befördern », « au → Knast schieben »,
  « das → cela » ;
* les lignes que WikDict juge bonnes (`is_good`) ou dont le score atteint
  `SCORE_MIN`. En dessous, sur 75 lignes relues, une sur deux est fausse :
  « Pasta → diffuser », « Befall → apostropher », « Einschlag → aboyer ».

Et l'on écarte :

* les affixes et les éléments de composition (« Lieblings- », « -fähig ») ;
* les prénoms et noms de famille — ce n'est pas du vocabulaire ;
* un nom propre que l'autre langue écrit à l'identique (« Manchester »,
  « Southampton ») : la fiche n'apprendrait rien ;
* une traduction par un nom allemand d'un adjectif, d'un adverbe ou d'un verbe
  français : « gouvernemental → Regierung », « intérieurement → Innen- ».
  C'est la seule incohérence que la graphie trahit à coup sûr — l'allemand met
  une majuscule à ses noms.

Usage, pour voir ce que la base apporterait :
    python build/wikdict_sqlite.py
"""

import re
import sqlite3
from collections import Counter
from pathlib import Path

import commun
import traductions

SOURCES = Path(__file__).resolve().parent / "sources"
BASES = {"de": "de-fr.sqlite3", "fr": "fr-de.sqlite3"}

# En dessous, la traduction est une devinette (voir plus haut).
SCORE_MIN = 10

SENS_MAX = 3
TRADUCTIONS_MAX = 6

# Nature de la base (deuxième segment du `lexentry`) → nature du TEI, qui est
# le vocabulaire de l'application. Une nature absente de la table n'entre pas :
# mieux vaut un mot de moins qu'une fiche à l'étiquette inventée.
NATURES = {
    "de": {
        "Substantiv": "n", "Verb": "v", "Adjektiv": "adj", "Adverb": "adv",
        "Lokaladverb": "adv", "Temporaladverb": "adv", "Modaladverb": "adv",
        "Konjunktionaladverb": "adv", "Interrogativadverb": "adv",
        "Pronominaladverb": "pronominalAdverb", "Interjektion": "interjection",
        "Grußformel": "interjection", "Onomatopoetikum": "interjection",
        "Antwortpartikel": "particle", "Partikel": "particle",
        "Gradpartikel": "particle", "Modalpartikel": "particle",
        "Fokuspartikel": "particle", "Vergleichspartikel": "particle",
        "Numerale": "numeral", "Präposition": "preposition",
        "Postposition": "postposition", "Konjunktion": "conjunction",
        "Subjunktion": "conjunction", "Abkürzung": "abbreviation",
        "Indefinitpronomen": "indefinitePronoun",
        "Demonstrativpronomen": "demonstrativePronoun",
        "Personalpronomen": "pronoun", "Possessivpronomen": "pronoun",
        "Relativpronomen": "pronoun", "Interrogativpronomen": "pronoun",
        "Reflexivpronomen": "pronoun", "Reziprokpronomen": "pronoun",
        "Pronomen": "pronoun", "Artikel": "article",
        "Eigenname": "pn", "Toponym": "pn",
        "Wortverbindung": "locution", "Redewendung": "locution",
        "Sprichwort": "locution", "Formel": "locution",
        "Geflügeltes_Wort": "locution",
    },
    "fr": {
        "nom": "n", "adj": "adj", "verb": "v", "adv": "adv", "nompr": "pn",
        "interjection": "interjection", "onomatopée": "interjection",
        "préposition": "preposition", "conjonction": "conjunction",
        "conjonction_de_coordination": "conjunction",
        "adjectif_numéral": "numeral", "pronom": "pronoun",
        "pronom_personnel": "pronoun", "pronom_indéfini": "indefinitePronoun",
        "pronom_possessif": "pronoun", "pronom_interrogatif": "pronoun",
        "pronom_démonstratif": "demonstrativePronoun", "pronom_relatif": "pronoun",
        "adverbe_interrogatif": "adv", "adverbe_relatif": "adv",
        "adjectif_indéfini": "adj", "adjectif_possessif": "determiner",
        "adjectif_interrogatif": "adj", "adjectif_exclamatif": "adj",
        "article_défini": "article", "article_indéfini": "article",
        "article_partitif": "article",
        "locutionphrase": "locution", "locution_phrase": "locution",
        "locution": "locution", "proverbe": "locution",
    },
}

# Les natures qui disent « nom propre ».
PROPRES = {"pn"}

# Natures du Wiktionnaire français où une traduction par un nom allemand est
# forcément une erreur de rattachement.
NON_NOMINALES = {"adj", "adv", "v"}


def nature_de(lexentry, langue):
    """« deu/Konstruktion__Substantiv__1 » → « n » ; None si la nature
    n'est pas de celles qu'on garde."""
    morceaux = (lexentry or "").split("__")
    if len(morceaux) < 2:
        return None
    return NATURES[langue].get(morceaux[1])


def vedette_utile(mot):
    """Écarte les affixes, les numéros, les vedettes qui ne sont pas des mots."""
    if not mot or len(mot) > traductions.VEDETTE_MAX:
        return False
    if mot.startswith("-") or mot.endswith("-"):
        return False
    if "|" in mot or "\n" in mot:
        return False
    return bool(re.search(r"[^\W\d_]", mot, flags=re.UNICODE))


def traductions_utiles(brut, langue, nature):
    """« portable | téléphone portable » → la liste des traductions gardées."""
    sortie = []
    for morceau in (brut or "").split("|"):
        mot = traductions.nettoyer(morceau)
        if not mot or not vedette_utile(mot):
            continue
        # Un adjectif, un adverbe ou un verbe français ne se traduit pas par un
        # nom allemand : « gouvernemental → Regierung ». Les sigles (« ADN »,
        # tout en capitales) ne sont pas des noms communs et passent.
        if (langue == "fr" and nature in NON_NOMINALES
                and mot[:1].isupper() and not mot.isupper()):
            continue
        if mot not in sortie:
            sortie.append(mot)
    return sortie


def recevable(ligne):
    """La ligne est-elle sûre ? Voir l'en-tête : `lexentry`, puis la note."""
    lexentry, _num, _sens, _mot, _trads, score, bon = ligne
    if not lexentry:
        return False
    return bool(bon) or (score or 0) >= SCORE_MIN


def lire(langue, journal=None):
    """Les entrées de la base, au format de `tei.lire()`, groupées par
    `lexentry` — une entrée du Wiktionnaire, une lecture.

    Rend une liste de dictionnaires {mot, pos, genre, pron, montrer, flechies,
    sens}. Genre, prononciation et formes restent vides : la base ne les porte
    pas, `construire.py` les prend au Wiktionnaire.
    """
    compte = Counter()
    chemin = SOURCES / BASES[langue]
    if not chemin.exists():
        if journal is not None:
            journal["absente"] = True
        return []
    lien = sqlite3.connect(f"file:{chemin}?mode=ro", uri=True)
    groupes = {}
    requete = ("SELECT lexentry, sense_num, sense, written_rep, trans_list, score, "
               "is_good FROM translation WHERE lexentry IS NOT NULL")
    for ligne in lien.execute(requete):
        compte["lignes"] += 1
        lexentry, num, sens, mot, trads, _score, _bon = ligne
        if not recevable(ligne):
            compte["douteuses"] += 1
            continue
        nature = nature_de(lexentry, langue)
        if nature is None:
            compte["natures_ecartees"] += 1
            continue
        mot = (mot or "").strip()
        if not vedette_utile(mot):
            compte["vedettes_ecartees"] += 1
            continue
        liste = traductions_utiles(trads, langue, nature)
        if not liste:
            compte["sans_traduction"] += 1
            continue
        if nature in PROPRES or (langue == "de" and nature == "n"
                                 and all(t[:1].isupper() for t in liste)):
            # Un nom propre écrit pareil des deux côtés n'apprend rien. En
            # allemand, tous les noms portent la majuscule : c'est la
            # traduction française, en capitale, qui trahit le nom propre.
            liste = [t for t in liste if commun.cle(t) != commun.cle(mot)]
            if not liste:
                compte["propres_identiques"] += 1
                continue
        groupe = groupes.setdefault(lexentry, {"mot": mot, "pos": nature, "sens": {}})
        bloc = groupe["sens"].setdefault(num or "", {"def": "", "trads": []})
        if sens and not bloc["def"]:
            bloc["def"] = " ".join(str(sens).split())
        for t in liste:
            if t not in bloc["trads"]:
                bloc["trads"].append(t)
    lien.close()

    sortie = []
    for lexentry in sorted(groupes):
        groupe = groupes[lexentry]
        # Les sens numérotés dans l'ordre du Wiktionnaire ; ceux sans numéro —
        # la base n'a pas su les rattacher — à la suite.
        cles = sorted(groupe["sens"], key=lambda n: (n == "", n))
        blocs = [groupe["sens"][n] for n in cles]
        blocs = [b for b in blocs if b["trads"]][:SENS_MAX]
        for b in blocs:
            b["trads"] = b["trads"][:TRADUCTIONS_MAX]
        sortie.append({
            "mot": groupe["mot"], "pos": groupe["pos"], "genre": "", "pron": "",
            "montrer": [], "flechies": [], "sens": blocs,
            "lexentry": lexentry,
        })
    compte["entrees"] = len(sortie)
    if journal is not None:
        journal.update(compte)
    return sortie


def vedettes(langue):
    """Les clés de toutes les vedettes que la base fournirait — pour que
    l'extraction du Wiktionnaire garde leurs entrées."""
    return {commun.cle(e["mot"]) for e in lire(langue)}


if __name__ == "__main__":
    import tei
    for langue, fichier in (("de", "deu-fra.tei"), ("fr", "fra-deu.tei")):
        connues = {b["mot"] for b in tei.lire(SOURCES / fichier)}
        journal = {}
        entrees = lire(langue, journal)
        neuves = [e for e in entrees if e["mot"] not in connues]
        print(f"{langue} : {journal}")
        print(f"     {len(neuves)} entrées absentes du TEI, "
              f"{len({e['mot'] for e in neuves})} vedettes")
        for e in neuves[:: max(1, len(neuves) // 20)][:20]:
            print(f"     {e['mot']:28} {e['pos']:6} "
                  f"{' / '.join(e['sens'][0]['trads'][:3])}")
