# -*- coding: utf-8 -*-
"""Image d'aperçu pour le partage du lien (Open Graph).

Quand on envoie l'adresse de l'application par message, le destinataire ne voit
qu'une URL nue. Cette image, annoncée par les balises og:image, donne au lien un
visage : le nom, ce que fait l'application, et les deux bulles de l'icône.

Format 1200 x 630, celui qu'attendent les messageries et les réseaux.

    python build/generer-partage.py
"""
import os

from PIL import Image, ImageDraw, ImageFont

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(ICI)

ENCRE = (29, 53, 87)
CREME = (250, 247, 242)
OR = (226, 178, 74)
GRIS = (176, 190, 209)

LARGEUR, HAUTEUR = 1200, 630
E = 2  # suréchantillonnage


def police(taille, gras=False):
    """Une police système lisible, quelle que soit la machine."""
    noms = (["seguisb.ttf", "segoeuib.ttf", "arialbd.ttf", "DejaVuSans-Bold.ttf"]
            if gras else
            ["segoeui.ttf", "arial.ttf", "DejaVuSans.ttf"])
    for nom in noms:
        for dossier in (r"C:\Windows\Fonts", "/usr/share/fonts/truetype/dejavu"):
            chemin = os.path.join(dossier, nom)
            if os.path.exists(chemin):
                return ImageFont.truetype(chemin, taille)
    return ImageFont.load_default()


def bulle(dessin, boite, couleur, sens):
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
    dessin.polygon([(base, bas - 2), (base + sens * hauteur, bas - 2), pointe], fill=couleur)


def lignes_de_texte(dessin, boite, couleur, nombre):
    gauche, haut, droite, bas = boite
    marge = (droite - gauche) // 6
    epaisseur = max(2, (bas - haut) // 9)
    pas = (bas - haut - 2 * marge) // max(nombre - 1, 1)
    for rang in range(nombre):
        y = haut + marge + rang * pas
        fin = droite - marge - (0 if rang % 2 == 0 else (droite - gauche) // 4)
        dessin.rounded_rectangle([gauche + marge, y, fin, y + epaisseur],
                                 radius=epaisseur // 2, fill=couleur)


def fleches(dessin, x, y, largeur, couleur):
    """Une double flèche ⇄ : deux traits, deux pointes opposées."""
    epaisseur = max(2, largeur // 14)
    ecart = largeur // 5
    tete = largeur // 5

    # Flèche du haut, vers la droite.
    haut = y - ecart
    dessin.line([(x, haut), (x + largeur, haut)], fill=couleur, width=epaisseur)
    dessin.polygon([(x + largeur, haut), (x + largeur - tete, haut - tete // 2),
                    (x + largeur - tete, haut + tete // 2)], fill=couleur)

    # Flèche du bas, vers la gauche.
    bas = y + ecart
    dessin.line([(x, bas), (x + largeur, bas)], fill=couleur, width=epaisseur)
    dessin.polygon([(x, bas), (x + tete, bas - tete // 2),
                    (x + tete, bas + tete // 2)], fill=couleur)


def dessiner():
    image = Image.new("RGB", (LARGEUR * E, HAUTEUR * E), ENCRE)
    d = ImageDraw.Draw(image)

    # Les deux bulles, à droite, comme sur l'icône.
    bulle(d, [740 * E, 150 * E, 1010 * E, 330 * E], CREME, -1)
    lignes_de_texte(d, [740 * E, 150 * E, 1010 * E, 330 * E], ENCRE, 3)
    bulle(d, [860 * E, 300 * E, 1130 * E, 480 * E], OR, 1)
    lignes_de_texte(d, [860 * E, 300 * E, 1130 * E, 480 * E], ENCRE, 3)

    # Le texte, à gauche.
    d.text((80 * E, 170 * E), "Wortschatz", font=police(86 * E, gras=True), fill=CREME)
    # « français ⇄ allemand ». La double flèche est dessinée, non écrite : les
    # polices système de Windows n'ont pas le glyphe U+21C4, qui sortait en
    # carré vide — et une image de partage ratée se voit par tout le monde.
    sous_titre = police(40 * E)
    y = 285 * E
    x = 80 * E
    d.text((x, y), "français", font=sous_titre, fill=OR)
    x += d.textlength("français ", font=sous_titre)
    fleches(d, x, y + 26 * E, 44 * E, OR)
    x += 44 * E + 14 * E
    d.text((x, y), "allemand", font=sous_titre, fill=OR)
    d.text((80 * E, 370 * E),
           "Dictionnaire hors ligne\net mémorisation",
           font=police(31 * E), fill=GRIS, spacing=12 * E)

    # Un filet doré, pour asseoir le bloc.
    d.rounded_rectangle([80 * E, 150 * E, 86 * E, 262 * E], radius=3 * E, fill=OR)

    return image.resize((LARGEUR, HAUTEUR), Image.LANCZOS)


def main():
    dossier = os.path.join(RACINE, "icons")
    os.makedirs(dossier, exist_ok=True)
    chemin = os.path.join(dossier, "apercu-1200x630.png")
    dessiner().save(chemin, optimize=True)
    print(f"  apercu-1200x630.png — {os.path.getsize(chemin)} octets")


if __name__ == "__main__":
    main()
