#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Les gloses croisées : ce que chaque édition dit des mots de l'autre langue
(version 3.4, d'après le module du même nom de l'application Vocabulary).

Le Wiktionnaire français décrit des dizaines de milliers de mots allemands
**en français** ; l'allemand décrit des milliers de mots français **en
allemand**. Une glose de ce genre est le plus souvent une traduction :
« Handy » → *Téléphone portable*, « copine » → *Freundin*, « zu » → *Trop.*

WikDict n'en tient pas compte : il ne lit que les tables de traduction. Or ce
sont précisément les mots de la conversation — familiers, récents, empruntés —
que les tables oublient et que les gloses décrivent. Ce module s'en sert pour
une seule chose : **créer une vedette absente, si elle est d'usage courant**.

Trois conditions, toutes nécessaires :

* l'usage est attesté — wordfreq ou Tatoeba ;
* le mot a sa propre entrée dans l'édition de sa langue : c'est elle qui donne
  la définition, l'exemple, le genre et les formes, et elle garantit qu'on a
  affaire à un mot de cette langue, pas à un mot anglais égaré dans le corpus ;
* ce n'est pas une forme fléchie d'une vedette déjà là.

Ce qu'on ne fait pas : ajouter des équivalents à une vedette existante. On ne
saurait pas sous quel sens les ranger, et une traduction sous le mauvais sens
est pire qu'une traduction absente.
"""

import re

import alignement
import commun
import traductions

# Une glose se découpe en équivalents (segments courts) et en explications
# (segments longs). « Schritt, Tritt » donne deux équivalents ; « Et, concatène
# deux éléments dans une même phrase » en donne un, et une explication.
EQUIVALENT_MOTS_MAX = 4
EQUIVALENTS_MAX = 6
PARENTHESE = re.compile(r"\s*\([^)]*\)")
CROCHETS = re.compile(r"\s*\[[^\]]*\]")

# Débuts de segment qui annoncent une explication, jamais une traduction —
# dans les deux langues de glose.
EXPLICATIVES = re.compile(
    r"^(indique|désigne|exprime|utilisé|employé|sert |se dit|qui |que |dont "
    r"|celui|celle|personne qui|action de|fait de|état de|relatif|relative "
    r"|forme |pluriel |féminin |masculin |variante |abréviation |contraction "
    r"|synonyme |article |pronom |préfixe |suffixe |particule |interjection "
    r"|terme |mot |marque |première personne|deuxième personne|troisième personne"
    r"|bezeichnet|bezeichnung|drückt |leitet |kennzeichnet|gibt an|steht für"
    r"|form |plural |singular |verkleinerungsform|kurzform|abkürzung |variante "
    r"|person, die|jemand, der|jemand der|etwas, das|eine? der |einer der "
    r"|pronomen|artikel|präfix|suffix|partikel|interjektion|anrede |ausruf "
    r"|umgangssprachlich|veraltet|abwertend|salopp)",
    re.IGNORECASE)

# Natures wiktextract qui ne font pas de vedette ici.
NATURES_ECARTEES = {"prefix", "suffix", "interfix", "infix", "circumfix", "affix",
                    "abbrev", "name", "character", "symbol", "punct", "romanization",
                    "num", "phrase", "proverb", "contraction"}

# L'usage minimal : 3 sur l'échelle de Zipf, une occurrence par million de
# mots — le même seuil que l'extraction des mots sans traduction — ou trois
# emplois dans Tatoeba.
ZIPF_MIN = 3.0
TATOEBA_MIN = 3


# Une glose est parfois une définition coupée par ses virgules : « Relatif à
# Erfurt, ou à ses habitants », « Praktik, die Haut zu durchstechen »,
# « domaine de spécialisation, de connaissance ». Un morceau qui n'est que la
# suite d'une phrase trahit la définition entière : on la laisse de côté plutôt
# que d'en garder des débris (« ou à ses habitants », « Praktik »).
SUITES = {
    "fr": re.compile(r"^(ou|et|aussi|notamment|surtout|de|d['’]|du|des|à|au|aux|par"
                     r"|pour|avec|sans|dans|sur|qui|que|dont|où|lorsque|quand|comme"
                     r"|mais|soit|en particulier)\b", re.IGNORECASE),
    "de": re.compile(r"^(und|oder|bzw|um|wenn|dass|weil|ob|wie|als|welche[rsnm]?"
                     r"|zu|mit|von|für|auf|in|an|bei|aus|nach|besonders|vor allem)\b"),
}
# Un article allemand suivi d'autre chose qu'un seul nom ouvre une relative
# (« die Haut zu durchstechen ») ; suivi d'un nom seul, c'est un équivalent
# (« die Inhaberin »), dont on retire l'article.
ARTICLE_DE = re.compile(r"^(der|die|das|den|dem|des)\s+(\S+)(.*)$")
# Les étiquettes grammaticales qu'une glose porte sans parenthèses.
ETIQUETTES = re.compile(r"^(transitif|intransitif|pronominal|familier|figuré|populaire"
                        r"|vieilli|argot|littéraire|soutenu)\s+", re.IGNORECASE)


def equivalents(glose, langue_glose, vedette=""):
    """Les équivalents d'une glose, dans l'ordre du Wiktionnaire."""
    propre = CROCHETS.sub("", PARENTHESE.sub("", glose)).strip()
    propre = alignement.PREFIXE_DOMAINE.sub("", propre).strip().rstrip(".")
    propre = ETIQUETTES.sub("", propre)
    suite = SUITES.get(langue_glose)
    sortie = []
    for segment in re.split(r";", propre):
        for rang, morceau in enumerate(re.split(r",(?![^(]*\))", segment)):
            morceau = morceau.strip(" .:!?…«»\"")
            if not morceau:
                continue
            if rang > 0 and suite is not None and suite.match(morceau):
                return []
            if langue_glose == "de":
                article = ARTICLE_DE.match(morceau)
                if article:
                    if article.group(3).strip() or not article.group(2)[:1].isupper():
                        return []
                    morceau = article.group(2)
            if EXPLICATIVES.match(morceau):
                continue
            if len(morceau.split()) > EQUIVALENT_MOTS_MAX:
                continue
            # Le mot lui-même n'est pas sa traduction : « Vorschein » →
            # « zum Vorschein kommen ».
            if vedette and commun.cle(vedette) in commun.cle(morceau).split():
                continue
            # « Trop. », « Crevé » : la majuscule du Wiktionnaire français est
            # celle d'un début de phrase, pas du mot. Les noms allemands, eux,
            # gardent la leur.
            if (langue_glose == "fr" and len(morceau) > 1 and morceau[0].isupper()
                    and morceau[1].islower()):
                morceau = morceau[0].lower() + morceau[1:]
            morceau = traductions.nettoyer(morceau)
            if morceau and morceau not in sortie:
                sortie.append(morceau)
    return sortie[:EQUIVALENTS_MAX]


# Une glose qui n'est qu'un renvoi : « tschüss » → *Variante de tschüs.* Ce
# n'est pas une traduction, mais c'est une graphie de plus d'une vedette qu'on
# a : on en fait une forme, et « tschüss » mène à « tschüs ».
RENVOI = re.compile(
    r"^(?:variante|autre (?:orthographe|forme|graphie)|orthographe (?:alternative|ancienne"
    r"|réformée|traditionnelle|rectifiée)|ancienne orthographe|forme (?:alternative|abrégée"
    r"|courte|familière)|graphie (?:alternative|ancienne)|nebenform|schreibvariante"
    r"|alternative schreibweise|alte schreibweise|veraltete schreibweise|variante)"
    r"(?: orthographique| typographique| familière| populaire)?"
    r" (?:de|d['’]|von|zu|für)\s*(?P<cible>[^\s,;.()]+(?: [^\s,;.()]+)?)\s*\.?$",
    re.IGNORECASE)


def renvois(gloses, dictionnaires, index_formes, index_graphies, journal):
    """Les graphies que l'autre édition donne pour variantes d'une vedette.

    La variante compte aussi pour la fréquence de sa vedette : « tschüss »,
    l'orthographe la plus écrite aujourd'hui, est ce qui fait de « tschüs »
    un mot courant."""
    journal.setdefault("renvois", 0)
    for langue in ("de", "fr"):
        entrees = dictionnaires[langue]
        cles = {commun.cle(m) for m in entrees}
        formes = index_formes[langue]
        for k, enregistrements in gloses.get(langue, {}).items():
            if k in cles or k in formes:
                continue
            for enregistrement in enregistrements:
                for glose in enregistrement.get("g", ()):
                    trouve = RENVOI.match(glose.strip())
                    if not trouve:
                        continue
                    cible = trouve.group("cible")
                    if cible in entrees and commun.cle(cible) != k:
                        formes.setdefault(k, set()).add(commun.cle(cible))
                        index_graphies[langue].setdefault(cible, set()).add(
                            enregistrement["m"])
                        journal["renvois"] += 1
                        break
                else:
                    continue
                break


def recevable(mot, langue, zipf, emplois, index_formes, cles_vedettes, journal):
    k = commun.cle(mot)
    if k in cles_vedettes:
        journal["deja_la"] += 1
        return False
    if k in index_formes.get(langue, {}):
        journal["ecartees_formes"] += 1
        return False
    if len(k) <= 2 or not re.fullmatch(r"[^\W\d_]+(?:['’\-][^\W\d_]+)*", mot):
        journal["ecartees_courtes"] += 1
        return False
    # En français, une majuscule initiale annonce un nom propre ; en allemand
    # c'est la marque de tous les noms. Les sigles tout en capitales passent
    # dans les deux langues.
    if langue == "fr" and mot[:1].isupper() and not mot.isupper():
        journal["ecartees_propres"] += 1
        return False
    if zipf < ZIPF_MIN and emplois < TATOEBA_MIN:
        journal["ecartees_rares"] += 1
        return False
    return True


def creer(dictionnaires, gloses, extraits, frequence, index_formes, journal):
    """Crée les vedettes courantes que seules les gloses croisées traduisent.

    `gloses[langue]` : `{clé: [enregistrement]}` des mots de `langue` décrits
    par l'autre édition (`wiktionnaire.charger_gloses_croisees`).
    `extraits[langue]` : l'extrait de l'édition de la langue du mot, par
    vedette. `frequence(langue, mot)` rend (zipf, emplois dans Tatoeba).
    Rend la liste des vedettes créées, par langue.
    """
    for cle_journal in ("creees", "deja_la", "ecartees_formes", "ecartees_courtes",
                        "ecartees_propres", "ecartees_rares", "sans_entree",
                        "sans_equivalent"):
        journal.setdefault(cle_journal, 0)
    journal.setdefault("exemples", [])
    creees = {"de": [], "fr": []}

    for langue in ("de", "fr"):
        autre = "fr" if langue == "de" else "de"
        entrees = dictionnaires[langue]
        cles_vedettes = {commun.cle(m) for m in entrees}
        propres = extraits.get(langue, {})
        for _k, enregistrements in sorted(gloses.get(langue, {}).items()):
            for enregistrement in enregistrements:
                mot = enregistrement["m"]
                nature = enregistrement.get("p") or ""
                if nature in NATURES_ECARTEES or mot in entrees:
                    continue
                zipf, emplois = frequence(langue, mot)
                if not recevable(mot, langue, zipf, emplois, index_formes,
                                 cles_vedettes, journal):
                    continue
                # L'entrée de l'édition de sa langue, de même nature.
                siens = [e for e in propres.get(mot, ()) if e.get("p") == nature]
                if not siens:
                    journal["sans_entree"] += 1
                    continue
                eq = []
                for glose in enregistrement.get("g", ()):
                    for equivalent in equivalents(glose, autre, mot):
                        if equivalent not in eq:
                            eq.append(equivalent)
                if not eq:
                    journal["sans_equivalent"] += 1
                    continue
                sien = siens[0]
                # Un mot à sens unique : la glose d'en face traduit ce sens-là,
                # on les réunit — définition, exemple et traductions sur une
                # seule ligne. Sinon on ne sait pas lequel elle traduit, et la
                # traduction reste à part, en tête.
                definition = sien["s"][0]["d"] if len(sien.get("s", ())) == 1 else ""
                lecture = [traductions.NATURE.get(nature, ""),
                           sien.get("g") or enregistrement.get("ge") or "",
                           sien.get("api") or "", [],
                           [[traductions.couper(definition), eq[:EQUIVALENTS_MAX]]]]
                entree = {"mot": mot, "lectures": [lecture], "neuve": True,
                          "croisee": True}
                # Définitions et exemples de l'édition de la langue du mot :
                # le premier sens (la glose d'en face) n'a pas de définition à
                # apparier ; `enrichir` ajoute à sa suite les sens illustrés.
                alignement.enrichir(entree, siens)
                entrees[mot] = entree
                cles_vedettes.add(commun.cle(mot))
                creees[langue].append(mot)
                journal["creees"] += 1
                if len(journal["exemples"]) < 16:
                    journal["exemples"].append((langue, mot, eq[:3]))
                break
    return creees
