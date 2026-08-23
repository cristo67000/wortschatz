# -*- coding: utf-8 -*-
"""Génère les icônes de Wortschatz.

Dessin : deux bulles de parole qui se chevauchent sur un fond bleu d'encre —
deux langues qui se répondent. Rien d'autre : à 48 pixels sur un écran de
téléphone, tout détail supplémentaire devient une tache.

Le tout est dessiné au quadruple de la taille finale puis réduit : Pillow ne
lisse pas les bords, le suréchantillonnage s'en charge.

    python build/generer-icones.py
"""
import os

from PIL import Image, ImageDraw

ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.join(os.path.dirname(ICI), "icons")

ENCRE = (29, 53, 87)        # le bleu de l'application
CREME = (250, 247, 242)
OR = (226, 178, 74)

E = 4  # facteur de suréchantillonnage


def bulle(dessin, boite, couleur, sens):
    """Une bulle de parole : un rectangle arrondi et sa pointe.

    `sens` vaut -1 pour une pointe à gauche, +1 pour une pointe à droite.
    """
    gauche, haut, droite, bas = boite
    rayon = (bas - haut) // 3
    dessin.rounded_rectangle(boite, radius=rayon, fill=couleur)

    hauteur = (bas - haut) // 3
    if sens < 0:
        base = gauche + (droite - gauche) // 4
        pointe = (gauche - hauteur // 2, bas + hauteur // 2)
    else:
        base = droite - (droite - gauche) // 4
        pointe = (droite + hauteur // 2, bas + hauteur // 2)
    dessin.polygon(
        [(base, bas - 2), (base + sens * hauteur, bas - 2), pointe],
        fill=couleur,
    )


def lignes_de_texte(dessin, boite, couleur, nombre):
    """Quelques traits qui suggèrent des mots, sans en écrire."""
    gauche, haut, droite, bas = boite
    marge = (droite - gauche) // 6
    epaisseur = max(2, (bas - haut) // 9)
    pas = (bas - haut - 2 * marge) // max(nombre - 1, 1)
    for rang in range(nombre):
        y = haut + marge + rang * pas
        fin = droite - marge - (0 if rang % 2 == 0 else (droite - gauche) // 4)
        dessin.rounded_rectangle(
            [gauche + marge, y, fin, y + epaisseur],
            radius=epaisseur // 2, fill=couleur,
        )


def dessiner(taille, marge_relative=0.0):
    """Une icône carrée. `marge_relative` réserve la zone rognée des icônes
    masquables d'Android, qui peut découper jusqu'à 20 % de chaque bord."""
    grand = taille * E
    image = Image.new("RGB", (grand, grand), ENCRE)
    dessin = ImageDraw.Draw(image)

    marge = int(grand * marge_relative)
    zone = grand - 2 * marge
    unite = zone / 100.0

    def p(x, y):
        return (marge + int(x * unite), marge + int(y * unite))

    # Bulle du fond, crème, décalée en haut à gauche.
    haut_gauche = p(8, 16)
    bas_droite = p(66, 56)
    bulle(dessin, [*haut_gauche, *bas_droite], CREME, -1)
    lignes_de_texte(dessin, [*haut_gauche, *bas_droite], ENCRE, 3)

    # Bulle de devant, dorée, décalée en bas à droite.
    haut_gauche = p(34, 48)
    bas_droite = p(92, 88)
    bulle(dessin, [*haut_gauche, *bas_droite], OR, 1)
    lignes_de_texte(dessin, [*haut_gauche, *bas_droite], ENCRE, 3)

    return image.resize((taille, taille), Image.LANCZOS)


def main():
    os.makedirs(SORTIE, exist_ok=True)
    for nom, taille, marge in (
        ("icon-192.png", 192, 0.06),
        ("icon-512.png", 512, 0.06),
        # Android rogne les icônes masquables : on garde le dessin au centre.
        ("icon-maskable-512.png", 512, 0.19),
    ):
        chemin = os.path.join(SORTIE, nom)
        dessiner(taille, marge).save(chemin, optimize=True)
        print(f"  {nom} — {os.path.getsize(chemin)} octets")


if __name__ == "__main__":
    main()
