#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Rapprocher les sens de WikDict et ceux du Wiktionnaire.

── Le problème ─────────────────────────────────────────────────────────────

WikDict sait qu'« abbauen » se traduit par *extraire*, *atténuer* ou
*démanteler*. Le Wiktionnaire sait qu'« abbauen » a trois significations, et
donne une phrase pour chacune. Personne ne dit lequel des trois exemples
illustre laquelle des trois traductions.

Sans ce rapprochement, la v2 n'a rien de plus que la v1 : trois phrases
alignées sous un mot, au petit bonheur. C'est **le** point dont dépend la
promesse « une phrase par signification », et il est traité ici, à part, pour
qu'on puisse l'éprouver seul.

── Ce qui le rend faisable ─────────────────────────────────────────────────

Les deux viennent de la même source. WikDict dérive de DBnary, qui extrait le
Wiktionnaire ; la définition que porte un sens WikDict *est* la glose
Wiktionnaire, à trois transformations près :

  1. `construire.py:couper()` la tronque à 130 signes et ajoute une ellipse ;
  2. DBnary garde le préfixe de domaine (« Musik: ») que wiktextract range à
     part, dans `topics` ;
  3. les guillemets ne sont pas les mêmes : „A“ contre "A".

D'où la marche à suivre : normaliser des deux côtés, comparer par préfixe
(à cause de la troncature), puis par recouvrement de vocabulaire, puis — et
seulement quand il ne reste qu'un candidat de chaque côté — par élimination.

── Ce qu'on ne fait pas ────────────────────────────────────────────────────

