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
import json
import shutil
import sqlite3
import time
from collections import Counter, defaultdict
from pathlib import Path

import alignement
import commun
import familles
import grammaire
import formes_fr
import phrases
import corpus
import tei
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
BUDGET_NOYAU = 22 * 1024 * 1024
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
    par_cle, par_graphie = corpus.compter_deux(textes, langue)

    # Combien de vedettes revendiquent chaque graphie.
    proprietaires = Counter()
    for mot in entrees:
        for graphie in {mot} | set(graphies.get(mot, ())):
            proprietaires[graphie] += 1

    frequences = Counter()
    for mot in entrees:
        propre = ambigu = 0
        for graphie in {mot} | set(graphies.get(mot, ())):
            compte = par_graphie.get(graphie, 0)
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


def classer(entrees, frequences, importance):
    """Ordonne les entrées de la plus utile à la moins utile.

    La fréquence d'usage prime : c'est ce qu'un apprenant rencontrera. Les mots
    que le corpus ignore sont rangés après, départagés par le score WikDict —
    faute de mieux, et sans prétendre que ce soit une mesure d'usage.
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
        if f >= 1:
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

    return [entree["mot"], rang_de_bande, lectures, attribution["libres"], voisins]


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

    journal_grammaire = {}
    grammaire.ajouter(dictionnaires, journal_grammaire)
    if journal_grammaire["ajoutees"]:
        print(f"  + {len(journal_grammaire['ajoutees'])} entrées grammaticales "
              f"écrites pour l'application : {', '.join(journal_grammaire['ajoutees'])}")

    print("\nGreffe du Wiktionnaire — définitions, exemples et flexions par sens")
    for langue in ("de", "fr"):
        par_mot = wiktionnaire.charger(langue)
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

    print("\nLecture du corpus Tatoeba")
    paires_alignees, allemandes, francaises = corpus.paires()
    textes = {"de": allemandes.values(), "fr": francaises.values()}
    print(f"  {len(allemandes)} phrases allemandes, {len(francaises)} françaises")

    print("\nFormes fléchies du français")
    journal = {}
    par_cle_fr, _ = corpus.compter_deux(francaises.values(), "fr")
    reconstituees = formes_fr.construire(dictionnaires["fr"], par_cle_fr, journal)
    for cle_forme, cles_lemmes in reconstituees.items():
        index_formes["fr"].setdefault(cle_forme, set()).update(cles_lemmes)
    print(f"  {journal['base']} de la base WikDict, {journal['irreguliers']} verbes "
          f"irréguliers, {journal['regles']} par règle "
          f"({journal['ecartees']} écartées faute d'attestation)")
    print(f"  index français : {len(index_formes['fr'])} formes au total")

    print("\nClassement du vocabulaire")
    ordres, positions = {}, {}
    for langue, base in (("de", "de-fr.sqlite3"), ("fr", "fr-de.sqlite3")):
        importance = charger_importance(base)
        frequences = frequences_corpus(
            textes[langue], dictionnaires[langue], index_graphies[langue], langue,
            formes=index_formes[langue] if langue == "fr" else None)
        ordre = classer(dictionnaires[langue].values(), frequences, importance)
        ordres[langue] = ordre
        positions[langue] = {e["mot"]: i for i, e in enumerate(ordre)}
        attestes = sum(1 for e in ordre if frequences.get(e["mot"], 0) >= 1)
        print(f"  {langue} : {attestes} mots attestés dans le corpus, "
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
        paires_alignees, dictionnaires, index_formes, ordres, journal_phrases)
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

    if DATA.exists():
        shutil.rmtree(DATA)
    DATA.mkdir(parents=True)

    manifeste = {
        "version": 2,
        "construit": time.strftime("%Y-%m-%d"),
        "moutures": moutures,
        "bandes": NOMS_BANDES,
        "paquets": {},
    }

    print("\nÉcriture des paquets")
    for nom, borne, budget, citations_max in (
        ("noyau", TAILLE_NOYAU, BUDGET_NOYAU, CITATIONS_NOYAU),
        ("complet", None, BUDGET_COMPLET, CITATIONS_PAR_SENS),
    ):
        dossier = DATA / nom
        selections = {langue: (ordres[langue][:borne] if borne else ordres[langue])
                      for langue in ("de", "fr")}
        vivier, attributions = phrases.sous_ensemble(
            vivier_complet, attributions_completes,
            [e["mot"] for e in selections["de"]],
            [e["mot"] for e in selections["fr"]])

        fichiers, octets, comptes = [], 0, {}
        for langue in ("de", "fr"):
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

        manifeste["paquets"][nom] = {
            "entrees": comptes,
            "phrases": len(vivier),
            "octets": octets,
            "fichiers": fichiers,
        }
        etat = "ok" if octets <= budget else "DÉPASSEMENT"
        print(f"  {nom:8} {comptes['de']:6d} de + {comptes['fr']:6d} fr  "
              f"{commun.humain(octets):>9}  (budget {commun.humain(budget)}) {etat}")
        if octets > budget and not options.sans_budget:
            raise SystemExit(
                f"\nLe paquet « {nom} » dépasse son budget de "
                f"{commun.humain(octets - budget)}. Rogne SENS_MAX, DEFINITION_MAX "
                f"ou TAILLE_NOYAU dans construire.py, ou passe --sans-budget.")

    ecrire(DATA / "manifeste.json",
           json.dumps(manifeste, ensure_ascii=False, indent=2) + "\n")

    fichiers = [f for f in DATA.rglob("*") if f.is_file()]
    total = sum(f.stat().st_size for f in fichiers)
    print(f"\ndata/ : {commun.humain(total)} en {len(fichiers)} fichiers"
          f" — {time.time() - debut:.0f} s")


if __name__ == "__main__":
    main()
