#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Le Wiktionnaire intégral : définitions, exemples et flexions, sens par sens.

── Pourquoi cette source ───────────────────────────────────────────────────

WikDict, qui fournit déjà le dictionnaire bilingue, ne retient du Wiktionnaire
que ce qui sert à traduire : la vedette, le genre, une définition abrégée et
les mots correspondants dans l'autre langue. C'est ce qu'il faut pour chercher
un mot, et c'est insuffisant pour l'apprendre. Il manque ce qui fait qu'un mot
se retient : **une phrase par signification**.

Le Wiktionnaire l'a, et le donne : chaque sens porte ses propres exemples,
rédigés ou cités dans la langue du mot. Le dump wiktextract les expose tels
quels, avec en prime la position exacte du mot dans la phrase et la référence
de la citation.

Le Dictionnaire de l'Académie française et le Duden ont été envisagés et
écartés : le premier interdit explicitement l'extraction automatisée et la
redistribution, le second est entièrement commercial. Voir SOURCES.md.

── Deux éditions, pas une ─────────────────────────────────────────────────

L'édition allemande du Wiktionnaire décrit les mots allemands **en allemand**,
la française les mots français **en français**. On prend donc l'une pour le
côté allemand et l'autre pour le côté français. Prendre l'édition anglaise pour
les deux serait plus simple d'un fichier, et donnerait des définitions en
anglais — inutilisables ici.

── Ce que ce fichier produit ──────────────────────────────────────────────

Un extrait compact, `build/sources/wikt-<langue>.jsonl`, qui ne garde que les
vedettes déjà présentes dans le dictionnaire WikDict : la v2 enrichit le
lexique, elle ne le gonfle pas. Sans cette étape intermédiaire, chaque essai de
construction relirait 6,3 Go de français.

Usage :
    python build/wiktionnaire.py            # n'extrait pas ce qui est déjà là
    python build/wiktionnaire.py --forcer
"""

import argparse
import gzip
import json
import re
import sys
import time
from pathlib import Path

import commun
import tei

RACINE = Path(__file__).resolve().parent
SOURCES = RACINE / "sources"

# --- Ce qu'on garde, et ce qu'on laisse -------------------------------------

# Une phrase d'exemple trop courte n'a pas de contexte, trop longue elle coûte
# plus d'efforts qu'elle n'en épargne.
#
# Le plafond a d'abord été fixé à 24 mots, comme pour Tatoeba. Mesure faite, il
# écartait **49 % des exemples français** contre 20 % des allemands : le
# Wiktionnaire français illustre par des citations d'auteurs, longues par
# nature, là où l'allemand rédige des phrases d'école. Un plafond serré ne
# rendait pas les fiches françaises plus lisibles — il les laissait vides.
#
# On accepte donc large, et on **classe** : les exemples sont rendus du plus
# proche de la longueur idéale au plus éloigné, si bien que `construire.py`,
# qui n'en garde que deux ou trois, prend les plus lisibles. La phrase de
# quarante mots ne paraît que lorsqu'il n'y a rien d'autre — ce qui vaut mieux
# que pas d'exemple du tout.
EXEMPLE_MOTS_MIN = 4
EXEMPLE_MOTS_MAX = 40
EXEMPLE_MOTS_IDEAL = 9

# Combien on retient à l'extraction. `construire.py` rognera encore ; ici on
# garde de la marge pour qu'il ait de quoi choisir.
EXEMPLES_PAR_SENS = 6
SENS_MAX = 8
FORMES_MAX = 16          # ce qu'on retient par cœur, pas le tableau entier
VOISINS_MAX = 12

# Une référence de citation peut faire trois lignes ; on garde de quoi créditer.
REFERENCE_MAX = 70

# Le genre, dans le vocabulaire de l'application.
GENRES = {"masculine": "masc", "feminine": "fem", "neuter": "neut"}

# Les natures qui n'apprennent rien : formes fléchies isolées, caractères.
NATURES_ECARTEES = {"character", "punct", "symbol", "romanization"}


def mots_de(texte):
    """Compte grossier des mots d'une phrase, pour la juger en longueur."""
    return re.findall(r"\w+", texte, flags=re.UNICODE)


