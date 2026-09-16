# -*- coding: utf-8 -*-
"""Arma hojas de contacto etiquetadas (id + alt) para elegir fotos a ojo."""
import json, os, urllib.request, concurrent.futures, io, sys
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
B = os.path.join(HERE, "busqueda")
FUENTE = ImageFont.truetype(os.path.join(HERE, "fonts", "plexmono-0.ttf"), 15)
UA = {"User-Agent": "Mozilla/5.0"}
COL, CELDA = 6, 300

def baja(it):
    try:
        u = it["thumb"].split("?")[0] + "?auto=compress&cs=tinysrgb&w=420"
        d = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=45).read()
        return it, Image.open(io.BytesIO(d)).convert("RGB")
    except Exception as e:
        return it, None

for f in sorted(os.listdir(B)):
    if not f.endswith(".json"): continue
    items = json.load(open(os.path.join(B, f)))
    with concurrent.futures.ThreadPoolExecutor(8) as ex:
        res = list(ex.map(baja, items))
    res = [(i, im) for i, im in res if im]
    filas = (len(res) + COL - 1) // COL
    hoja = Image.new("RGB", (COL * CELDA, filas * (CELDA + 34)), (27, 36, 48))
    dr = ImageDraw.Draw(hoja)
    for n, (it, im) in enumerate(res):
        x, y = (n % COL) * CELDA, (n // COL) * (CELDA + 34)
        im.thumbnail((CELDA - 8, CELDA - 8))
        hoja.paste(im, (x + 4, y + 4 + (CELDA - 8 - im.height) // 2))
        dr.text((x + 6, y + CELDA + 4), it["id"], (192, 133, 82), font=FUENTE)
        dr.text((x + 6, y + CELDA + 18), it["alt"][:34], (243, 238, 228), font=FUENTE)
    hoja.save(os.path.join(B, f.replace(".json", ".png")), quality=80)
    print(f, len(res))
