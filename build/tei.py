#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Lecture des dictionnaires TEI de WikDict.

Les fichiers font 82 et 24 Mo : on les traverse en flux avec `iterparse`, en
vidant chaque entrée dès qu'elle est traitée. Rien n'est chargé en entier.

Forme d'une entrée dans le fichier :

    <entry>
      <form>
        <orth>Mütterchen</orth>              ← la vedette
        <pron>ˈmʏtɐçən</pron>                ← alphabet phonétique international
        <form type="infl">
          <orth>des Mütterchens</orth>       ← formes fléchies
          <orth wikdict:show="true">…</orth>  ← celle qu'il faut montrer (pluriel)
        </form>
      </form>
      <gramGrp><pos>n</pos><gen>neut</gen></gramGrp>
      <sense>                                ← un bloc par sens
        <cit type="trans" xml:lang="fr"><quote>petite maman</quote></cit>
        <sense><def>weibliches Elternteil…</def></sense>
      </sense>
    </entry>

Le `<sense>` extérieur porte les traductions, le `<sense>` intérieur la
définition en langue source. C'est déroutant mais c'est bien le format TEI de
FreeDict, et l'inversion est volontaire dans le fichier d'origine.
"""

import re
from xml.etree.ElementTree import iterparse

TEI = "{http://www.tei-c.org/ns/1.0}"
WIKDICT = "{http://www.wikdict.com/ns/1.0}"

# Les formes fléchies allemandes arrivent souvent précédées de leur article
# (« dem Mütterchen »). L'article n'aide pas à retrouver le lemme et gonfle
# l'index : on le retire.
ARTICLES = {
    "der", "die", "das", "dem", "den", "des",
    "ein", "eine", "einem", "einen", "einer", "eines",
    "le", "la", "les", "l'", "un", "une", "des", "du", "de",
}

# Les définitions du Wiktionnaire commencent volontiers par une marque d'usage
# entre parenthèses ou en italique. On la garde — elle est informative — mais on
# nettoie les résidus de balisage.
ESPACES = re.compile(r"\s+")


def _texte(element):
    if element is None:
        return ""
    return ESPACES.sub(" ", "".join(element.itertext())).strip()


def _forme_utile(forme):
    """Retire l'article d'une forme fléchie, garde le reste."""
    morceaux = forme.split()
    while len(morceaux) > 1 and morceaux[0].lower() in ARTICLES:
        morceaux = morceaux[1:]
    return " ".join(morceaux)


# ── Trois défauts des formes fléchies du TEI (version 3.4) ──────────────────
#
# Mesurés en cherchant pourquoi « freue », « historischen » ou « zeitlose » ne
# menaient nulle part, et pourquoi « bauchreden » figurait parmi les mille deux
# cents premiers mots de la langue :
#
# 1. **L'auxiliaire est rangé parmi les formes.** « bauchreden » a pour
#    formes « bauchgeredet », « gebauchredet », « haben » et « Hilfsverb ».
#    « haben » n'est pas une forme de ce verbe ; et comme aucune des autres
#    n'est attestée, le classement lui créditait toute la fréquence de
#    « haben ». D'où une poignée de verbes rares en tête de liste.
# 2. **Les verbes pronominaux traînent leur pronom** : « freue mich »,
#    « freut sich ». Une forme à deux mots n'entre pas dans l'index, si bien
#    que « freue » et « freut » ne menaient pas à « freuen ».
# 3. **Les adjectifs déclinés ont une espace parasite** : « historisch e »,
#    « historisch en ». Toute la déclinaison du positif était perdue.

AUXILIAIRES = {"Hilfsverb", "haben", "sein"}
PRONOMS_REFLECHIS = {"mich", "dich", "sich", "uns", "euch", "mir", "dir", "Sie"}
TERMINAISONS_ADJECTIF = {"e", "em", "en", "er", "es"}
# Une forme est faite de lettres : le TEI range aussi parmi elles des tirets
# de tableau vide (« – », 174 fois), des renvois (« P112 ») et des chiffres.
MOT_DE_LETTRES = re.compile(r"[^\W\d_]+(?:['’\-][^\W\d_]+)*", re.UNICODE)


def forme_de_recherche(vedette, forme):
    """Une forme du TEI → la graphie sous laquelle on la cherchera, ou ""."""
    if forme in AUXILIAIRES and forme != vedette:
        return ""
    if not all(MOT_DE_LETTRES.fullmatch(m) for m in forme.split()):
        return ""
    # Une lettre seule n'est pas une forme mais un symbole : « Urethan » a
    # pour « formes » C, H, N et O, sa formule chimique, et « Durchmesser » D
    # — qui lui prêtaient la fréquence de « o » et de « d ».
    if len(forme) < 2:
        return ""
    morceaux = forme.split()
    if len(morceaux) == 2 and morceaux[1] in TERMINAISONS_ADJECTIF \
            and morceaux[0][:1].islower():
        return morceaux[0] + morceaux[1]
    if len(morceaux) > 1:
        sans_pronom = [m for m in morceaux if m not in PRONOMS_REFLECHIS]
        if len(sans_pronom) == 1:
            return sans_pronom[0]
    return forme


def lire(chemin):
    """Produit une entrée à la fois, sous forme de dictionnaire.

    Clés : mot, pos, genre, pron, montrer (formes à afficher),
    flechies (formes pour la recherche), sens (liste de {def, trads}).
    """
    contexte = iterparse(str(chemin), events=("start", "end"))
    _, racine = next(contexte)

    for evenement, element in contexte:
        if evenement != "end" or element.tag != TEI + "entry":
            continue

        forme = element.find(TEI + "form")
        if forme is None:
            element.clear()
            continue

        vedette = _texte(forme.find(TEI + "orth"))
        if not vedette:
            element.clear()
            racine.clear()
            continue

        prononciations = [_texte(p) for p in forme.findall(TEI + "pron")]
        prononciations = [p for p in prononciations if p]

        montrer, flechies = [], []
        for sous in forme.findall(TEI + "form"):
            if sous.get("type") != "infl":
                continue
            for orth in sous.findall(TEI + "orth"):
                brut = _texte(orth)
                if not brut:
                    continue
                utile = _forme_utile(brut)
                if not utile or utile == vedette:
                    # Une forme identique à la vedette n'apprend rien ; elle
                    # apparaît quand le pluriel est semblable au singulier.
                    if orth.get(WIKDICT + "show") == "true" and brut == vedette:
                        montrer.append(vedette)
                    continue
                if orth.get(WIKDICT + "show") == "true":
                    montrer.append(utile)
                recherche = forme_de_recherche(vedette, utile)
                if recherche and recherche != vedette and recherche not in flechies:
                    flechies.append(recherche)

        grammaire = element.find(TEI + "gramGrp")
        pos = genre = ""
        if grammaire is not None:
            pos = _texte(grammaire.find(TEI + "pos"))
            genre = _texte(grammaire.find(TEI + "gen"))

        sens = []
        for bloc in element.findall(TEI + "sense"):
            traductions = []
            for cit in bloc.findall(TEI + "cit"):
                if cit.get("type") != "trans":
                    continue
                for quote in cit.findall(TEI + "quote"):
                    valeur = _texte(quote)
                    if valeur and valeur not in traductions:
                        traductions.append(valeur)
            definition = ""
            interieur = bloc.find(TEI + "sense")
            if interieur is not None:
                definition = _texte(interieur.find(TEI + "def"))
            if traductions:
                sens.append({"def": definition, "trads": traductions})

        element.clear()
        racine.clear()

        if not sens:
            continue

        yield {
            "mot": vedette,
            "pos": pos,
            "genre": genre,
            "pron": prononciations[0] if prononciations else "",
            "montrer": montrer,
            "flechies": flechies,
            "sens": sens,
        }


def entete(chemin):
    """Mouture et nombre d'entrées annoncés dans l'en-tête du fichier."""
    with open(chemin, "rb") as fichier:
        debut = fichier.read(4000).decode("utf-8", "replace")
    mouture = re.search(r"<edition>([^<]+)</edition>", debut)
    extent = re.search(r"<extent>([^<]+)</extent>", debut)
    return (mouture.group(1).strip() if mouture else "?",
            extent.group(1).strip() if extent else "?")


if __name__ == "__main__":
    import itertools
    import sys
    from pathlib import Path
    import commun  # noqa: F401  (règle l'encodage de la console)

    chemin = Path(__file__).parent / "sources" / (sys.argv[1] if len(sys.argv) > 1 else "deu-fra.tei")
    print(f"{chemin.name} — mouture {entete(chemin)[0]}, {entete(chemin)[1]}\n")
    for entree in itertools.islice(lire(chemin), 6):
        print(f"  {entree['mot']}  [{entree['pos']} {entree['genre']}] /{entree['pron']}/")
        if entree["montrer"]:
            print(f"     à montrer : {', '.join(entree['montrer'])}")
        if entree["flechies"]:
            print(f"     fléchies  : {len(entree['flechies'])} formes, ex. {entree['flechies'][:3]}")
        for s in entree["sens"]:
            print(f"     → {', '.join(s['trads'])}")
            if s["def"]:
                print(f"       « {s['def'][:90]} »")
        print()
