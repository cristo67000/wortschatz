#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Lecture du corpus Tatoeba : phrases alignées allemand/français.

Deux usages, une seule traversée :
  * compter les mots réellement employés, pour classer le vocabulaire par
    fréquence d'usage — bien plus fidèle que le score d'« importance » de
    WikDict, qui mesure l'activité des contributeurs du Wiktionnaire et met
    « Schnecke » en deuxième position ;
  * fournir les phrases d'exemple et la matière des exercices en contexte.

Fichiers d'origine (voir SOURCES.md) :
    deu_sentences.tsv.bz2   id  ⇥ deu ⇥ texte
    fra_sentences.tsv.bz2   id  ⇥ fra ⇥ texte
    deu-fra_links.tsv.bz2   id_allemand ⇥ id_français
"""

import bz2
import re
from collections import Counter, defaultdict
from pathlib import Path

import commun

SOURCES = Path(__file__).resolve().parent / "sources"

# Un mot : des lettres, éventuellement liées par une apostrophe (« aujourd'hui »)
# ou un trait d'union (« peut-être », « Kindergarten-Kind »).
MOT = re.compile(r"[^\W\d_]+(?:['’\-][^\W\d_]+)*", re.UNICODE)

# En français, l'apostrophe marque le plus souvent une élision : « j'ai » est
# « je » + « ai », et compter « j'ai » comme un mot laisse le verbe « avoir »
# introuvable. On ne coupe donc qu'après les élidables connus — « aujourd'hui »,
# « quelqu'un », « presqu'île » et « prud'homme » restent entiers parce que
# « aujourd », « quelqu », « presqu » et « prud » n'y figurent pas.
ELIDABLES = {"j", "c", "d", "l", "m", "n", "s", "t", "qu",
             "jusqu", "lorsqu", "puisqu", "quoiqu"}

# Le trait d'union de l'inversion — « as-tu », « a-t-il », « est-ce » — sépare
# lui aussi deux mots. Les vrais composés (« peut-être », « après-midi »,
# « grand-mère », « celui-ci ») n'ont pas de pronom après le trait et restent
# entiers.
CLITIQUES = {"je", "tu", "il", "ils", "elle", "elles", "on", "nous", "vous",
             "ce", "moi", "toi", "lui", "leur", "y", "en", "le", "la", "les", "t"}

APOSTROPHE = re.compile(r"['’]")


def decouper(brut, langue):
    """Un mot du texte → les mots qu'il contient réellement."""
    if langue != "fr":
        return [brut]

    morceaux = []
    for part in APOSTROPHE.split(brut):
        if morceaux and morceaux[-1].lower() not in ELIDABLES:
            # L'apostrophe ne séparait rien : on recolle.
            morceaux[-1] = morceaux[-1] + "'" + part
        else:
            morceaux.append(part)

    sortie = []
    for morceau in morceaux:
        if "-" not in morceau:
            sortie.append(morceau)
            continue
        bouts = morceau.split("-")
        courant = bouts[0]
        for bout in bouts[1:]:
            if bout.lower() in CLITIQUES:
                sortie.append(courant)
                courant = bout
            else:
                courant = courant + "-" + bout
        sortie.append(courant)
    return [m for m in sortie if m]


def _lire_phrases(fichier):
    """id → texte, pour un export `<langue>_sentences.tsv.bz2`."""
    phrases = {}
    with bz2.open(SOURCES / fichier, "rt", encoding="utf-8") as flux:
        for ligne in flux:
            morceaux = ligne.rstrip("\n").split("\t")
            if len(morceaux) >= 3 and morceaux[2]:
                phrases[morceaux[0]] = morceaux[2]
    return phrases


def paires():
    """Toutes les paires (texte allemand, texte français) alignées.

    Une phrase allemande peut avoir plusieurs traductions françaises : on les
    garde toutes, le choix de la meilleure se fait plus tard.
    """
    allemandes = _lire_phrases("deu_sentences.tsv.bz2")
    francaises = _lire_phrases("fra_sentences.tsv.bz2")
    liens = defaultdict(list)
    with bz2.open(SOURCES / "deu-fra_links.tsv.bz2", "rt", encoding="utf-8") as flux:
        for ligne in flux:
            morceaux = ligne.rstrip("\n").split("\t")
            if len(morceaux) == 2:
                liens[morceaux[0]].append(morceaux[1])

    resultat = []
    for id_de, ids_fr in liens.items():
        texte_de = allemandes.get(id_de)
        if not texte_de:
            continue
        for id_fr in ids_fr:
            texte_fr = francaises.get(id_fr)
            if texte_fr:
                resultat.append((texte_de, texte_fr))
    return resultat, allemandes, francaises


def compter(textes, langue="fr"):
    """Fréquence des mots, sur les clés normalisées."""
    return compter_deux(textes, langue)[0]


def compter_deux(textes, langue="fr"):
    """Deux comptes : par clé normalisée, et par forme exactement écrite.

    Le second sert à départager les vedettes qui partagent une clé — « Ich »
    (le moi, un nom) et « ich » (le pronom), « de » et « dé », « sein » et
    « Sein ». Sans lui, la casse étant gommée, les deux reçoivent la même
    fréquence et le nom rare se retrouve hissé au niveau du pronom.

    Le **premier mot de chaque phrase est écarté du compte exact** : sa
    majuscule vient de la ponctuation, pas du mot. En allemand, où tous les
    noms portent la majuscule, c'est ce qui distingue un vrai nom d'un simple
    début de phrase.
    """
    par_cle = Counter()
    par_forme = Counter()
    for texte in textes:
        rang = 0
        for brut in MOT.findall(texte):
            for mot in decouper(brut, langue):
                k = commun.cle(mot)
                if k:
                    par_cle[k] += 1
                    if rang > 0:
                        par_forme[mot] += 1
                rang += 1
    return par_cle, par_forme


def mots(texte, langue="fr"):
    """Les mots d'une phrase, en clés normalisées, dans l'ordre."""
    return [commun.cle(m) for brut in MOT.findall(texte)
            for m in decouper(brut, langue)]


if __name__ == "__main__":
    import time
    debut = time.time()
    liste, allemandes, francaises = paires()
    print(f"{len(allemandes)} phrases allemandes, {len(francaises)} françaises")
    print(f"{len(liste)} paires alignées — {time.time()-debut:.0f} s")

    compte = compter(allemandes.values())
    print(f"\n{len(compte)} formes distinctes en allemand")
    print("  les 20 plus fréquentes :")
    print("   ", ", ".join(f"{m}({n})" for m, n in compte.most_common(20)))

    print("\n  exemples de paires :")
    for de, fr in liste[:4]:
        print(f"    DE  {de}")
        print(f"    FR  {fr}\n")
