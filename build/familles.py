#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
« Autour de ce mot » : les mots qui en éclairent un autre.

Apprendre *Fahrt*, *Fahrer*, *abfahren* et *Fahrkarte* quand on vient de
chercher *fahren* coûte beaucoup moins que de les apprendre séparément — la
racine est déjà là, il ne reste qu'à en voir les emplois. C'est vrai en
allemand plus qu'ailleurs, où la composition fabrique des mots à volonté.

Deux procédés, de fiabilité inégale, et un filtre qui rattrape le second.

1. **La composition** (allemand). *Bahnhof* se coupe en *Bahn* + *Hof*, tous
   deux vedettes du dictionnaire. Le lien est structurel : si la coupe tient,
   il n'y a rien à vérifier de plus.

2. **La dérivation**, par préfixes et suffixes connus. C'est là que ça dérape :
   *Gefahr* (le danger) ressemble à *fahren* (aller) comme *Fahrt* (le trajet)
   lui ressemble, et rien dans la forme ne les distingue. Le rapprochement
   serait faux et, pire, il aurait l'air savant.

D'où le filtre : **deux mots ne sont apparentés que si leurs traductions le
sont aussi**. *fahren* se traduit par « aller, conduire, voyager », *Fahrt* par
« trajet, voyage, course » — « voyager » et « voyage » partagent leur début, le
lien tient. *Gefahr* donne « danger, péril » : rien de commun, le lien tombe.
La traduction sert ici de témoin sémantique, ce qu'aucune analyse de la forme
seule ne peut fournir.

Ce que ce fichier produit reste un **voisinage utile**, pas une filiation
étymologique établie — et l'application le présente comme tel.

Les erreurs qui subsistent se corrigent à la main dans `exclusions.txt`, une
paire de mots par ligne, séparés par une tabulation.
"""

import re
from collections import defaultdict
from pathlib import Path

import commun

RACINE = Path(__file__).resolve().parent
EXCLUSIONS = RACINE / "exclusions.txt"

# Combien de voisins par mot, au plus. Au-delà, la fiche devient un catalogue
# et l'on n'y regarde plus rien.
VOISINS_MAX = 6

# Rang au-delà duquel un voisin ne rend plus service : montrer *Abbruchhaus* à
# qui consulte *Haus* n'apprend rien qu'on retiendra.
RANG_UTILE = 20000

# Les affixes que l'on sait retirer. Rien d'exhaustif : les plus productifs.
PREFIXES = {
    "de": ["be", "ver", "er", "ent", "zer", "ge", "ab", "an", "auf", "aus",
           "ein", "mit", "nach", "vor", "zu", "uber", "unter", "um", "durch",
           "hin", "her", "los", "weg", "wieder", "un", "miss"],
    "fr": ["re", "de", "des", "in", "im", "il", "ir", "pre", "sur", "sous",
           "me", "anti", "co", "en", "em"],
}

SUFFIXES = {
    "de": ["ungen", "ung", "heiten", "heit", "keiten", "keit", "schaften",
           "schaft", "chen", "lein", "lich", "isch", "ig", "bar", "los",
           "haft", "nisse", "nis", "tum", "sam", "linge", "ling", "innen",
           "in", "ern", "er", "en", "e"],
    "fr": ["tions", "tion", "sions", "sion", "ments", "ment", "euses", "euse",
           "trices", "trice", "teurs", "teur", "eurs", "eur", "ages", "age",
           "ables", "able", "ibles", "ible", "ites", "ite", "ismes", "isme",
           "istes", "iste", "esses", "esse", "ances", "ance", "ences", "ence",
           "eries", "erie", "ifs", "if", "ives", "ive", "eux", "es", "s", "e"],
}

# Un radical plus court ne prouve rien : « Ei » et « Eis » ne sont pas parents.
RADICAL_MIN = 4

# Taille au-delà de laquelle un groupe de mots au même début n'apprend plus
# rien — et coûte cher, le rapprochement se faisant deux à deux.
GROUPE_MAX = 140

# Les parties d'un composé, et la longueur au-delà de laquelle on tente la
# décomposition.
PARTIE_MIN = 4
COMPOSE_MIN = 8

# Les éléments de liaison de la composition allemande : Bahn-s-hof, Straße-n-bahn.
LIAISONS = ["", "s", "n", "en", "es", "e", "er", "ns"]


def charger_exclusions():
    """Paires écartées à la main, dans les deux sens."""
    paires = set()
    if not EXCLUSIONS.exists():
        return paires
    for ligne in EXCLUSIONS.read_text(encoding="utf-8").splitlines():
        ligne = ligne.split("#")[0].strip()
        if not ligne or "\t" not in ligne:
            continue
        a, b = (x.strip() for x in ligne.split("\t", 1))
        if a and b:
            paires.add((a, b))
            paires.add((b, a))
    return paires


def radical(cle_mot, langue):
    """Le mot débarrassé de ses affixes connus, s'il en reste assez."""
    reste = cle_mot
    for prefixe in sorted(PREFIXES[langue], key=len, reverse=True):
        if reste.startswith(prefixe) and len(reste) - len(prefixe) >= RADICAL_MIN:
            reste = reste[len(prefixe):]
            break
    for suffixe in sorted(SUFFIXES[langue], key=len, reverse=True):
        if reste.endswith(suffixe) and len(reste) - len(suffixe) >= RADICAL_MIN:
            reste = reste[:-len(suffixe)]
            break
    return reste


