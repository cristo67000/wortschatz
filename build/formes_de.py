#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Formes allemandes déclinées qu'aucune source ne liste (version 3.4).

Le TEI et le Wiktionnaire déclinent les adjectifs qu'ils décrivent. Ils ne
déclinent pas les participes, qui ne sont pas des vedettes : « bestehend » est
une forme de *bestehen*, « entstanden » une forme de *entstehen*, et voilà
tout. Or un participe s'emploie comme adjectif, et prend alors les cinq
terminaisons de l'adjectif : « die bestehende Regel », « der entstandene
Schaden », « im folgenden Kapitel ». Ces formes étaient introuvables.

La règle est celle de toutes les grammaires — radical + e, en, em, er, es —
mais on ne l'applique pas à l'aveugle. On part des mots **attestés** (wordfreq
ou Tatoeba) qu'aucune vedette ni aucune forme connue n'explique, et l'on se
demande si, privés de leur terminaison, ils deviennent un adjectif du
dictionnaire ou une forme verbale connue. Rien n'est inventé : chaque forme
ajoutée est un mot qu'on lit vraiment, et qui menait jusqu'ici à rien.
"""

import commun

# La plus longue d'abord : « bestehenden » perd « en », pas « n ».
TERMINAISONS = ("en", "em", "er", "es", "e")
RADICAL_MIN = 3

# Les particules séparables. L'infinitif en « zu » d'un verbe à particule
# glisse « zu » entre les deux : « anfangen » → « anzufangen », « aufhören »
# → « aufzuhören ». Aucune source ne liste cette forme, qu'on lit pourtant à
# chaque page (« Es fängt an zu regnen » mais « ohne aufzuhören »).
PARTICULES = sorted((
    "ab an auf aus bei dar durch ein empor entgegen entlang fest fort frei "
    "gegenüber heim her herab heran herauf heraus herbei herein herüber herum "
    "herunter hervor hin hinab hinauf hinaus hinein hinüber hinunter hinzu "
    "kennen los mit nach nieder statt teil um vor voran voraus vorbei vorüber "
    "weg weiter wieder zu zurecht zurück zusammen").split(), key=len, reverse=True)


def construire(entrees, index_formes, mots_attestes, journal=None):
    """Rend `{clé de forme: {clés de lemme}}` pour les formes à ajouter.

    `entrees` : les vedettes allemandes ; `index_formes` : forme → lemmes, tel
    qu'il est déjà ; `mots_attestes` : les graphies dont l'usage est attesté.
    """
    cles_vedettes = {commun.cle(m) for m in entrees}
    adjectifs = {commun.cle(m) for m, e in entrees.items()
                 if any(l[0] == "adj" for l in e["lectures"])}
    verbes = {commun.cle(m) for m, e in entrees.items()
              if any(l[0] == "v" for l in e["lectures"])}

    ajouts = {}
    bilan = {"adjectifs": 0, "participes": 0}
    for mot in mots_attestes:
        k = commun.cle(mot)
        if not k or " " in k or k in cles_vedettes or k in index_formes or k in ajouts:
            continue
        for fin in TERMINAISONS:
            if not k.endswith(fin) or len(k) - len(fin) < RADICAL_MIN:
                continue
            radical = k[:-len(fin)]
            cibles = set()
            if radical in adjectifs:
                cibles.add(radical)
                bilan["adjectifs"] += 1
            else:
                # Un participe : « bestehend » → bestehen, « gemacht » → machen.
                lemmes = {l for l in index_formes.get(radical, ()) if l in verbes}
                if lemmes and (radical.endswith("end") or radical.endswith("t")
                               or radical.endswith("en")):
                    cibles |= lemmes
                    bilan["participes"] += 1
            if cibles:
                ajouts[k] = cibles
                break

    # L'infinitif en « zu » des verbes à particule, s'il est attesté.
    attestes = {commun.cle(m) for m in mots_attestes}
    bilan["infinitifs_zu"] = 0
    for mot, entree in entrees.items():
        if " " in mot or not any(l[0] == "v" for l in entree["lectures"]):
            continue
        for particule in PARTICULES:
            reste = mot[len(particule):]
            if mot.startswith(particule) and len(reste) >= 3 and reste.endswith("n"):
                forme = commun.cle(particule + "zu" + reste)
                if forme in attestes and forme not in cles_vedettes:
                    ajouts.setdefault(forme, set()).add(commun.cle(mot))
                    bilan["infinitifs_zu"] += 1
                break

    if journal is not None:
        journal.update(bilan)
        journal["formes"] = len(ajouts)
    return ajouts