def nettoyer_api(brut):
    """« [ˈtʁiːbʊs] » et « \\a.kœj\\ » donnent tous deux « ˈtʁiːbʊs ».

    Les deux éditions ne notent pas la prononciation de la même façon :
    l'allemande met des crochets, la française des barres obliques inverses.
    L'application, elle, encadre elle-même ce qu'elle affiche.
    """
    if not brut:
        return ""
    return brut.strip().strip("[]/\\").strip()


def sens_utile(sens):
    """Un sens qui enseigne quelque chose.

    Le Wiktionnaire décrit aussi les formes fléchies — « Nominativ Plural des
    Substantivs Haus » est une entrée à part entière. C'est une indication de
    grammaire, pas une signification : la fiche de « Häuser » n'a pas à
    l'afficher comme un sens, et l'exercice n'a rien à en tirer.
    """
    if sens.get("form_of") or "form-of" in sens.get("tags", ()):
        return False
    if "no-gloss" in sens.get("tags", ()):
        return False
    return bool(sens.get("glosses"))


# Les citations littéraires arrivent enfermées dans leurs guillemets :
# « „Die See lag unbeweglich.“ ». Sur une fiche, ces guillemets ne disent rien —
# on sait qu'on lit un exemple — et ils décalent le mot d'un signe.
PAIRES_DE_GUILLEMETS = (("„", "“"), ("«", "»"), ("“", "”"), ('"', '"'))


def deshabiller(texte, marque):
    """Retire les guillemets qui enferment la citation entière.

    La marque du mot en gras suit le déplacement : elle compte des signes
    depuis le début de la chaîne, et le premier vient de disparaître. L'oublier
    soulignerait « ie S » au lieu de « See » — une faute discrète, qui ne se
    verrait qu'à l'écran et sur un mot au hasard.
    """
    for ouvrant, fermant in PAIRES_DE_GUILLEMETS:
        if len(texte) <= 2 or not texte.startswith(ouvrant) or not texte.endswith(fermant):
            continue
        interieur = texte[len(ouvrant):-len(fermant)]
        # Des guillemets à l'intérieur : ceux du bord ne sont peut-être pas une
        # paire, et on ne sait plus ce qu'on retire. On laisse tel quel.
        if ouvrant in interieur or fermant in interieur:
            break
        decalage = len(ouvrant)
        if marque:
            marque = [marque[0] - decalage, marque[1] - decalage]
        return interieur, marque
    return texte, marque


def marque_saine(texte, marque):
    """La marque désigne-t-elle encore un mot dans le texte ?

    Une position qui déborde, ou qui tombe sur une espace, vaut moins que pas
    de marque du tout : l'application soulignerait n'importe quoi avec aplomb.
    """
    if not marque:
        return None
    debut, fin = marque
    if not (0 <= debut < fin <= len(texte)):
        return None
    return marque if texte[debut:fin].strip() else None


def exemples_de(sens):
    """Les exemples d'un sens, filtrés sur la longueur et crédités.

    `bold_text_offsets` donne la position du mot vedette dans la phrase, telle
    que le Wiktionnaire l'a mise en gras. C'est un cadeau : sans elle il
    faudrait relemmatiser la phrase pour souligner le mot, et se tromper sur
    les composés.
    """
    candidats = []
    for rang, exemple in enumerate(sens.get("examples", ())):
        texte = (exemple.get("text") or "").strip()
        if not texte:
            continue
        longueur = len(mots_de(texte))
        if not (EXEMPLE_MOTS_MIN <= longueur <= EXEMPLE_MOTS_MAX):
            continue
        gras = (exemple.get("bold_text_offsets") or [None])[0]
        marque = [int(gras[0]), int(gras[1])] if gras and len(gras) == 2 else None
        texte, marque = deshabiller(texte, marque)
        marque = marque_saine(texte, marque)
        reference = (exemple.get("ref") or "").strip()
        if len(reference) > REFERENCE_MAX:
            reference = reference[:REFERENCE_MAX].rsplit(" ", 1)[0] + "…"
        # Le rang d'origine départage les ex æquo : à longueur égale, l'ordre
        # du Wiktionnaire, qui met le plus représentatif en tête.
        candidats.append((abs(longueur - EXEMPLE_MOTS_IDEAL), rang,
                          [texte, marque, reference]))

    candidats.sort(key=lambda c: (c[0], c[1]))
    return [c[2] for c in candidats[:EXEMPLES_PAR_SENS]]


