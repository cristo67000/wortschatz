#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Choix des phrases d'exemple.

Le corpus Tatoeba offre 156 484 paires allemand/français alignées. On n'en garde
que quelques-unes par mot, et le choix compte plus que le nombre : une phrase
d'exemple n'aide que si l'apprenant peut la lire presque entièrement. Une phrase
où trois mots sur dix sont inconnus n'enseigne rien — elle décourage.

Trois critères, dans cet ordre :

1. **La longueur.** Sept mots environ. En dessous la phrase n'a pas de contexte
   (« Ja. »), au-dessus elle demande plus d'efforts qu'elle n'en épargne.
2. **La lisibilité.** La part des mots de la phrase qui appartiennent au
   vocabulaire courant. C'est la traduction, grossière mais opérante, de l'idée
   qu'on apprend un mot nouveau dans une phrase connue, et non l'inverse.
3. **La variété.** Une même phrase ne sert que quelques mots : sans cette
   limite, les mêmes trois phrases passe-partout illustreraient la moitié du
   dictionnaire.

Les phrases retenues forment un vivier commun aux deux langues — une paire
illustre un mot allemand *et* un mot français — puis chaque entrée ne garde que
les numéros de ses phrases. Sans cela, chaque paire serait recopiée jusqu'à
quatorze fois.
"""

from collections import defaultdict

import commun
import corpus

# Ce qu'on cherche : ni « Ja. » ni une phrase de quarante mots.
LONGUEUR_IDEALE = 7
LONGUEUR_MIN = 3
LONGUEUR_MAX = 16

# Combien de phrases par mot, et combien de mots une phrase peut illustrer.
PAR_MOT = 3
REUTILISATION_MAX = 6

# Un mot est « courant » s'il est dans les N premiers du classement.
SEUIL_COURANT = 6000


def lemmes_de(texte, langue, vedettes, formes):
    """Les vedettes présentes dans une phrase, une seule fois chacune."""
    trouves = []
    for k in corpus.mots(texte, langue):
        if not k:
            continue
        if k in vedettes:
            for mot in vedettes[k]:
                if mot not in trouves:
                    trouves.append(mot)
        for cle_lemme in formes.get(k, ()):
            for mot in vedettes.get(cle_lemme, ()):
                if mot not in trouves:
                    trouves.append(mot)
    return trouves


def lisibilite(texte, langue, rangs, vedettes, formes):
    """Part des mots de la phrase qui appartiennent au vocabulaire courant."""
    mots = [k for k in corpus.mots(texte, langue) if k]
    if not mots:
        return 0.0
    connus = 0
    for k in mots:
        cibles = list(vedettes.get(k, ()))
        for cle_lemme in formes.get(k, ()):
            cibles += list(vedettes.get(cle_lemme, ()))
        if any(rangs.get(mot, 10 ** 9) < SEUIL_COURANT for mot in cibles):
            connus += 1
    return connus / len(mots)


def note(texte_de, texte_fr, langue, rangs, vedettes, formes):
    """Plus c'est haut, meilleure est la phrase comme exemple."""
    mots_de = len(corpus.mots(texte_de, "de"))
    mots_fr = len(corpus.mots(texte_fr, "fr"))
    if not (LONGUEUR_MIN <= mots_de <= LONGUEUR_MAX):
        return None
    if not (LONGUEUR_MIN <= mots_fr <= LONGUEUR_MAX + 4):
        return None

    texte = texte_de if langue == "de" else texte_fr
    valeur = -1.2 * abs(len(corpus.mots(texte, langue)) - LONGUEUR_IDEALE)
    valeur += 8.0 * lisibilite(texte, langue, rangs, vedettes, formes)
    # Une phrase qui se termine par un point est une phrase complète ; celles
    # qui finissent par une virgule ou rien du tout sont souvent des fragments.
    if texte_de.rstrip().endswith((".", "!", "?")):
        valeur += 0.5
    return valeur


