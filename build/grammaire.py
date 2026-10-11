#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Les mots grammaticaux que le dictionnaire source ne contient pas.

WikDict ne retient que les entrées dotées d'une traduction bien attestée, et
quelques mots-outils français passent au travers : *mon*, *notre*, *votre*,
*leur*, *ce*, *celui*, *ne*. Ce sont pourtant les tout premiers qu'un débutant
cherche — « mes », « cette », « ne … pas » sont parmi les vingt formes les plus
fréquentes du corpus qu'aucune entrée ne savait résoudre.

Ces entrées-ci sont donc **écrites pour cette application**, à la main, et non
tirées du Wiktionnaire. C'est dit dans SOURCES.md et dans la page de
confidentialité : mêler sans le signaler du contenu rédigé à des données sous
licence serait malhonnête envers les deux.

Rien d'autre n'est ajouté. Le reste du dictionnaire vient des sources, avec ses
qualités et ses manques, et il n'est pas question de le retoucher mot à mot :
on ne saurait plus ce qui vient d'où.

Le côté allemand, lui, est complet — *mein*, *dieser*, *nicht*, *kein* y sont
tous.
"""

ENTREES = {
    "fr": [
        {
            "mot": "mon",
            "pos": "adj", "pron": "mɔ̃",
            "formes": ["ma", "mes"],
            "sens": [("déterminant possessif de la première personne du singulier",
                      ["mein", "meine"])],
        },
        {
            "mot": "notre",
            "pos": "adj", "pron": "nɔtʁ",
            "formes": ["nos"],
            "sens": [("déterminant possessif de la première personne du pluriel",
                      ["unser", "unsere"])],
        },
        {
            "mot": "votre",
            "pos": "adj", "pron": "vɔtʁ",
            "formes": ["vos"],
            "sens": [("déterminant possessif de la deuxième personne du pluriel, "
                      "et de la politesse", ["euer", "Ihr", "eure"])],
        },
        {
            "mot": "leur",
            "pos": "adj", "pron": "lœʁ",
            "formes": ["leurs"],
            "sens": [("déterminant possessif de la troisième personne du pluriel",
                      ["ihr", "ihre"]),
                     ("pronom complément de la troisième personne du pluriel",
                      ["ihnen"])],
        },
        {
            "mot": "ce",
            "pos": "adj", "pron": "sə",
            "formes": ["cet", "cette", "ces"],
            "sens": [("déterminant démonstratif ; « cet » devant voyelle, "
                      "« cette » au féminin, « ces » au pluriel",
                      ["dieser", "diese", "dieses"])],
        },
        {
            "mot": "celui",
            "pos": "demonstrativePronoun", "pron": "sə.lɥi",
            "formes": ["celle", "ceux", "celles"],
            "sens": [("pronom démonstratif, celui dont on vient de parler",
                      ["derjenige", "der"])],
        },
        {
            "mot": "ne",
            "pos": "adv", "pron": "nə",
            "formes": ["n’"],
            "sens": [("premier élément de la négation, employé avec « pas », "
                      "« plus », « jamais », « rien »", ["nicht"])],
        },
    ],
}


# ── Les formes des mots-outils allemands (version 3.4) ──────────────────────
#
# Les vedettes allemandes sont là — *der*, *ein*, *dein*, *dieser*, *er* —,
# mais pas leurs formes : le TEI n'en donne aucune pour les articles, les
# pronoms et les déterminants. Taper « das », « eine », « ihm », « deinen »
# ou « im » ne menait donc nulle part, alors que ce sont parmi les vingt mots
# les plus fréquents de la langue. La déclinaison de ces mots est une liste
# close, celle de toutes les grammaires : on l'écrit ici, comme les
# déterminants français de `formes_fr.py`, et une forme ne renvoie qu'à une
# vedette présente au dictionnaire.
#
# Les contractions suivent la même logique : « im » est « in dem », « zur »
# est « zu der » ; on les rattache à la préposition, qui est ce qu'on cherche.

def _declinaison(radical, *fins):
    return " ".join(radical + fin for fin in fins)


FORMES_DE = {
    # L'article, et les formes propres au relatif et au démonstratif.
    "der": "die das dem den des dessen deren denen derer",
    "anderer": "andere anderen anderem anderes",
    "jeglicher": "jegliche jeglichen jeglichem jegliches",
    "ein": _declinaison("ein", "e", "en", "em", "er", "es"),
    "kein": _declinaison("kein", "e", "en", "em", "er", "es"),
    "mein": _declinaison("mein", "e", "en", "em", "er", "es"),
    "dein": _declinaison("dein", "e", "en", "em", "er", "es"),
    "sein": _declinaison("sein", "e", "en", "em", "er", "es"),
    "ihr": _declinaison("ihr", "e", "en", "em", "er", "es") + " euch",
    "unser": _declinaison("unser", "e", "en", "em", "er", "es")
             + " unsre unsren unsrem unsrer unsres unsern unserm",
    "euer": "eure euren eurem eurer eures euere eueren euerem euerer eueres",
    "irgendein": _declinaison("irgendein", "e", "en", "em", "er", "es"),
    "dieser": "diese diesen diesem dieses dies",
    "jener": "jene jenen jenem jenes",
    "welcher": "welche welchen welchem welches",
    "jeder": "jede jeden jedem jedes",
    "mancher": "manche manchen manchem manches",
    "solcher": "solche solchen solchem solches",
    "derselbe": "dieselbe dasselbe denselben demselben desselben dieselben derselben",
    "derjenige": "diejenige dasjenige denjenigen demjenigen desjenigen diejenigen "
                 "derjenigen",
    "all": "alle allen allem alles aller",
    "viel": "viele vielen vielem vieles",
    "wenig": "wenige wenigen wenigem weniges",
    "beide": "beiden beider beides",
    "einige": "einigen einiger einigem einiges",
    "ich": "mich mir meiner",
    "du": "dich dir deiner",
    "er": "ihn ihm seiner",
    "es": "ihm seiner",
    "sie": "ihr ihrer ihnen",
    "Sie": "Ihnen Ihrer",
    "wir": "uns",
    "wer": "wen wem wessen",
    "jemand": "jemanden jemandem",
    "niemand": "niemanden niemandem",
    # Les contractions de la préposition et de l'article.
    "in": "im ins",
    "an": "am ans",
    "auf": "aufs",
    "zu": "zum zur",
    "von": "vom",
    "bei": "beim",
    "um": "ums",
    "durch": "durchs",
    "für": "fürs",
    "über": "übers überm",
    "unter": "unters unterm",
    "vor": "vors vorm",
    "hinter": "hinters hinterm",
}


def formes_allemandes():
    """(forme, vedette) pour les mots-outils allemands."""
    return [(forme, lemme) for lemme, liste in FORMES_DE.items()
            for forme in liste.split()]


def ajouter(dictionnaires, journal=None):
    """Complète les dictionnaires, sans jamais écraser une entrée existante."""
    ajoutees = []
    for langue, liste in ENTREES.items():
        entrees = dictionnaires.get(langue)
        if entrees is None:
            continue
        for brut in liste:
            if brut["mot"] in entrees:
                # Le dictionnaire source a comblé le trou depuis : tant mieux,
                # on lui laisse la place.
                continue
            entrees[brut["mot"]] = {
                "mot": brut["mot"],
                "lectures": [[
                    brut.get("pos", ""),
                    brut.get("genre", ""),
                    brut.get("pron", ""),
                    list(brut.get("formes", [])),
                    [[definition, list(traductions)]
                     for definition, traductions in brut["sens"]],
                ]],
            }
            ajoutees.append(brut["mot"])
    if journal is not None:
        journal["ajoutees"] = ajoutees
    return ajoutees


def formes_supplementaires():
    """forme → vedette, pour l'index de lemmatisation."""
    paires = []
    for _langue, liste in ENTREES.items():
        for brut in liste:
            for forme in brut.get("formes", ()):
                paires.append((forme, brut["mot"]))
    return paires