def mots_lies(entree, champ):
    """Synonymes, antonymes : le Wiktionnaire les donne en objets."""
    vus = []
    for lien in entree.get(champ, ()):
        mot = (lien.get("word") or "").strip()
        if mot and mot not in vus:
            vus.append(mot)
        if len(vus) >= VOISINS_MAX:
            break
    return vus


# --- Les formes qu'on apprend, et les soixante-dix autres -------------------
#
# Le Wiktionnaire tabule tout : « schnell » y figure sous quarante-huit formes
# déclinées, fortes et faibles, aux quatre cas et aux trois genres. Un
# apprenant n'en mémorise pas une seule de cette façon — il retient
# « schnell, schneller, am schnellsten », et la déclinaison lui vient de la
# grammaire, pas d'une liste.
#
# On ne garde donc que les formes qui s'apprennent par cœur parce que rien ne
# les prédit : le pluriel et le génitif d'un nom allemand, les temps primitifs
# d'un verbe, le comparatif, le féminin d'un adjectif français. Une douzaine au
# lieu de quatre-vingts, ce qui rend les tableaux assez légers pour voyager
# dans l'entrée elle-même — sans paquet séparé ni second téléchargement.
#
# ⚠ La correspondance est **exacte** : l'ensemble des étiquettes doit être
# celui qu'on demande, ni plus ni moins. « indicative present » ne doit pas
# attraper « indicative present perfect », et « plural » sur un nom français ne
# doit pas attraper « plural masculine feminine », qui est autre chose.

FORMES_SIMPLES = {
    ("de", "noun"): (
        ("sg", ("nominative", "singular")),
        ("pl", ("nominative", "plural")),
        ("gen", ("genitive", "singular")),
    ),
    ("de", "verb"): (
        ("pret", ("past",)),
        ("part", ("participle-2", "perfect")),
        ("aux", ("auxiliary", "perfect")),
    ),
    ("de", "adj"): (
        ("comp", ("comparative",)),
        ("sup", ("superlative",)),
    ),
    ("fr", "noun"): (
        ("pl", ("plural",)),
    ),
    ("fr", "adj"): (
        ("fs", ("singular", "feminine")),
        ("mp", ("plural", "masculine")),
        ("fp", ("plural", "feminine")),
    ),
    ("fr", "verb"): (
        ("inf", ("infinitive", "present")),
        ("part", ("participle", "past")),
    ),
}

# Les séries de personnes. Le Wiktionnaire allemand n'étiquette pas la personne
# — « gehe », « gehst », « geht » portent tous trois la seule étiquette
# « present » — et ne se lisent que dans l'ordre. On ne retient donc une série
# que si elle est **complète** : à cinq formes sur six, on ne sait plus laquelle
# manque, et enseigner « tu » pour « il » est pire que ne rien enseigner.
SERIES_DE_FORMES = {
    ("de", "verb"): (
        (("present",), ("pres1", "pres2", "pres3")),
    ),
    ("fr", "verb"): (
        (("indicative", "present"),
         ("pres1", "pres2", "pres3", "pres4", "pres5", "pres6")),
        (("indicative", "imperfect"),
         ("imp1", "imp2", "imp3", "imp4", "imp5", "imp6")),
    ),
}


