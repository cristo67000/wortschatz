#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Le supplément éditorial des mots courants (version 3.4).

Après WikDict, sa base SQLite, les tables du Wiktionnaire et les gloses de
l'édition d'en face, il reste des mots que tout le monde emploie et qu'aucune
source libre ne traduit : « bof », « resto », « ordi », « nettement »,
« similaire », « naja », « sorry », « Abo », « Pommes ». La construction les
mesure (`wordfreq` ≥ 3,6, une entrée au Wiktionnaire de leur langue) ; ce
fichier en traduit une liste fermée, relue mot à mot :
[`mots_editoriaux.json`](mots_editoriaux.json).

C'est du contenu rédigé, et il est traité comme tel — à la façon des sept
mots-outils de `grammaire.py` et du supplément des expressions :

* **seules les traductions sont écrites ici.** La définition, les exemples,
  la prononciation et les formes viennent du Wiktionnaire de la langue du mot,
  par le même chemin que pour toute vedette ;
* **une source passe toujours devant.** Une entrée n'est appliquée qu'à un mot
  encore absent ; le jour où WikDict le traduit, elle cède sa place sans qu'on
  ait rien à retirer, et la construction le signale ;
* **la provenance est dite** : dans le fichier, dans SOURCES.md et dans
  `confidentialite.html`. Ces traductions n'ont pas été relues par un locuteur
  natif.

Le fichier porte aussi des **variantes** : des graphies familières qui ne
méritent pas une fiche à elles — « heut » pour *heute*, « bcp » pour
*beaucoup* — et qu'on rattache à leur vedette comme une forme fléchie.
"""

import json
from pathlib import Path

import alignement
import commun
import traductions

FICHIER = Path(__file__).resolve().parent / "mots_editoriaux.json"


def charger(chemin=FICHIER):
    if not chemin.exists():
        return {"mots": {}, "variantes": {}}
    return json.loads(chemin.read_text(encoding="utf-8"))


def appliquer(dictionnaires, extraits, index_formes, index_graphies, supplement, journal):
    """Crée les vedettes du supplément encore absentes, rattache les variantes.

    Rend `{langue: [vedettes créées]}`. `journal` reçoit les mots que les
    sources ont rattrapés (`cedes`) et les variantes sans vedette (`orphelines`).
    """
    journal.setdefault("cedes", [])
    journal.setdefault("orphelines", [])
    journal.setdefault("variantes", 0)
    creees = {"de": [], "fr": []}
    for langue in ("de", "fr"):
        entrees = dictionnaires[langue]
        cles = {commun.cle(m) for m in entrees}
        propres = extraits.get(langue, {})
        for brut in supplement.get("mots", {}).get(langue, ()):
            mot, nature = brut["mot"], brut["nature"]
            if commun.cle(mot) in cles or commun.cle(mot) in index_formes[langue]:
                journal["cedes"].append((langue, mot))
                continue
            voulue = alignement.NATURE_TEI.get(nature)
            siens = [e for e in propres.get(mot, ())
                     if voulue is None or alignement.NATURE_WIKT.get(e.get("p")) == voulue]
            sien = siens[0] if siens else {}
            # Même règle que pour les gloses croisées : un mot à sens unique
            # réunit sa définition et ses traductions ; sinon les traductions
            # restent en tête, et les sens du Wiktionnaire suivent.
            definition = sien["s"][0]["d"] if len(sien.get("s", ())) == 1 else ""
            lecture = [nature, brut.get("genre") or sien.get("g") or "",
                       sien.get("api") or "", [],
                       [[traductions.couper(definition),
                         list(brut["traductions"])[:traductions.TRADUCTIONS_MAX]]]]
            entree = {"mot": mot, "lectures": [lecture], "neuve": True,
                      "editoriale": True}
            alignement.enrichir(entree, siens)
            entrees[mot] = entree
            cles.add(commun.cle(mot))
            creees[langue].append(mot)

        for forme, cible in supplement.get("variantes", {}).get(langue, {}).items():
            k = commun.cle(forme)
            if cible not in entrees:
                journal["orphelines"].append((langue, forme, cible))
                continue
            if k in cles:
                journal["cedes"].append((langue, forme))
                continue
            index_formes[langue].setdefault(k, set()).add(commun.cle(cible))
            index_graphies[langue].setdefault(cible, set()).add(forme)
            journal["variantes"] += 1
    return creees