def choisir(paires, dictionnaires, index_formes, ordres, journal=None):
    """Sélectionne les phrases et les rattache aux vedettes.

    Renvoie `(vivier, par_vedette)` :
      vivier      liste de [texte allemand, texte français]
      par_vedette {langue: {vedette: [numéros dans le vivier]}}
    """
    rangs = {}
    vedettes = {}
    for langue in ("de", "fr"):
        rangs[langue] = {e["mot"]: i for i, e in enumerate(ordres[langue])}
        par_cle = defaultdict(list)
        for mot in dictionnaires[langue]:
            par_cle[commun.cle(mot)].append(mot)
        vedettes[langue] = dict(par_cle)

    # Pour chaque vedette, les meilleures phrases candidates.
    candidates = {"de": defaultdict(list), "fr": defaultdict(list)}
    for numero, (texte_de, texte_fr) in enumerate(paires):
        for langue in ("de", "fr"):
            valeur = note(texte_de, texte_fr, langue, rangs[langue],
                          vedettes[langue], index_formes[langue])
            if valeur is None:
                continue
            texte = texte_de if langue == "de" else texte_fr
            for mot in lemmes_de(texte, langue, vedettes[langue], index_formes[langue]):
                candidates[langue][mot].append((valeur, numero))

    # Attribution, du mot le plus utile au moins utile : les mots que l'on
    # apprendra en premier ont droit aux meilleures phrases, et à celles qui ne
    # sont pas encore usées.
    usage = defaultdict(int)
    retenues = {"de": {}, "fr": {}}
    numeros_gardes = {}

    for langue in ("de", "fr"):
        for entree in ordres[langue]:
            mot = entree["mot"]
            lot = candidates[langue].get(mot)
            if not lot:
                continue
            lot.sort(key=lambda c: -c[0])
            choisies = []
            # Tatoeba donne souvent plusieurs traductions d'une même phrase :
            # « Heute Abend gehen wir in die Kirche » apparaît avec « nous
            # allons » et avec « nous irons ». Ce sont deux paires distinctes,
            # mais un seul exemple — les montrer toutes deux donne à la fiche
            # l'air de bégayer. On ne garde qu'une paire par phrase source.
            deja_vues = set()
            for _valeur, numero in lot:
                if usage[numero] >= REUTILISATION_MAX:
                    continue
                source = paires[numero][0 if langue == "de" else 1]
                if source in deja_vues:
                    continue
                deja_vues.add(source)
                choisies.append(numero)
                usage[numero] += 1
                if len(choisies) >= PAR_MOT:
                    break
            if choisies:
                retenues[langue][mot] = choisies
                for numero in choisies:
                    numeros_gardes.setdefault(numero, len(numeros_gardes))

    # Renumérotation : le vivier ne contient que les phrases effectivement
    # retenues, et les entrées pointent dessus.
    vivier = [None] * len(numeros_gardes)
    for ancien, nouveau in numeros_gardes.items():
        vivier[nouveau] = list(paires[ancien])
    for langue in ("de", "fr"):
        for mot, liste in retenues[langue].items():
            retenues[langue][mot] = [numeros_gardes[n] for n in liste]

    if journal is not None:
        journal["paires"] = len(paires)
        journal["vivier"] = len(vivier)
        journal["mots_de"] = len(retenues["de"])
        journal["mots_fr"] = len(retenues["fr"])

    return vivier, retenues


def sous_ensemble(vivier, retenues, mots_de, mots_fr):
    """Restreint le vivier aux phrases utiles à une sélection de vedettes.

    Le paquet noyau ne contient que 9 000 mots par langue : lui livrer les
    phrases des 106 000 le ferait peser plus que le dictionnaire lui-même.
    """
    gardes = {}
    petites = {"de": {}, "fr": {}}
    for langue, mots in (("de", mots_de), ("fr", mots_fr)):
        for mot in mots:
            liste = retenues[langue].get(mot)
            if not liste:
                continue
            petites[langue][mot] = [gardes.setdefault(n, len(gardes)) for n in liste]

    petit_vivier = [None] * len(gardes)
    for ancien, nouveau in gardes.items():
        petit_vivier[nouveau] = vivier[ancien]
    return petit_vivier, petites
