#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Construction des paquets de données de Wortschatz.

Entrée  : build/sources/  (voir telecharger.py et SOURCES.md)
Sortie  : data/           (ce qui part avec l'application)

Deux paquets sont produits, chacun complet et autonome :

  data/noyau/    les mots les plus courants — livré avec l'application et
                 pré-caché par le service worker : l'application est utilisable
                 hors ligne dès l'installation, sans rien télécharger de plus.
  data/complet/  tout le dictionnaire, plus l'index des formes fléchies qui
                 fait retrouver « gehen » quand on tape « ging ». Téléchargé
                 depuis l'application, sur décision de l'utilisateur.

Le noyau est un sous-ensemble du complet, pas une découpe : quand le complet est
installé, l'application ignore simplement le noyau. Quelques méga-octets en
double, contre une bascule sans état intermédiaire.

Format d'une entrée, en tableau plutôt qu'en objet — à 107 000 entrées, le nom
des clés répété pèse plus que ce qu'il apporte :

    [ mot, bande, lectures, phrases, voisins ]
      lectures = [ [ nature, genre, prononciation, [formes], sens,
                     flexion, synonymes ], … ]
        sens   = [ [ définition, [traductions], [citations], [phrases] ], … ]
          citations = [ [ texte, [début, fin] du mot en gras, référence ], … ]
          phrases   = [ numéro, … ]   → dans phrases-NNN.json du même paquet
        flexion   = [ [ code, graphie, article ], … ] → pluriel, temps primitifs
        synonymes = [ mot, … ]
      phrases  = [ numéro, … ]   → celles qu'aucun sens n'a réclamées
      voisins  = [ mot, … ]      → « autour de ce mot », même langue

Une « lecture » est une façon de lire le mot : « See » masculin (le lac) et
« See » féminin (la mer) sont deux lectures d'une même vedette, réunies sur une
seule fiche parce que c'est ainsi qu'on les apprend — par contraste.

Flexion et synonymes pendent de la **lecture**, non de la vedette, et c'est le
même exemple qui l'impose : la mer n'a pas de pluriel et fait « der See » au
génitif, le lac fait « des Sees ». Rassemblés sur l'entrée, ils mêlaient les
deux et enseignaient un génitif faux sous le bon mot.

── Ce qui change en version 2 ─────────────────────────────────────────────

Les exemples se rangent sous **chaque signification**, et non plus sous le mot
entier. « abbauen » veut dire extraire, atténuer ou démanteler ; trois phrases
posées sous le mot en illustraient une, et l'apprenant devait deviner laquelle.
Deux sources s'en chargent, chacune pour ce qu'elle fait de mieux :

  citations  le Wiktionnaire, dans la langue du mot, rattachées au sens par
             `alignement.py` — nombreuses, mais non traduites ;
  phrases    Tatoeba, paires traduites, rattachées au sens par la traduction
             qui figure en face (`phrases.attribuer_aux_sens`).

Les citations voyagent **dans l'entrée**, sans vivier séparé : contrairement aux
paires Tatoeba, qu'une même phrase fait servir jusqu'à huit mots, une citation
n'illustre qu'un sens d'un mot. Un vivier ne dédoublonnerait rien et coûterait
une requête de plus au moment précis où l'on veut lire.
"""

import argparse
import functools
import hashlib
import json
import math
import shutil
import sqlite3
import time
from collections import Counter, defaultdict
from pathlib import Path

import alignement
import commun
import croisees
import expressions
import familles
import grammaire
import mots_editoriaux
import formes_de
import formes_fr
import phrases
import corpus
import tei
import traductions
import wikdict_sqlite
import wiktionnaire

RACINE = Path(__file__).resolve().parent
SOURCES = RACINE / "sources"
DATA = RACINE.parent / "data"

# --- Réglages de la construction --------------------------------------------

# Combien d'entrées par langue dans le noyau livré avec l'application.
#
# Passé de 9 000 à 12 000 en version 2. La raison n'est pas la recherche — 9 000
# mots couvrent l'essentiel de ce qu'on cherche — mais le fait que **tout mot
# affiché est désormais cliquable**. Un mot rencontré dans une citation et
# absent du paquet ne mène nulle part ; en dessous de ce seuil, trop de clics
# tombaient à vide, et un lien mort décourage plus qu'il n'enseigne.
TAILLE_NOYAU = 12000

# Bornes des bandes de fréquence, en rang. Ce ne sont pas des niveaux du CECRL :
# les listes officielles sont sous droits (voir SOURCES.md). Ce sont des rangs
# d'usage constaté dans le corpus, ce qui se mesure et se vérifie.
BANDES = [1200, 4000, 12000]          # → bandes 0, 1, 2, puis 3 au-delà
NOMS_BANDES = ["premiers-pas", "courant", "etendu", "rare"]

SENS_MAX = 3            # au-delà, on n'apprend plus rien, on se disperse
TRADUCTIONS_MAX = 6
DEFINITION_MAX = 130    # signes, coupés au mot
FORMES_MAX = 6
ENTREES_PAR_TRANCHE = 900

# Combien de citations du Wiktionnaire par signification. Deux suffisent à
# montrer le mot en emploi ; au-delà, la fiche devient une anthologie et le sens
# suivant passe sous la ligne de flottaison.
#
# Le noyau n'en garde qu'une. Il est **précaché à l'installation** : chaque
# méga-octet y est payé par tout le monde, avant même d'avoir ouvert une fiche.
# La seconde citation est un confort ; elle arrive avec le paquet complet, que
# l'on télécharge en connaissance de cause.
CITATIONS_PAR_SENS = 2
CITATIONS_NOYAU = 1
CITATION_MAX = 200      # signes ; au-delà, la phrase n'aide plus personne

# Budgets, en octets. Dépassement = échec : mieux vaut rogner ici que découvrir
# sur le téléphone que l'application pèse trop.
#
# La version 2 embarque les citations et les tableaux de flexion : les budgets
# montent en conséquence, mais restent très en deçà des 200 Mo autorisés. Le
# noyau est celui qui compte vraiment — c'est le poids installé.
#
# Version 3.1 : le noyau reçoit les expressions usuelles faites de ses propres
# mots — deux mille tournures et formules, avec leurs exemples — et passe de
# 21,5 à 22,7 Mo. Le budget monte d'un méga-octet pour le dire ; il reste là
# pour que la prochaine dérive ne passe pas inaperçue.
BUDGET_NOYAU = 23 * 1024 * 1024
BUDGET_COMPLET = 130 * 1024 * 1024


# --- Lecture et mise en forme -----------------------------------------------

def ecrire(chemin, texte):
    r"""Écrit un fichier de données, en terminant les lignes par un seul saut.

    Sans `newline=""`, Python traduit sous Windows chaque « \n » en « \r\n ».
    Les fichiers restent lisibles pour un humain, mais le retour chariot traîne
    à la fin du dernier champ de chaque ligne : l'application cherchait alors le
    lemme « gehen\r », qui n'existe dans aucun index. Un octet invisible, des
    milliers de mots devenus introuvables, et rien pour le signaler.
    """
    chemin.write_text(texte, encoding="utf-8", newline="")


def couper(texte, limite=DEFINITION_MAX):
    """Coupe une définition à la limite, sur une frontière de mot."""
    texte = texte.strip()
    if len(texte) <= limite:
        return texte
    coupe = texte[:limite].rsplit(" ", 1)[0].rstrip(" ,;:—-")
    return (coupe or texte[:limite]) + "…"


def elaguer_citations(entree):
    """Ne garde, par sens, que les citations qu'on montrera.

    `wiktionnaire.py` en retient six, classées de la plus lisible à la moins :
    de quoi choisir ici sans avoir à relire deux gigaoctets. On coupe donc dans
    l'ordre reçu, et les phrases trop longues pour tenir sur un écran de
    téléphone tombent avec le reste.
    """
    for lecture in entree["lectures"]:
        for bloc in lecture[4]:
            if len(bloc) < 3:
                continue
            gardees = [c for c in bloc[2] if len(c[0]) <= CITATION_MAX]
            bloc[2] = gardees[:CITATIONS_PAR_SENS]


def charger_dictionnaire(fichier):
    """TEI → {mot: entrée fusionnée}, l'index des formes, et les graphies.

    `graphies` garde, pour chaque vedette, les formes fléchies telles qu'elles
    s'écrivent — accents et majuscules compris. L'index `formes`, lui, est
    normalisé : il sert à chercher, pas à peser.
    """
    entrees = {}
    formes = defaultdict(set)      # clé de forme → clés de lemme
    graphies = defaultdict(set)    # vedette → graphies de ses formes fléchies
    for brut in tei.lire(fichier):
        mot = brut["mot"]
        sens = []
        for s in brut["sens"][:SENS_MAX]:
            sens.append([couper(s["def"]), s["trads"][:TRADUCTIONS_MAX]])
        if not sens:
            continue

        lecture = [
            brut["pos"],
            brut["genre"],
            brut["pron"],
            brut["montrer"][:FORMES_MAX],
            sens,
        ]
        if mot in entrees:
            # Homographe : deux lectures d'une même vedette, réunies.
            entrees[mot]["lectures"].append(lecture)
        else:
            entrees[mot] = {"mot": mot, "lectures": [lecture]}

        cle_lemme = commun.cle(mot)
        for forme in brut["flechies"]:
            k = commun.cle(forme)
            if k and " " not in k and k != cle_lemme:
                formes[k].add(cle_lemme)
            if " " not in forme:
                graphies[mot].add(forme)

    # On garde **toutes** les redirections, y compris celles dont la forme
    # ressemble à une vedette existante. « wurde » est le prétérit de « werden »
    # et se normalise comme « Würde », la dignité : les écarter parce qu'une
    # vedette porte déjà cette clé faisait disparaître le verbe des résultats.
    # Ce sont deux mots différents, l'application montre les deux.
    return entrees, dict(formes), dict(graphies)


def verser_base_sqlite(entrees, langue, journal):
    """Ajoute au dictionnaire les vedettes que seule la base SQLite connaît.

    Voir `wikdict_sqlite.py` : même source que le TEI, mouture plus récente.
    Une vedette déjà présente n'est pas touchée — le TEI garde la main sur ce
    qu'il connaît. Genre, prononciation et formes viendront du Wiktionnaire
    (`completer_par_le_wiktionnaire`).
    """
    journal.setdefault("ajoutees", 0)
    journal.setdefault("lectures", 0)
    journal.setdefault("exemples", [])
    deja = set(entrees)
    for brut in wikdict_sqlite.lire(langue, journal.setdefault("base", {})):
        mot = brut["mot"]
        if mot in deja:
            continue
        sens = [[couper(s["def"]), s["trads"][:TRADUCTIONS_MAX]]
                for s in brut["sens"][:SENS_MAX]]
        lecture = [brut["pos"], "", "", [], sens]
        if mot in entrees:
            entrees[mot]["lectures"].append(lecture)
            journal["lectures"] += 1
            continue
        entrees[mot] = {"mot": mot, "lectures": [lecture], "base_sqlite": True}
        journal["ajoutees"] += 1
        if len(journal["exemples"]) < 12:
            journal["exemples"].append((mot, sens[0][1][:3]))


def completer_par_le_wiktionnaire(entrees, par_mot, formes, graphies, journal):
    """Ce que le Wiktionnaire sait et que la vedette n'a pas : le genre et la
    prononciation des vedettes venues de la base SQLite, et pour toutes, les
    formes fléchies complètes (`ff`) — celles que la recherche doit connaître.

    Une forme n'est greffée que depuis une entrée de même nature qu'une des
    lectures : les formes du nom « Essen » ne sont pas celles du verbe.
    """
    for cle_journal in ("genres", "prononciations", "formes"):
        journal.setdefault(cle_journal, 0)
    for mot, entree in entrees.items():
        enregistrements = par_mot.get(mot)
        if not enregistrements:
            continue
        natures = {alignement.NATURE_TEI.get(l[0]) for l in entree["lectures"]}
        if entree.get("base_sqlite"):
            for lecture in entree["lectures"]:
                choisi = alignement.choisir_enregistrement(lecture[0], "", enregistrements)
                if choisi is None:
                    continue
                if not lecture[1] and lecture[0] == "n" and choisi.get("g"):
                    lecture[1] = choisi["g"]
                    journal["genres"] += 1
                if not lecture[2] and choisi.get("api"):
                    lecture[2] = choisi["api"]
                    journal["prononciations"] += 1
        cle_lemme = commun.cle(mot)
        for enregistrement in enregistrements:
            if alignement.NATURE_WIKT.get(enregistrement.get("p")) not in natures:
                continue
            for graphie in enregistrement.get("ff", ()):
                k = commun.cle(graphie)
                if len(k) < 2 or " " in k or k == cle_lemme:
                    continue
                if cle_lemme not in formes.get(k, ()):
                    formes.setdefault(k, set()).add(cle_lemme)
                    journal["formes"] += 1
                graphies.setdefault(mot, set()).add(graphie)


# « lors », « tandis », « quant », « Hinblick », « Nachhinein » : des mots
# courants qui n'existent qu'à l'intérieur d'une locution — « lors de »,
# « tandis que », « im Hinblick auf ». Aucune source n'en fait une vedette, si
# bien qu'ils restaient muets dans les citations et les phrases, où tout mot
# est cliquable. On les rattache à leurs locutions (trois au plus, les plus
# courtes d'abord), comme une forme l'est à son lemme.
LOCUTIONS_PAR_MOT_MAX = 3
ZIPF_MOT_LIE = 3.0


def mots_lies_aux_locutions(entrees, index_formes, langue):
    """Seules comptent les vraies locutions : une vedette qui commence par une
    minuscule et ne porte aucun chiffre. « Abu Dhabi », « Alice Springs » ou
    « 2ᵉ classe » ne disent rien de « dhabi », « alice » ou « eme ». En
    français, un mot à majuscule à l'intérieur (« a comme Anatole ») est un nom
    propre ; en allemand, c'est un nom commun (« im Hinblick auf »)."""
    cles_vedettes = {commun.cle(m) for m in entrees}
    par_mot = defaultdict(set)
    for mot in entrees:
        if " " not in mot or not mot[:1].islower() or any(c.isdigit() for c in mot):
            continue
        if any(lecture[0] == "pn" for lecture in entrees[mot]["lectures"]):
            continue
        for brut in corpus.MOT.findall(mot):
            for morceau in corpus.decouper(brut, langue):
                if langue == "fr" and morceau[:1].isupper():
                    continue
                k = commun.cle(morceau)
                if k and k not in cles_vedettes and k not in index_formes:
                    par_mot[k].add(commun.cle(mot))
    zipf = zipf_par_cle(langue)
    sortie = {}
    for k, locutions in par_mot.items():
        if len(k) < 3 or zipf.get(k, 0.0) < ZIPF_MOT_LIE:
            continue
        choisies = sorted(locutions, key=lambda l: (l.count(" "), len(l), l))
        sortie[k] = set(choisies[:LOCUTIONS_PAR_MOT_MAX])
    return sortie


def charger_importance(base):
    """written_rep → rel_importance, depuis une base SQLite WikDict."""
    chemin = SOURCES / base
    if not chemin.exists():
        print(f"  ! {base} absent, l'importance WikDict ne sera pas utilisée")
        return {}
    lien = sqlite3.connect(f"file:{chemin}?mode=ro", uri=True)
    valeurs = {}
    requete = ("SELECT written_rep, rel_importance FROM simple_translation "
               "WHERE rel_importance IS NOT NULL")
    for mot, importance in lien.execute(requete):
        if mot:
            valeurs[commun.cle(mot)] = importance
    lien.close()
    return valeurs


def frequences_corpus(textes, entrees, graphies, langue, formes=None):
    """Nombre d'emplois de chaque vedette dans le corpus.

    On compte les graphies exactes : celle de la vedette et celles de ses formes
    fléchies, telles que le TEI les donne. « falloir » est ainsi crédité de
    « faut » et « fallait », qui sont ce que le corpus écrit vraiment.

    Deux précautions :

    * **le premier mot de chaque phrase est écarté**, sa majuscule ne vient que
      de la ponctuation. C'est ce qui sépare « ich » le pronom, omniprésent, de
      « Ich » le nom (le moi), rare — et « de » de « dé », « les » de « lès ».
      Compter sur la clé normalisée les confondrait et hisserait le mot rare au
      rang du mot-outil ;
    * une graphie non attestée vaut zéro, pas une valeur par défaut : la vedette
      passe alors dans le lot classé par le score WikDict, ce qui est honnête —
      nous n'avons aucun témoignage de son usage.

    Troisième précaution, et la plus utile : **une graphie que plusieurs vedettes
    se partagent ne compte pour aucune d'elles**. « einen » est à la fois
    l'accusatif de l'article « ein » et le verbe « unir » ; le lui créditer
    faisait de ce verbe rare le premier mot de la langue allemande. Ne restent
    alors que les graphies propres — « eint », « einte », « geeint » — qui le
    remettent à sa place. Une vedette dont *toutes* les graphies sont partagées
    retombe sur le total ambigu, faute de mieux, plutôt que de disparaître.

    Le français demande un tour de plus. Ses graphies fléchies, le TEI ne les
    donne pas : sans rien, « falloir » n'aurait pour tout témoignage que son
    infinitif, et se retrouverait au rang d'un mot rare alors que « faut »
    revient toutes les vingt phrases. On lui ajoute donc le compte des formes
    que `formes_fr` a reconstituées, relevé cette fois sur la clé normalisée —
    la casse ne distingue rien en français, contrairement à l'allemand où tous
    les noms portent la majuscule.
    """
    par_cle, par_graphie = compter(textes, langue)
    # Version 3.4 : l'apostrophe. Les vedettes l'écrivent typographique
    # (« aujourd’hui »), Tatoeba le plus souvent droite (« aujourd'hui ») :
    # comparées telles quelles, « aujourd’hui », « jusqu’à », « d’accord »
    # n'avaient aucun emploi attesté, et le premier finissait classé « rare »,
    # hors du noyau. On compare désormais apostrophes confondues.
    par_graphie = apostrophes_confondues(par_graphie)

    # Combien de vedettes revendiquent chaque graphie.
    proprietaires = Counter()
    for mot in entrees:
        for graphie in {droite(g) for g in {mot} | set(graphies.get(mot, ()))}:
            proprietaires[graphie] += 1

    # Écarter le premier mot de la phrase ne sert qu'à départager deux vedettes
    # que seule la casse distingue. Mais « Tja », « Danke », « Hallo »,
    # « Bonjour » sont presque toujours en tête de phrase, et passaient ainsi
    # pour rares. On rend donc à chaque graphie sa part des emplois en tête de
    # phrase, au prorata de ses emplois ailleurs : « hallo » l'interjection,
    # vingt fois plus employée que « das Hallo » au milieu d'une phrase, reçoit
    # vingt fois plus de ses « Hallo ! » initiaux (version 3.4).
    exact_par_cle = Counter()
    for graphie, nombre in par_graphie.items():
        exact_par_cle[commun.cle(graphie)] += nombre
    graphies_par_cle = defaultdict(set)
    for mot in entrees:
        for graphie in {droite(g) for g in {mot} | set(graphies.get(mot, ()))}:
            graphies_par_cle[commun.cle(graphie)].add(graphie)

    def emplois_de(graphie):
        k = commun.cle(graphie)
        initiaux = max(par_cle.get(k, 0) - exact_par_cle.get(k, 0), 0)
        rivales = graphies_par_cle[k]
        if len(rivales) <= 1:
            return par_graphie.get(graphie, 0) + initiaux
        poids = sum(par_graphie.get(g, 0) + 0.05 for g in rivales)
        part = (par_graphie.get(graphie, 0) + 0.05) / poids
        return par_graphie.get(graphie, 0) + initiaux * part

    frequences = Counter()
    for mot in entrees:
        propre = ambigu = 0
        for graphie in {droite(g) for g in {mot} | set(graphies.get(mot, ()))}:
            compte = emplois_de(graphie)
            ambigu += compte
            if proprietaires[graphie] == 1:
                propre += compte
        total = propre or ambigu
        if total:
            frequences[mot] = total

    if formes:
        # clé de lemme → les vedettes qui la portent
        par_cle_lemme = defaultdict(list)
        for mot in entrees:
            par_cle_lemme[commun.cle(mot)].append(mot)
        cles_vedettes = set(par_cle_lemme)
        for cle_forme, cles_lemmes in formes.items():
            compte = par_cle.get(cle_forme, 0)
            if not compte:
                continue
            # Une forme qui est aussi la clé d'une vedette est un témoignage
            # ambigu : « est » atteste « être » autant que « est », le point
            # cardinal. On ne s'en sert pas pour classer — mais elle reste dans
            # l'index de recherche, où montrer les deux est exactement ce qu'il
            # faut faire.
            if cle_forme in cles_vedettes:
                continue
            cibles = [m for cle in cles_lemmes for m in par_cle_lemme.get(cle, ())]
            if not cibles:
                continue
            part = compte / len(cibles)
            for mot in cibles:
                frequences[mot] += part

    return frequences


_COMPTES = {}


def compter(textes, langue):
    """`corpus.compter_deux`, une seule fois par corpus.

    Le décompte de Tatoeba sert maintenant à cinq étapes (gloses croisées,
    formes des deux langues, les deux témoins du classement). Refait à chaque
    fois, il triplait la durée de la construction. On garde une référence au
    corpus avec son décompte : l'identifiant ne peut pas être réattribué tant
    que l'objet vit.
    """
    cle = (id(textes), langue)
    if cle not in _COMPTES:
        _COMPTES[cle] = (textes, corpus.compter_deux(textes, langue))
    return _COMPTES[cle][1]


def droite(graphie):
    """L'apostrophe typographique ramenée à l'apostrophe droite."""
    return graphie.replace("’", "'")


def apostrophes_confondues(compte):
    sortie = Counter()
    for graphie, nombre in compte.items():
        sortie[droite(graphie)] += nombre
    return sortie


# --- La fréquence d'usage réelle : wordfreq et Tatoeba (version 3.4) --------
#
# Jusqu'ici, le classement ne reposait que sur Tatoeba : un corpus de phrases
# écrites par des apprenants et des bénévoles, précieux pour ses traductions,
# mais petit — quelques millions de mots — et singulier : « Tom » y est le
# douzième mot de l'allemand. Un mot que ses phrases n'emploient pas passait
# pour rare, quel que soit son usage réel ; et un verbe rare pouvait se hisser
# en tête par un accident de ses formes (voir `tei.forme_de_recherche`).
#
# wordfreq (Robyn Speer, données sous CC BY-SA 4.0) agrège des sous-titres de
# films et de séries, des réseaux sociaux, la presse, Wikipédia et des livres :
# c'est le meilleur témoin libre de ce qui se dit et s'écrit aujourd'hui.
# Seul, il pencherait vers la presse — « Bundesregierung » avant « Hund ».
#
# On prend donc la **moyenne géométrique** des deux témoignages : un mot
# courant dans la langue *et* dans les phrases d'apprenants passe devant un mot
# que l'un des deux seulement connaît. C'est le langage courant, au sens le
# plus littéral : courant partout.

POIDS_WORDFREQ = 0.5
# wordfreq estime une suite de mots par le produit de ses mots, très
# généreusement : « parce que » y vaudrait « parce ». On la ramène à sa place.
MULTIMOTS = 0.05
# Une graphie absente de wordfreq vaut ce plancher (un emploi par milliard de
# mots), un mot absent de Tatoeba un demi-emploi : ni l'un ni l'autre ne doit
# annuler l'autre témoin.
PLANCHER_WORDFREQ = 1e-9
DEMI_EMPLOI = 0.5
POIDS_A_PRIORI = 0.2
MOTS_D_UNE_LETTRE = {"de": set(), "fr": {"à", "a", "y", "ô"}}


def frequences_wordfreq(entrees, graphies, langue, exact):
    """Fréquence wordfreq de chaque vedette : sa graphie, puis ses formes.

    wordfreq ignore la casse : « Essen » (le repas) et « essen » (manger),
    « Sie » et « sie » y ont une seule fréquence. On la partage selon Tatoeba,
    qui compte les graphies exactes hors début de phrase (`exact`). Une forme
    que plusieurs vedettes revendiquent ne compte que pour la plus courante
    d'entre elles : « die » est à « der » et à « die », pas à « Die » (le dé
    ancien).
    """
    from wordfreq import get_frequency_dict, word_frequency
    dico = get_frequency_dict(langue)

    def brute(graphie):
        k = droite(graphie).casefold()
        if " " in k:
            try:
                return word_frequency(k, langue) * MULTIMOTS
            except (ValueError, LookupError):
                return 0.0
        if k in dico:
            return dico[k]
        # wordfreq découpe « petit-déjeuner » et « d'accord » en deux mots, et
        # ne les a donc pas dans sa table : on lui demande son estimation de la
        # suite, sans la décote des locutions — c'est un seul mot.
        if "-" in k or "'" in k:
            try:
                return word_frequency(k, langue)
            except (ValueError, LookupError):
                return 0.0
        return 0.0

    par_minuscules = defaultdict(list)
    for mot in entrees:
        par_minuscules[mot.casefold()].append(mot)

    def part_de_casse(mot):
        """Une majuscule se compare toujours à sa minuscule, vedette ou non :
        « Des » (ré bémol) n'a pas de vedette « des » en face — c'est une forme
        de « der » —, et recevait toute la fréquence de l'article."""
        homographes = [m for m in par_minuscules[mot.casefold()] if m != mot]
        lui = exact.get(droite(mot), 0)
        autres = sum(exact.get(droite(m), 0) for m in homographes)
        concurrents = len(homographes)
        minuscule = mot.lower()
        if minuscule != mot and minuscule not in homographes:
            autres += exact.get(droite(minuscule), 0)
            concurrents += 1
        if not concurrents:
            return 1.0
        return (lui + 0.05) / (lui + autres + 0.05 * (1 + concurrents))

    propres = {}
    for mot in entrees:
        f = brute(mot) * part_de_casse(mot)
        if len(commun.cle(mot)) == 1 and mot not in MOTS_D_UNE_LETTRE[langue]:
            f *= 0.001
        propres[mot] = f

    proprietaires = defaultdict(list)
    for mot in entrees:
        for graphie in graphies.get(mot, ()):
            proprietaires[droite(graphie).casefold()].append(mot)

    resultat = Counter()
    for mot in entrees:
        total = propres[mot]
        vues = {droite(mot).casefold()}
        for graphie in graphies.get(mot, ()):
            g = droite(graphie).casefold()
            if g in vues:
                continue
            vues.add(g)
            # Une forme qui est aussi une vedette (« die », « sein ») ou que
            # plusieurs vedettes revendiquent revient à la plus courante.
            candidats = proprietaires[g] + par_minuscules.get(g, [])
            if len(candidats) > 1:
                meilleur = max(candidats, key=lambda m: propres.get(m, 0.0))
                if meilleur != mot:
                    continue
            total += brute(graphie)
        if total > 0:
            resultat[mot] = total
    return resultat


# Une forme engendrée par une règle n'entre à l'index que si l'usage l'atteste.
# 2,5 sur l'échelle de Zipf, c'est trois emplois par cent millions de mots :
# assez pour « produisent » ou « appellent », trop peu pour les fautes de
# frappe courantes (« appelent » est à 2,28).
ZIPF_FORME = 2.5


@functools.lru_cache(maxsize=None)
def zipf_par_cle(langue):
    """Clé de recherche → la meilleure fréquence wordfreq (échelle de Zipf)
    des graphies qui la partagent : « achete » vaut « achète »."""
    from wordfreq import get_frequency_dict
    table = {}
    for mot, frequence in get_frequency_dict(langue).items():
        if frequence <= 0:
            continue
        k = commun.cle(mot)
        z = math.log10(frequence) + 9
        if z > table.get(k, 0.0):
            table[k] = z
    return table


def attestation_wordfreq(langue, seuil=ZIPF_FORME):
    table = zipf_par_cle(langue)
    return lambda k: table.get(k, 0.0) >= seuil


def frequences_usage(entrees, graphies, langue, textes, formes=None):
    """La fréquence qui classe : moyenne géométrique de wordfreq et de Tatoeba.

    Rend `{vedette: score}`. Une vedette qu'aucun des deux témoins ne connaît
    n'y figure pas — `classer()` la range après les autres.
    """
    tatoeba = frequences_corpus(textes, entrees, graphies, langue, formes=formes)
    par_cle, par_graphie = compter(textes, langue)
    total_tatoeba = max(sum(par_cle.values()), 1)
    usage = frequences_wordfreq(entrees, graphies, langue,
                                apostrophes_confondues(par_graphie))
    # Tatoeba est petit : qu'un mot n'y figure pas prouve peu. Plutôt qu'un
    # zéro sec, on lui prête un a priori tiré de wordfreq, de poids égal à un
    # cinquième du corpus. Un mot que Tatoeba emploie souvent n'en est pas
    # changé (« Hund » : 858 emplois, 13 prêtés) ; un mot qu'il ignore et que
    # la langue emploie (« Workshop ») n'est plus jeté parmi les raretés.
    a_priori = total_tatoeba * POIDS_A_PRIORI
    scores = Counter()
    for mot in entrees:
        emplois = tatoeba.get(mot, 0)
        f = usage.get(mot, 0.0)
        if emplois < 1 and f <= 0:
            continue
        p_tatoeba = ((emplois + a_priori * f + DEMI_EMPLOI)
                     / (total_tatoeba + a_priori))
        p_usage = max(f, PLANCHER_WORDFREQ)
        scores[mot] = p_usage ** POIDS_WORDFREQ * p_tatoeba ** (1 - POIDS_WORDFREQ)
    return scores


def classer(entrees, frequences, importance):
    """Ordonne les entrées de la plus utile à la moins utile.

    La fréquence d'usage prime : c'est ce qu'un apprenant rencontrera. Les mots
    qu'aucun témoin ne connaît sont rangés après, départagés par le score
    WikDict — faute de mieux, et sans prétendre que ce soit une mesure d'usage.
    """
    def rang(entree):
        mot = entree["mot"]
        # « un·e », « ami·e » : les variantes en écriture inclusive du
        # Wiktionnaire. Elles ont pour formes fléchies « un » et « une », et
        # héritent donc de leur fréquence — ce qui plaçait « un·e » au
        # cinquième rang du français. Elles restent dans le dictionnaire, où
        # elles ont leur place, mais ne sont pas du vocabulaire de base.
        if "·" in mot:
            return (1, 0.0, mot)
        f = frequences.get(mot, 0)
        if f > 0:
            return (0, -f, mot)
        return (1, -importance.get(commun.cle(mot), 0.0), mot)

    return sorted(entrees, key=rang)


def reordonner_par_utilite(dictionnaires, positions):
    """Met en tête le sens et la traduction les plus utiles.

    Le Wiktionnaire n'ordonne pas ses sens par fréquence d'emploi. Le premier
    sens de « maison » y est l'adjectival — « fait maison », en allemand
    *hausgemacht* — de sorte qu'un exercice demandant « que veut dire maison ? »
    attendait *hausgemacht* pour bonne réponse. C'est faux du point de vue de
    qui apprend, et décourageant.

    On classe donc, à l'intérieur de chaque sens, les traductions par leur rang
    dans l'autre langue ; puis les sens entre eux, par le rang de leur meilleure
    traduction. Une traduction absente de l'autre dictionnaire passe en dernier,
    faute de pouvoir la situer.

    L'ordre du Wiktionnaire n'est pas perdu pour autant : il départage les
    ex æquo, si bien qu'un mot dont tous les sens sont également courants garde
    l'ordre d'origine.
    """
    INFINI = 10 ** 9
    rangs = {}
    for langue in ("de", "fr"):
        par_cle = {}
        for mot, place in positions[langue].items():
            k = commun.cle(mot)
            if place < par_cle.get(k, INFINI):
                par_cle[k] = place
        rangs[langue] = par_cle

    def rang_de(traduction, table):
        return table.get(commun.cle(traduction), INFINI)

    def rang_du_sens(sens, table):
        return min((rang_de(t, table) for t in sens[1]), default=INFINI)

    deplaces = 0
    for langue in ("de", "fr"):
        autre = rangs["fr" if langue == "de" else "de"]
        for entree in dictionnaires[langue].values():
            # Ce qu'une main a ordonné reste dans cet ordre : le supplément
            # éditorial met en tête le sens et l'équivalent qu'il juge
            # premiers, et c'est le premier qui sert de réponse attendue.
            if entree.get("expression") == expressions.SOURCE_EDITORIALE:
                continue
            avant = premiere_traduction(entree)
            for lecture in entree["lectures"]:
                for definition_et_trads in lecture[4]:
                    definition_et_trads[1].sort(key=lambda t: rang_de(t, autre))
                lecture[4].sort(key=lambda s: rang_du_sens(s, autre))
            # Les lectures aussi : « Wetter » est masculin quand c'est un
            # parieur, neutre quand c'est le temps qu'il fait — et « der Tor »
            # est un sot quand « das Tor » est une porte. Laisser l'ordre du
            # Wiktionnaire mettait le parieur et le sot en tête de fiche.
            entree["lectures"].sort(
                key=lambda l: min((rang_du_sens(s, autre) for s in l[4]), default=INFINI))
            if premiere_traduction(entree) != avant:
                deplaces += 1
    return deplaces


def premiere_traduction(entree):
    for lecture in entree["lectures"]:
        for bloc in lecture[4]:
            if bloc[1]:
                return bloc[1][0]
    return ""


def bande(position):
    for numero, borne in enumerate(BANDES):
        if position < borne:
            return numero
    return len(BANDES)


# --- Écriture des paquets ----------------------------------------------------

def apercu(entree):
    """Les premières traductions, pour la liste de résultats."""
    vues = []
    for lecture in entree["lectures"]:
        for bloc in lecture[4]:
            for traduction in bloc[1]:
                if traduction not in vues:
                    vues.append(traduction)
                if len(vues) >= 3:
                    break
            if len(vues) >= 3:
                break
        if len(vues) >= 3:
            break
    texte = ", ".join(vues)
    return texte if len(texte) <= 60 else texte[:59] + "…"


def ecrire_formes(chemin, formes):
    """Index forme fléchie → lemme, en codage suffixe.

    Une ligne : `forme <tab> n,reste`, le lemme se relit `forme[:n] + reste`.
    Sur l'allemand, cela ramène 4,7 Mo à 3,4 Mo — les formes ressemblent
    presque toujours à leur lemme, autant ne pas répéter le début.
    Plusieurs lemmes possibles sont séparés par une barre verticale.
    """
    lignes = []
    for forme in sorted(formes):
        codes = []
        # Au plus trois lemmes par forme, et l'on garde les plus simples : un
        # mot seul avant une locution, un mot court avant un long. Trier par
        # ordre alphabétique faisait renvoyer « leurs » à « la leur », « le
        # leur » et « les leurs » — en laissant « leur » de côté.
        candidats = sorted(formes[forme], key=lambda l: (l.count(" "), len(l), l))
        for lemme in candidats[:3]:
            partage = 0
            while (partage < len(forme) and partage < len(lemme)
                   and forme[partage] == lemme[partage]):
                partage += 1
            if partage < 3:
                partage = 0
            codes.append(f"{partage},{lemme[partage:]}")
        lignes.append(forme + "\t" + "|".join(codes))
    texte = "\n".join(lignes) + "\n"
    ecrire(chemin, texte)
    return texte


def formes_restreintes(formes, selection):
    """Les renvois utiles à une sélection de vedettes, et rien de plus.

    Le noyau embarque son propre index des formes fléchies : sans lui, taper
    « ging » ne mènerait à « gehen » qu'après avoir téléchargé les 29 Mo du
    dictionnaire complet, et la fiche ne saurait pas souligner « Hause » dans sa
    phrase d'exemple. Restreint aux 9 000 mots du noyau, il ne coûte que
    quelques centaines de kilo-octets.
    """
    cibles = {commun.cle(e["mot"]) for e in selection}
    sortie = {}
    for cle_forme, cles_lemmes in formes.items():
        gardees = cles_lemmes & cibles if isinstance(cles_lemmes, set) \
            else {c for c in cles_lemmes if c in cibles}
        if gardees:
            sortie[cle_forme] = gardees
    return sortie


def ecrire_vivier(dossier, vivier):
    """Le vivier de phrases, en tranches numérotées.

    Les phrases sont partagées : une même paire illustre un mot allemand et un
    mot français. Elles vivent donc à part, et les entrées ne portent que leurs
    numéros — sinon la même phrase serait recopiée jusqu'à quatorze fois.
    """
    fichiers, octets = [], 0
    for depart in range(0, len(vivier), ENTREES_PAR_TRANCHE):
        indice = depart // ENTREES_PAR_TRANCHE
        texte = json.dumps({"p": vivier[depart:depart + ENTREES_PAR_TRANCHE]},
                           ensure_ascii=False, separators=(",", ":"))
        ecrire(dossier / f"phrases-{indice:03d}.json", texte)
        octets += len(texte.encode("utf-8"))
        fichiers.append(f"phrases-{indice:03d}.json")
    return fichiers, octets


SANS_PHRASES = {"sens": {}, "libres": []}


def entree_ecrite(entree, rang_de_bande, attribution, voisins, citations_max):
    """Une entrée dans sa forme définitive, phrases de Tatoeba réparties.

    Le rang du sens dans la liste aplatie fait le lien entre ce qu'a décidé
    `phrases.attribuer_aux_sens` et ce qu'on écrit ici. Les deux parcourent les
    lectures puis les sens dans le même ordre, et c'est la seule chose qui les
    accorde : changer l'ordre d'un côté rattacherait silencieusement les
    phrases aux mauvaises significations.
    """
    par_sens = attribution["sens"]
    lectures = []
    rang = 0
    for lecture in entree["lectures"]:
        sens = []
        for bloc in lecture[4]:
            citations = bloc[2][:citations_max] if len(bloc) > 2 else []
            sens.append([bloc[0], bloc[1], citations, par_sens.get(rang, [])])
            rang += 1
        lectures.append([lecture[0], lecture[1], lecture[2], lecture[3], sens,
                         lecture[5] if len(lecture) > 5 else [],
                         lecture[6] if len(lecture) > 6 else []])

    ecrite = [entree["mot"], rang_de_bande, lectures, attribution["libres"], voisins]
    # Une expression usuelle porte sa provenance en sixième position, et une
    # explication en septième quand l'édition d'en face en donne une. Les
    # autres entrées s'arrêtent à cinq : le lecteur tolère l'absence, et cinq
    # mille lignes de plus pèseraient pour rien.
    if entree.get("expression"):
        ecrite.append(entree["expression"])
        if entree.get("explication"):
            ecrite.append(entree["explication"])
    return ecrite


def ecrire_paquet(dossier, langue, selection, positions, phrases, voisins,
                  citations_max, formes=None):
    """Index + tranches d'une langue, dans un dossier de paquet."""
    dossier.mkdir(parents=True, exist_ok=True)
    triees = sorted(selection, key=lambda e: (commun.cle(e["mot"]), e["mot"]))

    lignes, octets = [], 0
    for depart in range(0, len(triees), ENTREES_PAR_TRANCHE):
        tranche = triees[depart:depart + ENTREES_PAR_TRANCHE]
        indice = depart // ENTREES_PAR_TRANCHE
        contenu = {
            "l": langue,
            "e": [entree_ecrite(e, bande(positions[e["mot"]]),
                                phrases.get(e["mot"], SANS_PHRASES),
                                voisins.get(e["mot"], []), citations_max)
                  for e in tranche],
        }
        texte = json.dumps(contenu, ensure_ascii=False, separators=(",", ":"))
        ecrire(dossier / f"{langue}-{indice:03d}.json", texte)
        octets += len(texte.encode("utf-8"))
        for entree in tranche:
            lignes.append("\t".join((
                commun.cle(entree["mot"]), entree["mot"], str(indice),
                str(bande(positions[entree["mot"]])), apercu(entree))))

    texte_index = "\n".join(lignes) + "\n"
    ecrire(dossier / f"{langue}.idx", texte_index)
    octets += len(texte_index.encode("utf-8"))

    nb_tranches = (len(triees) + ENTREES_PAR_TRANCHE - 1) // ENTREES_PAR_TRANCHE
    fichiers = [f"{langue}.idx"] + [f"{langue}-{i:03d}.json" for i in range(nb_tranches)]

    if formes is not None:
        texte_formes = ecrire_formes(dossier / f"formes-{langue}.idx", formes)
        octets += len(texte_formes.encode("utf-8"))
        fichiers.append(f"formes-{langue}.idx")

    return fichiers, octets, len(triees)


# --- Enchaînement ------------------------------------------------------------

def main():
    analyseur = argparse.ArgumentParser(description="Construction des paquets Wortschatz")
    analyseur.add_argument("--sans-budget", action="store_true",
                           help="construire même si les budgets de taille sont dépassés")
    options = analyseur.parse_args()

    debut = time.time()
    if not (SOURCES / "deu-fra.tei").exists():
        raise SystemExit("Sources absentes. Lance d'abord : python build/telecharger.py")

    print("Lecture des dictionnaires TEI")
    dictionnaires, index_formes, index_graphies, moutures = {}, {}, {}, {}
    for langue, fichier in (("de", "deu-fra.tei"), ("fr", "fra-deu.tei")):
        mouture, _extent = tei.entete(SOURCES / fichier)
        moutures[langue] = mouture
        entrees, formes, graphies = charger_dictionnaire(SOURCES / fichier)
        dictionnaires[langue] = entrees
        index_formes[langue] = formes
        index_graphies[langue] = graphies
        print(f"  {langue} : {len(entrees)} vedettes, {len(formes)} formes fléchies "
              f"({fichier}, mouture {mouture})")

    print("\nBase SQLite de WikDict — les vedettes que le TEI n'a pas encore")
    for langue in ("de", "fr"):
        journal_base = {}
        verser_base_sqlite(dictionnaires[langue], langue, journal_base)
        base = journal_base.get("base", {})
        print(f"  {langue} : + {journal_base['ajoutees']} vedettes "
              f"({base.get('entrees', 0)} entrées sûres sur {base.get('lignes', 0)} "
              f"lignes ; {base.get('douteuses', 0)} lignes douteuses écartées)")
        if journal_base["exemples"]:
            print("       exemples : " + ", ".join(
                f"{mot} → {'/'.join(trads)}" for mot, trads in journal_base["exemples"][:6]))

    # Les formes des mots-outils allemands, que le TEI ne donne pas.
    ajoutees = 0
    for forme, lemme in grammaire.formes_allemandes():
        if lemme not in dictionnaires["de"]:
            continue
        k = commun.cle(forme)
        if k != commun.cle(lemme):
            index_formes["de"].setdefault(k, set()).add(commun.cle(lemme))
            index_graphies["de"].setdefault(lemme, set()).add(forme)
            ajoutees += 1
    print(f"  de : + {ajoutees} formes de mots-outils (das, eine, ihm, im, zur…)")

    journal_grammaire = {}
    grammaire.ajouter(dictionnaires, journal_grammaire)
    if journal_grammaire["ajoutees"]:
        print(f"  + {len(journal_grammaire['ajoutees'])} entrées grammaticales "
              f"écrites pour l'application : {', '.join(journal_grammaire['ajoutees'])}")

    print("\nGreffe du Wiktionnaire — définitions, exemples, flexions, traductions")
    gain = {}
    extraits = {}
    for langue in ("de", "fr"):
        par_mot = wiktionnaire.charger(langue)
        extraits[langue] = par_mot
        avant = len(dictionnaires[langue])
        journal_complements = {}
        completer_par_le_wiktionnaire(dictionnaires[langue], par_mot, index_formes[langue],
                                      index_graphies[langue], journal_complements)
        print(f"  {langue} : {journal_complements['formes']} formes fléchies greffées, "
              f"{journal_complements['genres']} genres et "
              f"{journal_complements['prononciations']} prononciations pour les "
              f"vedettes de la base SQLite")
        journal_wikt = {}
        for mot, entree in dictionnaires[langue].items():
            alignement.enrichir(entree, par_mot.get(mot, []), journal_wikt)
            elaguer_citations(entree)
        part = 100 * journal_wikt["avec_exemple"] / max(journal_wikt["sens"], 1)
        print(f"  {langue} : {journal_wikt['apparies']} sens sur "
              f"{journal_wikt['sens']} appariés, {journal_wikt['avec_exemple']} "
              f"avec citation ({part:.1f} %)")
        print(f"       {journal_wikt['sens_ajoutes']} sens ajoutés, "
              f"{journal_wikt['sans_entree']} lectures sans entrée Wiktionnaire")
        print(f"       {journal_wikt['traduits']} sens traduits par le "
              f"Wiktionnaire là où WikDict ne connaissait rien, "
              f"{journal_wikt['sens_ajoutes_traduits']} sens ajoutés traduits")
        print(f"       reste {journal_wikt['sens_sans_traduction']} sens sans "
              f"traduction — définition et exemple seulement")

        # Les vedettes que WikDict n'a pas et que le Wiktionnaire traduit.
        journal_neuves = {}
        traductions.ajouter(dictionnaires, index_formes[langue],
                            index_graphies[langue], langue, par_mot, journal_neuves)
        print(f"       + {journal_neuves['ajoutees']} vedettes neuves traduites "
              f"({journal_neuves['examinees']} examinées, "
              f"{journal_neuves['sans_traduction']} écartées faute de traduction)")
        if journal_neuves["exemples"]:
            apercus = ", ".join(
                f"{mot} → {'/'.join(trads)}"
                for mot, _nature, trads in journal_neuves["exemples"][:5])
            print(f"       exemples : {apercus}")
        gain[langue] = {
            "wikdict": avant,
            "neuves": journal_neuves["ajoutees"],
            "sens_traduits": journal_wikt["traduits"]
                             + journal_wikt["sens_ajoutes_traduits"],
            "sens_sans_traduction": journal_wikt["sens_sans_traduction"],
        }

    print("\nLecture du corpus Tatoeba")
    paires_alignees, allemandes, francaises = corpus.paires()
    textes = {"de": allemandes.values(), "fr": francaises.values()}
    print(f"  {len(allemandes)} phrases allemandes, {len(francaises)} françaises")

    print("\nGloses croisées — les mots courants que seule l'autre édition traduit")
    emplois = {langue: compter(textes[langue], langue)[0]
               for langue in ("de", "fr")}

    def frequence(langue, mot):
        k = commun.cle(mot)
        return zipf_par_cle(langue).get(k, 0.0), emplois[langue].get(k, 0)

    gloses = {"de": wiktionnaire.charger_gloses_croisees("fr"),
              "fr": wiktionnaire.charger_gloses_croisees("de")}
    journal_croisees = {}
    creees = croisees.creer(dictionnaires, gloses, extraits, frequence,
                            index_formes, journal_croisees)
    for langue in ("de", "fr"):
        completer_par_le_wiktionnaire(
            {mot: dictionnaires[langue][mot] for mot in creees[langue]},
            extraits[langue], index_formes[langue], index_graphies[langue], {})
        for mot in creees[langue]:
            elaguer_citations(dictionnaires[langue][mot])
    print(f"  + {len(creees['de'])} vedettes allemandes et {len(creees['fr'])} "
          f"françaises ; écartées : {journal_croisees['ecartees_rares']} trop rares, "
          f"{journal_croisees['ecartees_formes']} formes fléchies, "
          f"{journal_croisees['sans_entree']} sans entrée dans leur langue, "
          f"{journal_croisees['ecartees_propres']} noms propres")
    for langue, mot, eq in journal_croisees["exemples"][:12]:
        print(f"       {langue} {mot} → {' / '.join(eq)}")
    print("\nSupplément éditorial — les mots courants qu'aucune source ne traduit")
    journal_editorial = {}
    editoriaux = mots_editoriaux.appliquer(dictionnaires, extraits, index_formes,
                                           index_graphies, mots_editoriaux.charger(),
                                           journal_editorial)
    for langue in ("de", "fr"):
        completer_par_le_wiktionnaire(
            {mot: dictionnaires[langue][mot] for mot in editoriaux[langue]},
            extraits[langue], index_formes[langue], index_graphies[langue], {})
        for mot in editoriaux[langue]:
            elaguer_citations(dictionnaires[langue][mot])
    for forme, lemme in grammaire.formes_allemandes():
        if lemme in editoriaux["de"]:
            index_formes["de"].setdefault(commun.cle(forme), set()).add(commun.cle(lemme))
            index_graphies["de"].setdefault(lemme, set()).add(forme)
    print(f"  + {len(editoriaux['de'])} vedettes allemandes et {len(editoriaux['fr'])} "
          f"françaises, {journal_editorial['variantes']} variantes de graphie")
    if journal_editorial["cedes"]:
        print("  cédés aux sources (déjà là) : " + ", ".join(
            f"{l}:{m}" for l, m in journal_editorial["cedes"]))
    if journal_editorial["orphelines"]:
        print("  ! variantes sans vedette : " + ", ".join(
            f"{l}:{f}→{c}" for l, f, c in journal_editorial["orphelines"]))

    croisees.renvois(gloses, dictionnaires, index_formes, index_graphies, journal_croisees)
    print(f"  + {journal_croisees['renvois']} variantes de graphie rattachées à leur "
          f"vedette (tschüss → tschüs)")
    ecrire(RACINE / "croisees-creees.tsv", "".join(
        f"{langue}\t{mot}\t" + " / ".join(
            t for l in dictionnaires[langue][mot]["lectures"] for b in l[4][:1]
            for t in b[1][:3]) + "\n"
        for langue in ("de", "fr") for mot in sorted(creees[langue])))

    print("\nExpressions usuelles")
    journal_expr = {}
    expressions.marquer(dictionnaires, journal_expr)
    print(f"  {journal_expr['dictionnaire_de']} allemandes et "
          f"{journal_expr['dictionnaire_fr']} françaises reconnues dans le dictionnaire")
    # Ce que chaque édition du Wiktionnaire dit des expressions de l'autre
    # langue : l'édition française décrit « keine Ahnung », l'allemande
    # décrit « à petit feu ».
    croises = {"de": wiktionnaire.charger_croises("fr"),
               "fr": wiktionnaire.charger_croises("de")}
    attestations_en = expressions.charger_attestations_en(SOURCES)
    expressions.ajouter_formules(dictionnaires, extraits, croises, attestations_en,
                                 paires_alignees, journal_expr)
    # Le supplément éditorial passe en dernier, par-dessus tout : ce qu'une
    # main a relu l'emporte sur ce qu'une table a aligné. Ses exemples rédigés
    # entrent au corpus, en tête des candidates de leur expression.
    supplement = expressions.charger_supplement()
    editoriaux = {"de": {}, "fr": {}}
    for langue, mot, de, fr in expressions.appliquer_supplement(
            dictionnaires, supplement, journal_expr):
        paires_alignees.append((de, fr))
        editoriaux[langue].setdefault(mot, []).append((1000, len(paires_alignees) - 1))
    print(f"  {journal_expr['editoriales_creees']} créées et "
          f"{journal_expr['editoriales_corrigees']} corrigées par le supplément éditorial "
          f"({len(supplement)} entrées relues)")
    # Où le corpus emploie chaque expression retenue : ces paires deviendront
    # leurs exemples, par le même chemin que celles des mots.
    reperees = expressions.reperer_dans_le_corpus(
        {langue: [commun.cle(e["mot"]) for e in dictionnaires[langue].values()
                  if e.get("expression")] for langue in ("de", "fr")},
        paires_alignees)
    supplements = {}
    for langue in ("de", "fr"):
        par_cle = {}
        for e in dictionnaires[langue].values():
            if e.get("expression"):
                par_cle.setdefault(commun.cle(e["mot"]), []).append(e["mot"])
        supplements[langue] = {}
        for k, lot in reperees[langue].items():
            for mot in par_cle.get(k, ()):
                supplements[langue][mot] = lot[:expressions.EXEMPLES_PAR_EXPRESSION * 2]
        for mot, lot in editoriaux[langue].items():
            supplements[langue][mot] = lot + supplements[langue].get(mot, [])
    illustrees = {l: sum(1 for k in reperees[l] if reperees[l][k]) for l in ("de", "fr")}
    print(f"  {illustrees['de']} expressions allemandes et {illustrees['fr']} françaises "
          f"trouvées telles quelles dans le corpus")
    for entree in list(dictionnaires["de"].values()) + list(dictionnaires["fr"].values()):
        if entree.get("neuve") and entree.get("expression"):
            elaguer_citations(entree)
    print(f"  + {journal_expr['ajoutees_de']} allemandes et "
          f"{journal_expr['ajoutees_fr']} françaises attestées par un Wiktionnaire, "
          f"dont {journal_expr['tatoeba']} traduites par Tatoeba, "
          f"{journal_expr['croisee']} glosées par l'édition d'en face, "
          f"{journal_expr['sans_equivalent']} sans équivalent connu")
    for langue, mot, trads, source in journal_expr["exemples"][:10]:
        print(f"       {langue} {mot} → {' / '.join(trads)}  [{source}]")

    print("\nFormes fléchies du français")
    journal = {}
    par_cle_fr, _ = compter(textes["fr"], "fr")
    reconstituees = formes_fr.construire(dictionnaires["fr"], par_cle_fr, journal,
                                         atteste=attestation_wordfreq("fr"))
    for cle_forme, cles_lemmes in reconstituees.items():
        index_formes["fr"].setdefault(cle_forme, set()).update(cles_lemmes)
    print(f"  {journal['base']} de la base WikDict, {journal['irreguliers']} verbes "
          f"irréguliers, {journal['regles']} par règle "
          f"({journal['ecartees']} écartées faute d'attestation)")
    print(f"  index français : {len(index_formes['fr'])} formes au total")

    print("\nFormes déclinées de l'allemand (participes et adjectifs)")
    par_cle_de, _ = compter(textes["de"], "de")
    attestes_de = {k for k, z in zipf_par_cle("de").items() if z >= ZIPF_FORME}
    attestes_de |= set(par_cle_de)
    journal_de = {}
    for cle_forme, cles_lemmes in formes_de.construire(
            dictionnaires["de"], index_formes["de"], sorted(attestes_de),
            journal_de).items():
        index_formes["de"].setdefault(cle_forme, set()).update(cles_lemmes)
    print(f"  + {journal_de['formes']} formes attestées ({journal_de['participes']} "
          f"de participes, {journal_de['adjectifs']} d'adjectifs, "
          f"{journal_de['infinitifs_zu']} infinitifs en « zu »)")
    print(f"  index allemand : {len(index_formes['de'])} formes au total")

    print("\nMots qui ne vivent que dans une locution")
    for langue in ("de", "fr"):
        lies = mots_lies_aux_locutions(dictionnaires[langue], index_formes[langue], langue)
        for k, locutions in lies.items():
            index_formes[langue].setdefault(k, set()).update(locutions)
        exemples = ", ".join(f"{k} → {sorted(v)[0]}" for k, v in list(lies.items())[:6])
        print(f"  {langue} : {len(lies)} mots rattachés ({exemples}…)")

    print("\nClassement du vocabulaire")
    ordres, positions = {}, {}
    for langue, base in (("de", "de-fr.sqlite3"), ("fr", "fr-de.sqlite3")):
        importance = charger_importance(base)
        frequences = frequences_usage(
            dictionnaires[langue], index_graphies[langue], langue, textes[langue],
            formes=index_formes[langue] if langue == "fr" else None)
        ordre = classer(dictionnaires[langue].values(), frequences, importance)
        ordres[langue] = ordre
        positions[langue] = {e["mot"]: i for i, e in enumerate(ordre)}
        attestes = sum(1 for e in ordre if frequences.get(e["mot"], 0) > 0)
        print(f"  {langue} : {attestes} mots d'usage attesté (wordfreq ou Tatoeba), "
              f"{len(ordre) - attestes} classés par le score WikDict")
        print(f"       tête de liste : {', '.join(e['mot'] for e in ordre[:14])}")

    deplaces = reordonner_par_utilite(dictionnaires, positions)
    print(f"  {deplaces} entrées dont le sens de tête a changé après reclassement")

    print("\nFamilles de mots")
    journal_familles = {}
    voisinages = familles.construire(dictionnaires, positions, journal_familles)
    print(f"  {journal_familles['composition']} liens par composition, "
          f"{journal_familles['derivation']} par dérivation "
          f"({journal_familles['ecartes']} écartés faute de sens commun)")
    print(f"  {journal_familles['mots_de']} mots allemands et "
          f"{journal_familles['mots_fr']} mots français ont un voisinage")

    print("\nChoix des phrases d'exemple")
    journal_phrases = {}
    vivier_complet, attributions_completes = phrases.choisir(
        paires_alignees, dictionnaires, index_formes, ordres, journal_phrases,
        supplements=supplements)
    print(f"  {journal_phrases['paires']} paires examinées, "
          f"{journal_phrases['vivier']} retenues")
    print(f"  {journal_phrases['mots_de']} mots allemands et "
          f"{journal_phrases['mots_fr']} mots français illustrés")

    journal_repartition = {}
    attributions_completes = phrases.attribuer_aux_sens(
        vivier_complet, attributions_completes, dictionnaires, index_formes,
        journal_repartition)
    rangees = journal_repartition["rangees"]
    total_phrases = max(journal_repartition["phrases"], 1)
    print(f"  {rangees} rattachées à une signification précise "
          f"({100 * rangees / total_phrases:.0f} %), "
          f"{journal_repartition['libres']} gardées au niveau du mot")

    # On ne retire que ce que la construction produit : `data/` porte aussi
    # `conversation.json`, le contenu rédigé des phrases et dialogues, qui ne
    # vient d'aucune source et ne se reconstruit pas. Tout effacer le faisait
    # disparaître à chaque construction.
    for produit in ("noyau", "complet"):
        if (DATA / produit).exists():
            shutil.rmtree(DATA / produit)
    DATA.mkdir(parents=True, exist_ok=True)

    manifeste = {
        # La version du **format** des données, qui nomme le cache du paquet
        # complet (`wortschatz-donnees-<version>`). Elle change quand des
        # fichiers gardent leur nom mais plus leur contenu : un téléchargement
        # ne redemande pas ce qui est déjà là, et un index neuf sur des
        # tranches périmées donnerait un dictionnaire troué. 3 : les
        # expressions usuelles (sixième et septième champ, index par mot).
        "version": 3,
        "construit": time.strftime("%Y-%m-%d"),
        "moutures": moutures,
        "moutures_wiktionnaire": wiktionnaire.moutures(),
        "bandes": NOMS_BANDES,
        "gain": gain,
        "paquets": {},
    }

    print("\nÉcriture des paquets")
    for nom, borne, budget, citations_max in (
        ("noyau", TAILLE_NOYAU, BUDGET_NOYAU, CITATIONS_NOYAU),
        ("complet", None, BUDGET_COMPLET, CITATIONS_PAR_SENS),
    ):
        dossier = DATA / nom
        selections = {}
        for langue in ("de", "fr"):
            if borne is None:
                selections[langue] = ordres[langue]
                continue
            # Le noyau : les mots les plus courants, puis les expressions
            # faites de ces mots — voir `expressions.va_au_noyau`.
            #
            # Une expression sans équivalent n'y entre jamais, même courante :
            # elle ne se révise pas, et le noyau est installé d'office. Depuis
            # que wordfreq atteste les locutions (version 3.4), elles
            # remontaient d'elles-mêmes parmi les douze mille premiers mots.
            admis = [e for e in ordres[langue]
                     if not (e.get("expression") and not expressions.est_traduite(e))]
            base = admis[:borne]
            cles_du_noyau = {commun.cle(e["mot"]) for e in base}
            en_plus = [e for e in admis[borne:]
                       if expressions.va_au_noyau(e, cles_du_noyau)]
            selections[langue] = base + en_plus
        vivier, attributions = phrases.sous_ensemble(
            vivier_complet, attributions_completes,
            [e["mot"] for e in selections["de"]],
            [e["mot"] for e in selections["fr"]])

        fichiers, octets, comptes, traduites = [], 0, {}, {}
        for langue in ("de", "fr"):
            # Une entrée « traduite » porte au moins une traduction attestée :
            # c'est la seule sorte qui réponde à la question qu'on lui pose.
            # Compter les autres gonflerait le chiffre sans servir personne.
            traduites[langue] = sum(
                1 for e in selections[langue]
                if any(bloc[1] for lecture in e["lectures"] for bloc in lecture[4]))
            formes = (index_formes[langue] if borne is None
                      else formes_restreintes(index_formes[langue], selections[langue]))
            # Un voisin absent du paquet ne mènerait nulle part : le noyau ne
            # renvoie qu'à ses propres mots.
            presents = {e["mot"] for e in selections[langue]}
            voisins = {
                mot: [v for v in liste_voisins if v in presents]
                for mot, liste_voisins in voisinages.get(langue, {}).items()
                if mot in presents
            }
            liste, poids, nombre = ecrire_paquet(
                dossier, langue, selections[langue], positions[langue],
                attributions[langue], voisins, citations_max, formes=formes,
            )
            fichiers += [f"{nom}/{x}" for x in liste]
            octets += poids
            comptes[langue] = nombre

        liste, poids = ecrire_vivier(dossier, vivier)
        fichiers += [f"{nom}/{x}" for x in liste]
        octets += poids

        # L'index des mots des expressions : « feu » → « à petit feu ».
        index_expr = expressions.index_des_mots(selections, positions)
        nb_expressions, sans_equivalent = {}, {}
        for langue in ("de", "fr"):
            nb_mots, poids = expressions.ecrire_index(
                dossier / f"expressions-{langue}.idx", index_expr[langue], ecrire)
            fichiers.append(f"{nom}/expressions-{langue}.idx")
            octets += poids
            nb_expressions[langue] = sum(1 for e in selections[langue] if e.get("expression"))
            sans_equivalent[langue] = sum(
                1 for e in selections[langue]
                if e.get("expression") and not expressions.est_traduite(e))
            print(f"  {nom:8} expressions-{langue}.idx : {nb_mots} mots, "
                  f"{nb_expressions[langue]} expressions dont "
                  f"{nb_expressions[langue] - sans_equivalent[langue]} traduites")

        manifeste["paquets"][nom] = {
            "entrees": comptes,
            "traduites": traduites,
            "expressions": nb_expressions,
            "expressions_traduites": {l: nb_expressions[l] - sans_equivalent[l]
                                      for l in ("de", "fr")},
            "expressions_sans_equivalent": sans_equivalent,
            "phrases": len(vivier),
            "octets": octets,
            "fichiers": fichiers,
        }
        etat = "ok" if octets <= budget else "DÉPASSEMENT"
        print(f"  {nom:8} {comptes['de']:6d} de + {comptes['fr']:6d} fr  "
              f"({traduites['de'] + traduites['fr']} traduites)  "
              f"{commun.humain(octets):>9}  (budget {commun.humain(budget)}) {etat}")
        if octets > budget and not options.sans_budget:
            raise SystemExit(
                f"\nLe paquet « {nom} » dépasse son budget de "
                f"{commun.humain(octets - budget)}. Rogne SENS_MAX, DEFINITION_MAX "
                f"ou TAILLE_NOYAU dans construire.py, ou passe --sans-budget.")

    # L'empreinte du contenu, qui entre dans le nom du cache de la mouture
    # (`Paquets.nomDuCache`, `sw.js`). La date seule ne suffit pas : deux
    # constructions publiées le même jour partageaient un cache, et qui avait
    # téléchargé le premier paquet ne recevait jamais le second (version 3.4.1).
    empreinte = hashlib.sha256()
    for nom in sorted(f for paquet in manifeste["paquets"].values()
                      for f in paquet["fichiers"]):
        empreinte.update(nom.encode("utf-8"))
        empreinte.update((DATA / nom).read_bytes())
    manifeste["empreinte"] = empreinte.hexdigest()[:10]

    ecrire(DATA / "manifeste.json",
           json.dumps(manifeste, ensure_ascii=False, indent=2) + "\n")

    fichiers = [f for f in DATA.rglob("*") if f.is_file()]
    total = sum(f.stat().st_size for f in fichiers)
    print(f"\ndata/ : {commun.humain(total)} en {len(fichiers)} fichiers"
          f" — {time.time() - debut:.0f} s")


if __name__ == "__main__":
    main()
