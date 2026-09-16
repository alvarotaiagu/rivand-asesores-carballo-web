# -*- coding: utf-8 -*-
"""Marca provisional de Rivand Asesores.

No hay logo del cliente: se construye un wordmark tipografico y un
distintivo geometrico (el dial fiscal) que es el mismo motivo que recorre
toda la web. Todo se marca como PROVISIONAL hasta recibir el logo real.

  icon.svg        el dial solo (favicon / app icon)
  logo.svg        dial + "RIVAND" (Space Grotesk 700) + "ASESORES" (Plex Mono),
                  tinta azul noche, para fondo crema
  logo-claro.svg  el mismo lockup en crema, para fondo azul noche
  icon-*.png      iconos PWA + og.png  (PIL)

Los textos se convierten a trazados con fontTools para que el SVG no
dependa de una webfont.
"""
import json, os, math
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "img", "logo")
os.makedirs(OUT, exist_ok=True)

NOCHE = "#1B2430"
CREMA = "#F3EEE4"
COBRE = "#C08552"

def elegir(nombre, peso):
    """Devuelve el ttf cuyo peso declarado coincide."""
    for f in sorted(os.listdir(os.path.join(HERE, "fonts"))):
        if not f.startswith(nombre): continue
        ruta = os.path.join(HERE, "fonts", f)
        tf = TTFont(ruta)
        if tf["OS/2"].usWeightClass == peso:
            return tf
    raise SystemExit("falta peso %s de %s" % (peso, nombre))

def trazar(font, texto, tam, tracking=0.0):
    """texto -> (path d, ancho avanzado) a la altura em pedida, baseline en y=0."""
    upem = font["head"].unitsPerEm
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    esc = tam / upem
    d, x = [], 0.0
    for ch in texto:
        gn = cmap.get(ord(ch))
        if gn is None:
            x += tam * 0.4 + tracking
            continue
        pen = SVGPathPen(gs)
        # y invertida: el SVG crece hacia abajo
        tp = TransformPen(pen, Transform(esc, 0, 0, -esc, x, 0))
        gs[gn].draw(tp)
        p = pen.getCommands()
        if p: d.append(p)
        x += hmtx[gn][0] * esc + tracking
    return " ".join(d), x - tracking

def dial(cx, cy, r, activo=1, stroke=COBRE, apagado=None, ancho=None, menores=True):
    """El motivo: aro fino, 4 marcas de trimestre, aguja hacia el activo.
       activo 0..3 = T1 arriba, T2 derecha, T3 abajo, T4 izquierda."""
    apagado = apagado or stroke
    w = ancho or max(1.0, r * 0.075)
    p = ['<circle cx="%g" cy="%g" r="%g" fill="none" stroke="%s" stroke-width="%g" opacity=".55"/>'
         % (cx, cy, r, apagado, w * 0.7)]
    for i in range(4):
        a = math.radians(-90 + i * 90)
        r1, r2 = (r * 0.80, r * 1.02) if i == activo else (r * 0.86, r * 1.0)
        col = stroke if i == activo else apagado
        op = "1" if i == activo else ".45"
        p.append('<line x1="%g" y1="%g" x2="%g" y2="%g" stroke="%s" stroke-width="%g" stroke-linecap="round" opacity="%s"/>'
                 % (cx + math.cos(a) * r1, cy + math.sin(a) * r1,
                    cx + math.cos(a) * r2, cy + math.sin(a) * r2,
                    col, w * (2.1 if i == activo else 1.0), op))
    # marcas menores
    for i in range(24 if menores else 0):
        if i % 6 == 0: continue
        a = math.radians(-90 + i * 15)
        p.append('<line x1="%g" y1="%g" x2="%g" y2="%g" stroke="%s" stroke-width="%g" opacity=".28"/>'
                 % (cx + math.cos(a) * r * 0.93, cy + math.sin(a) * r * 0.93,
                    cx + math.cos(a) * r, cy + math.sin(a) * r, apagado, w * 0.55))
    # aguja hacia el trimestre activo, con contrapeso corto
    a = math.radians(-90 + activo * 90)
    p.append('<line x1="%g" y1="%g" x2="%g" y2="%g" stroke="%s" stroke-width="%g" stroke-linecap="round"/>'
             % (cx - math.cos(a) * r * 0.2, cy - math.sin(a) * r * 0.2,
                cx + math.cos(a) * r * 0.58, cy + math.sin(a) * r * 0.58, stroke, w * 1.2))
    p.append('<circle cx="%g" cy="%g" r="%g" fill="%s"/>' % (cx, cy, w * 1.25, stroke))
    return "\n  ".join(p)

# ---------- icon.svg ----------
with open(os.path.join(OUT, "icon.svg"), "w", encoding="utf-8") as f:
    f.write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Rivand Asesores">\n'
            '  <rect width="64" height="64" rx="14" fill="%s"/>\n  %s\n</svg>\n'
            % (NOCHE, dial(32, 32, 20, activo=1, stroke=COBRE, apagado=CREMA, ancho=2.3, menores=False)))

# ---------- lockup ----------
sg = elegir("spacegrotesk", 700)
pm = elegir("plexmono", 500)
TAM = 64.0
d_riv, w_riv = trazar(sg, "Rivand", TAM, tracking=-1.0)
d_ase, w_ase = trazar(pm, "ASESORES", TAM * 0.245, tracking=TAM * 0.115)

R = 27.0
marca_w = R * 2
hueco = 22.0
x_txt = marca_w + hueco
alto = 86.0
base_riv = 46.0
base_ase = 70.0
ancho_total = x_txt + max(w_riv, w_ase) + 2

def lockup(tinta, acento):
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %g %g" role="img" aria-label="Rivand Asesores">\n'
        '  <title>Rivand Asesores</title>\n'
        '  %s\n'
        '  <path d="%s" fill="%s" transform="translate(%g %g)"/>\n'
        '  <path d="%s" fill="%s" opacity=".78" transform="translate(%g %g)"/>\n'
        '</svg>\n' % (ancho_total, alto,
                      dial(R, alto / 2, R - 2, activo=1, stroke=acento, apagado=tinta, ancho=2.0),
                      d_riv, tinta, x_txt, base_riv,
                      d_ase, tinta, x_txt + 1.5, base_ase))

open(os.path.join(OUT, "logo.svg"), "w", encoding="utf-8").write(lockup(NOCHE, COBRE))
open(os.path.join(OUT, "logo-claro.svg"), "w", encoding="utf-8").write(lockup(CREMA, COBRE))

json.dump({"riv": d_riv, "ase": d_ase, "w_riv": w_riv, "w_ase": w_ase,
           "alto": alto, "ancho": ancho_total, "x_txt": x_txt,
           "base_riv": base_riv, "base_ase": base_ase},
          open(os.path.join(HERE, "wordmark_paths.json"), "w"), indent=1)
print("marca provisional generada:", ancho_total, "x", alto)