def formes_de(entree, langue):
    """Les formes à retenir, étiquetées d'un code que l'interface traduira.

    Rend une liste de `[code, graphie, article]`. L'article n'est renseigné que
    pour les noms allemands, où il fait partie de ce qu'on apprend : « das
    Haus » au singulier, « die Häuser » au pluriel — le genre grammatical ne
    change pas, l'article si.
    """
    brutes = []
    for forme in entree.get("forms", ()):
        graphie = (forme.get("form") or "").strip()
        etiquettes = frozenset(t for t in forme.get("tags", ()) if t)
        # Une forme sans étiquette ne se range dans aucun tableau, et une
        # « forme » qui est en fait une note (« kein Plural ») n'en est pas une.
        if not graphie or not etiquettes or len(graphie) > 60:
            continue
        brutes.append((etiquettes, graphie, forme.get("article") or ""))

    nature = entree.get("pos") or ""
    sortie = []
    vus = set()

    for code, tags in FORMES_SIMPLES.get((langue, nature), ()):
        voulu = frozenset(tags)
        for etiquettes, graphie, article in brutes:
            if etiquettes == voulu:
                sortie.append([code, graphie, article])
                vus.add(code)
                break

    for tags, codes in SERIES_DE_FORMES.get((langue, nature), ()):
        voulu = frozenset(tags)
        serie = [(g, a) for e, g, a in brutes if e == voulu]
        if len(serie) != len(codes):
            continue
        for code, (graphie, article) in zip(codes, serie):
            if code not in vus:
                sortie.append([code, graphie, article])

    return sortie[:FORMES_MAX]


def compacter(entree, langue):
    """Une entrée wiktextract → l'enregistrement compact qu'on garde.

    Renvoie None si l'entrée n'apporte rien : pas un seul sens utile.
    """
    sens = []
    for brut in entree.get("senses", ()):
        if not sens_utile(brut):
            continue
        sens.append({
            "d": brut["glosses"][0].strip(),
            "x": exemples_de(brut),
            "th": [t for t in brut.get("topics", ())][:3],
            "t": [t for t in brut.get("tags", ())][:4],
            "i": brut.get("sense_index") or "",
        })
        if len(sens) >= SENS_MAX:
            break
    if not sens:
        return None

    etiquettes = entree.get("tags", ())
    genre = next((GENRES[t] for t in etiquettes if t in GENRES), "")
    api = next((nettoyer_api(s.get("ipa")) for s in entree.get("sounds", ())
                if s.get("ipa")), "")

    return {
        "m": entree["word"],
        "p": entree.get("pos") or "",
        "g": genre,
        "api": api,
        "s": sens,
        "f": formes_de(entree, langue),
        "syn": mots_lies(entree, "synonyms"),
        "ant": mots_lies(entree, "antonyms"),
    }


# --- Lecture du dump --------------------------------------------------------

def motif_de_langue(chemin, langue):
    """La chaîne à chercher dans une ligne brute pour trier sans l'analyser.

    Analyser dix millions de lignes JSON pour n'en garder qu'un dixième coûte
    des minutes. Un test de sous-chaîne sur le texte brut coûte des
    microsecondes. Encore faut-il savoir si le dump écrit `"lang_code":"fr"` ou
    `"lang_code": "fr"` : on regarde la première ligne plutôt que de parier.
    """
    with gzip.open(chemin, "rt", encoding="utf-8", errors="replace") as flux:
        premiere = flux.readline()
    for motif in (f'"lang_code":"{langue}"', f'"lang_code": "{langue}"'):
        if motif.split(":")[0] in premiere:
            separateur = '":"' if '":"' in premiere else '": "'
            return f'"lang_code{separateur}{langue}"'
    return None


