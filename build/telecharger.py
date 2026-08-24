#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Récupération des sources de Wortschatz.

Rien de ce qui est téléchargé ici n'est publié tel quel : ce sont les matières
premières, `construire.py` en tire les paquets de l'application. Le dossier
`build/sources/` pèse environ 1,6 Go et n'a pas sa place dans le dépôt (voir
.gitignore).

Provenance et licences : voir SOURCES.md, à côté de ce fichier.

Usage :
    python build/telecharger.py            # ne retélécharge pas ce qui est là
    python build/telecharger.py --forcer   # tout reprendre à zéro
"""

import argparse
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

# La console Windows est en cp1252 : sans cela, la première flèche de la barre
# de progression fait tomber le script avec un UnicodeEncodeError.
for flux in (sys.stdout, sys.stderr):
    try:
        flux.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

RACINE = Path(__file__).resolve().parent
SOURCES = RACINE / "sources"

WIKDICT_TEI = "https://download.wikdict.com/dictionaries/tei/recommended/"
WIKDICT_SQLITE = "https://download.wikdict.com/dictionaries/sqlite/"
TATOEBA = "https://downloads.tatoeba.org/exports/per_language/"

# Le Wiktionnaire intégral, passé par wiktextract (Tatu Ylonen). Chaque édition
# a son dump : l'allemande donne les entrées allemandes avec leurs définitions
# et leurs exemples **en allemand**, la française de même. C'est ce que WikDict
# ne retient pas — il ne garde que les paires de traduction.
KAIKKI = "https://kaikki.org/{edition}wiktionary/raw-wiktextract-data.jsonl.gz"

# Un navigateur poli s'annonce. Les deux hébergeurs servent des fichiers lourds
# gratuitement ; se présenter est la moindre des choses.
AGENT = "Wortschatz-build/1.0 (application hors ligne d'apprentissage FR-DE)"


def humain(octets):
    for unite in ("o", "Ko", "Mo", "Go"):
        if octets < 1024 or unite == "Go":
            return f"{octets:.0f} {unite}" if unite == "o" else f"{octets:.1f} {unite}"
        octets /= 1024


def ouvrir(url, depuis=0):
    requete = urllib.request.Request(url, headers={"User-Agent": AGENT})
    if depuis:
        requete.add_header("Range", f"bytes={depuis}-")
    return urllib.request.urlopen(requete, timeout=120)


def lister(url):
    """Noms de fichiers d'un index Apache/nginx."""
    with ouvrir(url) as reponse:
        page = reponse.read().decode("utf-8", "replace")
    return re.findall(r'href="([^"?/][^"]*)"', page)


def dernier_dossier_sqlite():
    """WikDict garde toutes ses moutures ; on prend la plus récente.

    Les noms sont de la forme `2_2026-06/`. Le tri lexicographique suffit,
    l'année précède le mois.
    """
    dossiers = [d for d in lister(WIKDICT_SQLITE) if re.fullmatch(r"2_\d{4}-\d{2}[a-z]?/", d)]
    if not dossiers:
        raise SystemExit("Aucune mouture SQLite trouvée sur download.wikdict.com")
    return sorted(dossiers)[-1]


def telecharger(url, destination, forcer=False):
    destination.parent.mkdir(parents=True, exist_ok=True)

    try:
        with ouvrir(url, depuis=0) as reponse:
            attendu = int(reponse.headers.get("Content-Length") or 0)
    except urllib.error.HTTPError as e:
        raise SystemExit(f"  ✗ {url} → HTTP {e.code}")

    if destination.exists() and not forcer:
        deja = destination.stat().st_size
        if attendu and deja == attendu:
            print(f"  = {destination.name} déjà là ({humain(deja)})")
            return destination
        if attendu and deja < attendu:
            print(f"  ↻ {destination.name} incomplet, reprise à {humain(deja)}")
            return _corps(url, destination, attendu, depuis=deja)
        # Taille supérieure à l'attendu : fichier douteux, on refait.
        print(f"  ! {destination.name} de taille inattendue, reprise à zéro")

    return _corps(url, destination, attendu, depuis=0)


def _corps(url, destination, attendu, depuis):
    mode = "ab" if depuis else "wb"
    debut = time.time()
    recu = depuis
    dernier_affichage = 0.0

    with ouvrir(url, depuis=depuis) as reponse, open(destination, mode) as sortie:
        while True:
            morceau = reponse.read(1 << 16)
            if not morceau:
                break
            sortie.write(morceau)
            recu += len(morceau)
            maintenant = time.time()
            if maintenant - dernier_affichage > 0.5:
                dernier_affichage = maintenant
                vitesse = (recu - depuis) / max(maintenant - debut, 0.001)
                part = f"{100 * recu / attendu:5.1f} %" if attendu else humain(recu)
                sys.stdout.write(
                    f"\r  ↓ {destination.name:<28} {part}  {humain(vitesse)}/s   "
                )
                sys.stdout.flush()

    duree = time.time() - debut
    sys.stdout.write("\r" + " " * 78 + "\r")
    print(f"  ✓ {destination.name} — {humain(recu)} en {duree:.0f} s")

    if attendu and recu != attendu:
        raise SystemExit(
            f"  ✗ {destination.name} : {recu} octets reçus, {attendu} attendus"
        )
    return destination


def main():
    analyseur = argparse.ArgumentParser(description=__doc__)
    analyseur.add_argument("--forcer", action="store_true",
                           help="retélécharger même ce qui est déjà présent")
    options = analyseur.parse_args()

    SOURCES.mkdir(parents=True, exist_ok=True)
    print(f"Sources dans {SOURCES}\n")

    print("WikDict — dictionnaires TEI (mot, genre, phonétique, formes, sens)")
    for nom in ("deu-fra.tei", "fra-deu.tei"):
        telecharger(WIKDICT_TEI + nom, SOURCES / nom, options.forcer)

    mouture = dernier_dossier_sqlite()
    print(f"\nWikDict — bases SQLite (fréquence des mots), mouture {mouture.rstrip('/')}")
    for nom in ("de-fr.sqlite3", "fr-de.sqlite3"):
        telecharger(WIKDICT_SQLITE + mouture + nom, SOURCES / nom, options.forcer)

    print("\nTatoeba — phrases alignées")
    for langue, nom in (("deu", "deu_sentences.tsv.bz2"),
                        ("fra", "fra_sentences.tsv.bz2"),
                        ("deu", "deu-fra_links.tsv.bz2")):
        telecharger(TATOEBA + langue + "/" + nom, SOURCES / nom, options.forcer)

    print("\nWiktionnaire intégral (définitions, exemples et flexions par sens)")
    print("  ~970 Mo à eux deux : c'est long, et la reprise sur coupure marche.")
    for edition in ("de", "fr"):
        telecharger(KAIKKI.format(edition=edition),
                    SOURCES / f"wiktionnaire-{edition}.jsonl.gz", options.forcer)

    total = sum(f.stat().st_size for f in SOURCES.iterdir() if f.is_file())
    print(f"\nTotal : {humain(total)} dans build/sources/")
    print("Étape suivante : python build/wiktionnaire.py, puis construire.py")


if __name__ == "__main__":
    main()