def decomposer(cle_mot, vedettes_par_cle, natures):
    """Coupe un composé allemand en deux, si les deux moitiés sont des mots.

    On n'essaie que la coupe en deux : au-delà, le nombre de découpes possibles
    explose et les fausses coupes avec. La seconde moitié doit être un nom —
    c'est elle qui porte le sens du composé, *Bahnhof* est une sorte de *Hof*.
    """
    if len(cle_mot) < COMPOSE_MIN:
        return None
    for coupe in range(PARTIE_MIN, len(cle_mot) - PARTIE_MIN + 1):
        gauche = cle_mot[:coupe]
        for liaison in LIAISONS:
            if not cle_mot[coupe:].startswith(liaison):
                continue
            droite = cle_mot[coupe + len(liaison):]
            if len(droite) < PARTIE_MIN:
                continue
            if gauche not in vedettes_par_cle or droite not in vedettes_par_cle:
                continue
            if "n" not in natures.get(droite, ()):
                continue
            return gauche, droite
    return None


def stems_des_traductions(entree):
    """Les débuts des traductions, pour juger d'une parenté de sens."""
    stems = set()
    for lecture in entree["lectures"]:
        for _definition, traductions in lecture[4]:
            for traduction in traductions:
                k = commun.cle(traduction)
                for morceau in k.split():
                    if len(morceau) >= 4:
                        stems.add(morceau[:4])
    return stems


def construire(dictionnaires, positions, journal=None):
    """{langue: {mot: [voisins…]}}"""
    exclusions = charger_exclusions()
    resultat = {}
    bilan = {"composition": 0, "derivation": 0, "ecartes": 0}

    for langue, entrees in dictionnaires.items():
        vedettes_par_cle = defaultdict(list)
        natures = defaultdict(set)
        stems = {}
        for mot, entree in entrees.items():
            k = commun.cle(mot)
            vedettes_par_cle[k].append(mot)
            for lecture in entree["lectures"]:
                if lecture[0]:
                    natures[k].add(lecture[0])
            stems[mot] = stems_des_traductions(entree)

        liens = defaultdict(set)

        def relier(a, b, certain):
            if a == b or (a, b) in exclusions:
                return False
            # « soleil » et « Soleil », « ernst » et « Ernst » : le même mot à la
            # casse près. Le montrer comme voisin de lui-même n'apprend rien.
            if commun.cle(a) == commun.cle(b):
                return False
            if not certain and not (stems[a] & stems[b]):
                bilan["ecartes"] += 1
                return False
            liens[a].add(b)
            liens[b].add(a)
            return True

        # 1. Composition — allemand seulement : le français compose par
        #    juxtaposition avec préposition (« pomme de terre »), ce qui ne se
        #    découpe pas de la même façon.
        if langue == "de":
            for mot in entrees:
                k = commun.cle(mot)
                if "n" not in natures.get(k, ()):
                    continue
                parties = decomposer(k, vedettes_par_cle, natures)
                if not parties:
                    continue
                for partie in parties:
                    for voisin in vedettes_par_cle[partie]:
                        if relier(mot, voisin, certain=True):
                            bilan["composition"] += 1

        # 2. Dérivation, sous condition de parenté de sens.
        #
        # On regroupe par **début commun**, et non par radical exact. Exiger
        # l'égalité des radicaux ne rapprochait pas « fahren » de « Fahrt » —
        # le premier perd son « -en » et donne *fahr*, le second garde son « t »
        # et donne *fahrt* — ni « travail » de « travailler ». Le début commun
        # est plus généreux ; c'est le recoupement des traductions, ensuite, qui
        # fait le tri, et il le fait mieux qu'une liste d'affixes.
        par_debut = defaultdict(list)
        for mot in entrees:
            k = commun.cle(mot)
            if len(k) >= RADICAL_MIN and " " not in k:
                par_debut[k[:RADICAL_MIN]].append(mot)

        for _debut, groupe in par_debut.items():
            # Un début partagé par des centaines de mots ne dit rien d'une
            # parenté : c'est une coïncidence de forme, et le coût du calcul
            # croît au carré.
            if len(groupe) > GROUPE_MAX:
                continue
            for i, a in enumerate(groupe):
                ka = commun.cle(a)
                ra = radical(ka, langue)
                for b in groupe[i + 1:]:
                    kb = commun.cle(b)
                    # L'un doit prolonger le radical de l'autre : « fahr » est
                    # bien le début de « fahrt », « travail » celui de
                    # « travailler ». Sans cela, « Kartoffel » et « Karton »
                    # deviendraient parents.
                    rb = radical(kb, langue)
                    if not (ka.startswith(rb) or kb.startswith(ra)
                            or ra == rb):
                        continue
                    if relier(a, b, certain=False):
                        bilan["derivation"] += 1

        # On garde les voisins les plus courants, et seulement eux.
        #
        # « Haus » a près de deux cents composés dans le dictionnaire :
        # *Abbruchhaus*, *Abgeordnetenhaus*, *Affenhaus*… Les montrer tous, ou
        # les six premiers venus, transforme la fiche en catalogue et n'apprend
        # rien. Un voisin trop rare ne sert pas : on l'écarte, sauf si le mot
        # n'en a pas d'autre — mieux vaut un voisin rare que pas de voisin.
        rangs = positions[langue]
        resultat[langue] = {}
        for mot, voisins in liens.items():
            if not voisins:
                continue
            classes = sorted(voisins, key=lambda v: rangs.get(v, 10 ** 9))
            utiles = [v for v in classes if rangs.get(v, 10 ** 9) < RANG_UTILE]
            resultat[langue][mot] = (utiles or classes)[:VOISINS_MAX]

    if journal is not None:
        journal.update(bilan)
        journal["mots_de"] = len(resultat.get("de", {}))
        journal["mots_fr"] = len(resultat.get("fr", {}))
    return resultat