Pas d'appariement par rang. Le Wiktionnaire donne parfois huit sens là où
WikDict en garde trois : le troisième de l'un n'a aucune raison d'être le
troisième de l'autre. Un mauvais appariement est pire que pas d'appariement —
il colle une phrase sous une traduction qu'elle n'illustre pas, et l'apprenant
n'a aucun moyen de s'en apercevoir.
"""

import re

import commun

# --- Natures grammaticales --------------------------------------------------

# Les deux sources ne nomment pas les natures de la même façon. On les ramène à
# un vocabulaire commun, qui n'est celui d'aucune des deux : traduire l'une
# dans l'autre reviendrait à privilégier une source, et à devoir tout reprendre
# le jour où elle change.
NATURE_TEI = {
    "n": "nom", "pn": "nom-propre", "v": "verbe", "adj": "adjectif",
    "adv": "adverbe", "Adverb": "adverbe", "preposition": "preposition",
    "indefinitePronoun": "pronom", "interjection": "interjection",
    "numeral": "numeral", "conjunction": "conjonction", "suffix": "suffixe",
    "abbreviation": "abreviation", "letter": "lettre", "article": "article",
    "particle": "particule",
}

NATURE_WIKT = {
    "noun": "nom", "name": "nom-propre", "verb": "verbe", "adj": "adjectif",
    "adv": "adverbe", "prep": "preposition", "pron": "pronom",
    "intj": "interjection", "num": "numeral", "conj": "conjonction",
    "suffix": "suffixe", "prefix": "prefixe", "abbrev": "abreviation",
    "character": "lettre", "article": "article", "particle": "particule",
    "det": "determinant", "phrase": "locution", "proverb": "locution",
    "contraction": "contraction", "adv_phrase": "locution",
}

# --- Normalisation d'une définition -----------------------------------------

# « Musik: », « Biologie, übertragen: », « Zoologie : » — le domaine, que
# wiktextract range dans `topics` et que DBnary laisse dans le texte.
PREFIXE_DOMAINE = re.compile(
    r"^(?:[^:;()]{2,28}\s*:\s*)+(?=\S)", flags=re.UNICODE)

PONCTUATION = re.compile(r"[^\w\s]", flags=re.UNICODE)

# L'ellipse que `couper()` ajoute quand il tronque.
ELLIPSE = "…"


def normaliser(definition):
    """La forme sous laquelle deux définitions se comparent.

    Domaine retiré, ponctuation et guillemets effacés, accents et casse
    ramenés à leur forme neutre par `commun.cle()`.
    """
    if not definition:
        return ""
    texte = definition.strip().rstrip(ELLIPSE).strip()
    texte = PREFIXE_DOMAINE.sub("", texte)
    texte = PONCTUATION.sub(" ", texte)
    return commun.cle(texte)


def mots_pleins(texte_normalise):
    """Les mots qui portent le sens.

    On les reconnaît à leur longueur plutôt qu'à une liste de mots-outils : il
    en faudrait une par langue, elles se périment, et « der »/« le » ne sont
    pas les seuls intrus. Quatre lettres écartent l'essentiel des mots
    grammaticaux dans les deux langues sans toucher au vocabulaire.
    """
    longs = {m for m in texte_normalise.split() if len(m) >= 4}
    # Une définition qui ne serait faite que de mots courts — « ne pas être » —
    # n'aurait plus rien à comparer. On la prend alors telle quelle.
    return longs or set(texte_normalise.split())


def recouvrement(a, b):
    """Indice de Jaccard entre deux définitions normalisées, entre 0 et 1."""
    mots_a, mots_b = mots_pleins(a), mots_pleins(b)
    if not mots_a or not mots_b:
        return 0.0
    communs = len(mots_a & mots_b)
    return communs / len(mots_a | mots_b)


SEUIL_RECOUVREMENT = 0.6


def concordance(definition_wikdict, definition_wikt):
    """À quel point deux définitions décrivent le même sens, entre 0 et 1.

    1.0 quand l'une est le début de l'autre : c'est le cas ordinaire, la
    définition WikDict n'étant que la glose du Wiktionnaire tronquée.
    """
    a = normaliser(definition_wikdict)
    b = normaliser(definition_wikt)
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    # La troncature va toujours dans le même sens, mais on ne s'y fie pas :
    # `couper()` n'agit qu'au-delà de 130 signes, et rien n'interdit à une
    # glose d'être plus courte que la définition qu'on lui compare.
    court, long = (a, b) if len(a) <= len(b) else (b, a)
    if len(court) >= 12 and long.startswith(court):
        return 1.0
    return recouvrement(a, b)


# --- Appariement ------------------------------------------------------------

def apparier(definitions_wikdict, definitions_wikt):
    """Rend, pour chaque sens WikDict, l'indice du sens Wiktionnaire retenu.

    Une liste de la longueur de `definitions_wikdict`, contenant des indices
    dans `definitions_wikt` ou None. Un sens Wiktionnaire ne sert qu'une fois :
    deux traductions différentes ne peuvent pas illustrer la même signification.
    """
    resultat = [None] * len(definitions_wikdict)
    pris = set()

    # 1. Les meilleures paires d'abord, quel que soit leur rang. Trier les
    #    candidats par score évite qu'un appariement médiocre trouvé tôt ne
    #    prenne la place d'un excellent trouvé plus tard.
    candidats = []
    for i, a in enumerate(definitions_wikdict):
        for j, b in enumerate(definitions_wikt):
            score = concordance(a, b)
            if score >= SEUIL_RECOUVREMENT:
                candidats.append((score, i, j))
    candidats.sort(key=lambda c: (-c[0], c[1], c[2]))

    for _score, i, j in candidats:
        if resultat[i] is None and j not in pris:
            resultat[i] = j
            pris.add(j)

    # 2. Le dernier debout. Quand il ne reste qu'un sens de chaque côté et que
    #    les deux listes sont courtes, les apparier est raisonnable : ce sont
    #    deux descriptions du même mot, et toutes les autres se sont déjà
    #    reconnues. Au-delà de trois sens, on s'abstient — le Wiktionnaire en
    #    distingue souvent plus que WictDict n'en retient, et le reliquat n'est
    #    plus un reliquat mais un tas.
    if len(definitions_wikdict) <= 3 and len(definitions_wikt) <= 3:
        orphelins = [i for i, v in enumerate(resultat) if v is None]
        libres = [j for j in range(len(definitions_wikt)) if j not in pris]
        if len(orphelins) == 1 and len(libres) == 1:
            resultat[orphelins[0]] = libres[0]

    return resultat


def choisir_enregistrement(nature_lecture, genre_lecture, enregistrements):
    """Parmi les entrées Wiktionnaire d'un mot, celle de la bonne lecture.

    Un mot a une entrée par nature : « laut » est adjectif *et* préposition. Et
    parfois deux entrées de même nature, que seul le genre sépare : « See » est
    un nom masculin quand c'est un lac, un nom féminin quand c'est la mer, avec
    des sens et des exemples entièrement distincts. Se contenter de la nature
    mettrait les vagues sous le lac.

    À défaut de nature connue des deux côtés, la première entrée — c'est la
    plus courante, le Wiktionnaire les rangeant par usage.
    """
    if not enregistrements:
        return None

    voulue = NATURE_TEI.get(nature_lecture)
    if not voulue:
        return enregistrements[0]

    memes = [e for e in enregistrements
             if NATURE_WIKT.get(e.get("p")) == voulue]
    if not memes:
        # Une nature demandée et introuvable n'autorise pas à prendre
        # n'importe laquelle : les exemples d'un nom sous une lecture de verbe
        # seraient faux, et faux sans que rien ne le signale.
        return None
    if len(memes) == 1 or not genre_lecture:
        return memes[0]

    for enregistrement in memes:
        if enregistrement.get("g") == genre_lecture:
            return enregistrement
    # Plusieurs lectures de même nature et aucune du bon genre : on ne sait pas
    # laquelle, et deviner reviendrait à choisir au hasard entre le lac et la mer.
    return None


# --- Greffe -----------------------------------------------------------------

# Combien de sens du Wiktionnaire on ajoute quand WikDict les ignore. Ils
# n'ont pas de traduction — WikDict ne leur en connaît pas — mais ils ont une
# définition et un exemple, et chacun de leurs mots est cliquable. En ajouter
# davantage noierait les sens traduits, qui sont ceux qu'on vient chercher.
SENS_SUPPLEMENTAIRES_MAX = 2


def enrichir(entree, enregistrements, journal=None):
    """Greffe le Wiktionnaire sur une entrée WikDict. Modifie `entree` en place.

    Chaque sens gagne un troisième champ : ses exemples, sous la forme brute
    `[texte, marque du mot, référence]`. C'est `construire.py` qui les rangera
    ensuite dans le vivier commun et ne gardera ici que des numéros.

    L'entrée gagne ses synonymes et ses tableaux de formes, qui ne dépendent
    pas du sens.
    """
    compteur = journal if journal is not None else {}
    for cle in ("lectures", "sans_entree", "sens", "apparies", "avec_exemple",
                "sens_ajoutes"):
        compteur.setdefault(cle, 0)

    for lecture in entree["lectures"]:
        compteur["lectures"] += 1
        nature, genre, sens = lecture[0], lecture[1], lecture[4]

        # Flexion et synonymes appartiennent à la **lecture**, pas à la vedette.
        # « See » féminin est la mer, sans pluriel ; « See » masculin est le lac,
        # génitif « des Sees ». Rassemblés sur l'entrée, le génitif du lac
        # s'affichait sous la mer — du bon allemand attribué au mauvais mot,
        # exactement le genre de faute qu'un apprenant recopie sans se méfier.
        while len(lecture) < 7:
            lecture.append([])
        lecture[5] = []      # flexion
        lecture[6] = []      # synonymes

        # Tout sens part avec une liste d'exemples vide : le format doit être
        # le même qu'il ait été enrichi ou non, sans quoi l'application aurait
        # à distinguer deux formes d'entrée.
        for bloc in sens:
            if len(bloc) < 3:
                bloc.append([])

        enregistrement = choisir_enregistrement(nature, genre, enregistrements)
        compteur["sens"] += len(sens)
        if enregistrement is None:
            compteur["sans_entree"] += 1
            continue

        appariement = apparier([b[0] for b in sens],
                               [s["d"] for s in enregistrement["s"]])
        for bloc, rang in zip(sens, appariement):
            if rang is None:
                continue
            compteur["apparies"] += 1
            exemples = enregistrement["s"][rang]["x"]
            bloc[2] = [list(x) for x in exemples]
            if exemples:
                compteur["avec_exemple"] += 1

        # Les sens que WikDict ne connaît pas, quand ils apportent un exemple.
        deja = {r for r in appariement if r is not None}
        ajoutes = 0
        for rang, sens_wikt in enumerate(enregistrement["s"]):
            if ajoutes >= SENS_SUPPLEMENTAIRES_MAX:
                break
            if rang in deja or not sens_wikt["x"]:
                continue
            sens.append([sens_wikt["d"], [], [list(x) for x in sens_wikt["x"]]])
            ajoutes += 1
            compteur["sens_ajoutes"] += 1

        lecture[5] = [list(f) for f in enregistrement.get("f", ())]
        lecture[6] = [m for m in enregistrement.get("syn", ())
                      if m != entree["mot"]]

    return compteur