def extraire(chemin, langue, vedettes, journal=None):
    """Parcourt le dump et rend les enregistrements compacts à garder.

    `vedettes` est l'ensemble des clés du dictionnaire WikDict : on ne retient
    que ce qui a déjà une fiche. Le Wiktionnaire allemand décrit 966 000 formes,
    dont la quasi-totalité ne sera jamais cherchée par un apprenant.
    """
    motif = motif_de_langue(chemin, langue)
    lues = retenues = 0
    debut = time.time()

    with gzip.open(chemin, "rt", encoding="utf-8", errors="replace") as flux:
        for ligne in flux:
            lues += 1
            if motif and motif not in ligne:
                continue
            try:
                entree = json.loads(ligne)
            except ValueError:
                continue
            if entree.get("lang_code") != langue:
                continue
            mot = entree.get("word") or ""
            if not mot or commun.cle(mot) not in vedettes:
                continue
            if entree.get("pos") in NATURES_ECARTEES:
                continue
            compact = compacter(entree, langue)
            if compact is None:
                continue
            retenues += 1
            yield compact

            if lues % 500000 == 0:
                vitesse = lues / max(time.time() - debut, 0.001)
                sys.stdout.write(
                    f"\r  … {lues:>10,} lignes lues, {retenues:>7,} retenues"
                    f"  ({vitesse:,.0f}/s)   ".replace(",", " "))
                sys.stdout.flush()

    sys.stdout.write("\r" + " " * 78 + "\r")
    if journal is not None:
        journal["lues"] = lues
        journal["retenues"] = retenues


def vedettes_de(fichier_tei):
    """Les clés des vedettes du dictionnaire bilingue, côté langue source."""
    return {commun.cle(brut["mot"]) for brut in tei.lire(fichier_tei)}


def chemin_extrait(langue):
    return SOURCES / f"wikt-{langue}.jsonl"


def charger(langue):
    """L'extrait, rangé par vedette. Un mot peut avoir plusieurs natures."""
    chemin = chemin_extrait(langue)
    if not chemin.exists():
        raise SystemExit(
            f"{chemin.name} manque — lancez d'abord python build/wiktionnaire.py")
    par_mot = {}
    with chemin.open("r", encoding="utf-8") as flux:
        for ligne in flux:
            ligne = ligne.strip()
            if not ligne:
                continue
            enregistrement = json.loads(ligne)
            par_mot.setdefault(enregistrement["m"], []).append(enregistrement)
    return par_mot


# --- Programme --------------------------------------------------------------

def main():
    analyseur = argparse.ArgumentParser(description=__doc__)
    analyseur.add_argument("--forcer", action="store_true",
                           help="réextraire même si l'extrait est déjà là")
    options = analyseur.parse_args()

    couples = [("de", "deu-fra.tei", "wiktionnaire-de.jsonl.gz"),
               ("fr", "fra-deu.tei", "wiktionnaire-fr.jsonl.gz")]

    for langue, nom_tei, nom_dump in couples:
        sortie = chemin_extrait(langue)
        if sortie.exists() and not options.forcer:
            print(f"= {sortie.name} déjà là ({commun.humain(sortie.stat().st_size)})")
            continue

        dump = SOURCES / nom_dump
        if not dump.exists():
            raise SystemExit(
                f"{dump.name} manque — lancez d'abord python build/telecharger.py")

        print(f"\n{langue} — vedettes du dictionnaire bilingue…")
        vedettes = vedettes_de(SOURCES / nom_tei)
        print(f"  {len(vedettes):,} vedettes".replace(",", " "))

        print(f"{langue} — lecture de {dump.name} ({commun.humain(dump.stat().st_size)})")
        journal = {}
        debut = time.time()
        # On écrit au fil de l'eau : garder cent mille entrées en mémoire pour
        # les sérialiser d'un bloc à la fin n'apporte rien et coûte un gigaoctet.
        provisoire = sortie.with_suffix(".partiel")
        with provisoire.open("w", encoding="utf-8", newline="") as flux:
            for enregistrement in extraire(dump, langue, vedettes, journal):
                flux.write(json.dumps(enregistrement, ensure_ascii=False,
                                      separators=(",", ":")) + "\n")
        # Un extrait n'apparaît sous son nom définitif qu'une fois complet :
        # une extraction interrompue ne doit pas passer pour un extrait valable.
        provisoire.replace(sortie)

        duree = time.time() - debut
        print(f"  ✓ {journal['lues']:,} lignes lues, {journal['retenues']:,} retenues"
              f" en {duree:.0f} s".replace(",", " "))
        print(f"  → {sortie.name}, {commun.humain(sortie.stat().st_size)}")

    print("\nÉtape suivante : python build/construire.py")


if __name__ == "__main__":
    main()
