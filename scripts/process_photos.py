# -*- coding: utf-8 -*-
"""Descarga y grada la fotografia de Rivand Asesores  ·  concepto "Cuenta atras".

AVISO: el brief pedia fotografia *generada*. En este entorno no hay herramienta
de generacion de imagen, asi que se parte de fotografia con licencia Pexels
(uso comercial libre, sin atribucion obligatoria) elegida una a una para el
concepto, y se lleva a la paleta con una gradacion escrita para esta web.
Ninguna es del despacho real de Rua Fomento 21.

  despacho    Pexels #7658310   mesa larga de madera con documentos y luz de ventana
  reloj       Pexels #37808313  despertador de sobremesa sobre un cuaderno, luz calida
  calendario  Pexels #11773871  mano marcando un dia en el calendario de sobremesa
  manos       Pexels #5124872   manos revisando/anotando con reloj de pulsera a la vista
  carpetas    Pexels #4792288   archivador abierto con las carpetas en orden
  ventana     Pexels #3747070   puesto de trabajo junto a un ventanal alto, madera
  retrato     Pexels #27086761  PROVISIONAL - no es la asesora, es un marcador

Gradacion (al reves que la de Dourado & Fernandez, que iba a verde+oro):
balance de blancos gray-world, los VERDES saturados se apagan (el salvia queda
solo para UI), los metales y maderas se empujan a cobre #C08552, split-toning
con sombras viradas a azul noche #1B2430 y luces a crema #F3EEE4, curva en S,
vineteado leve y grano fino. Salida a 1600 y 900 px mas un LQIP de 24 px.
"""
import os
import urllib.request
import concurrent.futures
import numpy as np
from PIL import Image, ImageFilter

PHOTOS = {
    # nombre: (id, proporcion ancho/alto, anclaje vertical del recorte 0..1)
    "despacho":   ("7658310",  3 / 2, 0.5, (760, 240, 2000, 1067)),
    "reloj":      ("37808313", 4 / 5, 0.5),
    "calendario": ("11773871", 4 / 5, 0.5),
    "manos":      ("5124872",  4 / 5, 0.5),
    "carpetas":   ("4792288",  4 / 5, 0.5),
    "ventana":    ("3747070",  3 / 2, 0.5),
    "retrato":    ("27086761", 4 / 5, 0.3),
}

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "photos_src")
OUT = os.path.join(HERE, "..", "assets", "img", "photos")
os.makedirs(SRC, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

NOCHE = np.array([0x1B, 0x24, 0x30]) / 255.0
CREMA = np.array([0xF3, 0xEE, 0xE4]) / 255.0
COBRE = np.array([0xC0, 0x85, 0x52]) / 255.0
LUMA = np.array([0.299, 0.587, 0.114])


def fetch(pid, dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 10000:
        return
    url = "https://images.pexels.com/photos/%s/pexels-photo-%s.jpeg?w=2000" % (pid, pid)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as r, open(dest, "wb") as f:
        f.write(r.read())


def hue_sat(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1)
    d = mx - mn + 1e-6
    h = np.where(mx == r, ((g - b) / d) % 6,
        np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) / 6.0
    return h, d / (mx + 1e-6)


def grade(im: Image.Image) -> Image.Image:
    a = np.asarray(im.convert("RGB")).astype(np.float32) / 255.0
    # 1. balance de blancos gray-world suave
    mean = a.reshape(-1, 3).mean(0)
    a = np.clip(a * (mean.mean() / mean) ** 0.5, 0, 1)
    # 2. el verde salvia es color de interfaz, no de foto: los verdes se apagan
    h, s = hue_sat(a)
    lum = a @ LUMA
    verde = np.exp(-((h - 0.30) ** 2) / (2 * 0.085 ** 2)) * np.clip(s * 2.0, 0, 1)
    a = a * (1 - verde[..., None] * 0.72) + lum[..., None] * verde[..., None] * 0.72
    # 3. maderas, metales y ambares se empujan a cobre
    h, s = hue_sat(a)
    lum = a @ LUMA
    calido = np.exp(-((h - 0.075) ** 2) / (2 * 0.055 ** 2)) * np.clip(s * 1.8, 0, 1)
    a = a * (1 - calido[..., None] * 0.34) + (lum[..., None] * 0.42 + COBRE * 0.58) * calido[..., None] * 0.34
    # 3b. los rojos chillones (una fecha marcada, una carpeta) viran a cobre
    h, s = hue_sat(a)
    lum = a @ LUMA
    rojo = np.exp(-((h - 0.005) ** 2) / (2 * 0.030 ** 2)) * np.clip(s * 1.6, 0, 1)
    a = a * (1 - rojo[..., None] * 0.45) + (lum[..., None] * 0.30 + COBRE * 0.70) * rojo[..., None] * 0.45
    # 4. saturacion contenida
    lum = a @ LUMA
    a = lum[..., None] + (a - lum[..., None]) * 0.72
    # 5. split-toning: sombras a azul noche, luces a crema calido
    sh = np.clip(1.0 - lum, 0, 1)[..., None] ** 1.9
    hi = np.clip(lum - 0.58, 0, 1)[..., None] * 2.1
    a = a * (1 - sh * 0.30) + NOCHE * sh * 0.30
    a = a * (1 - hi * 0.26) + CREMA * hi * 0.26
    # 6. curva en S y negros levantados hacia la noche
    a = np.clip(a, 0, 1)
    a = a * a * (3 - 2 * a) * 0.58 + a * 0.42
    a = a * 0.955 + NOCHE * 0.045
    # 6b. exposicion: despacho luminoso, no penumbra
    a = np.clip(a, 0, 1) ** 0.86
    a = np.clip(a * 1.05, 0, 1)
    # 7. vineteado leve
    hgt, wid = a.shape[:2]
    yy, xx = np.mgrid[0:hgt, 0:wid]
    r = np.sqrt(((xx - wid / 2) / (wid / 2)) ** 2 + ((yy - hgt / 2) / (hgt / 2)) ** 2)
    vig = 1 - np.clip(r - 0.52, 0, 1) ** 2 * 0.26
    a = a * vig[..., None]
    # 8. grano fino
    rng = np.random.default_rng(21)
    a = a + rng.normal(0, 0.010, a.shape)
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))


def recortar(im, ratio, ancla):
    w, h = im.size
    if w / h > ratio:
        nw = int(h * ratio)
        return im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    nh = int(w / ratio)
    y0 = int((h - nh) * ancla)
    return im.crop((0, y0, w, y0 + nh))


def procesar(nombre):
    conf = PHOTOS[nombre]
    pid, ratio, ancla = conf[0], conf[1], conf[2]
    manual = conf[3] if len(conf) > 3 else None
    src = os.path.join(SRC, "%s-%s.jpg" % (nombre, pid))
    fetch(pid, src)
    im = Image.open(src)
    if manual:
        im = im.crop(manual)
    im = recortar(im, ratio, ancla)
    if im.width > 1600:
        im = im.resize((1600, int(im.height * 1600 / im.width)), Image.LANCZOS)
    im = grade(im)
    im.save(os.path.join(OUT, "%s-1600.jpg" % nombre), quality=82, optimize=True, progressive=True)
    im.resize((900, int(im.height * 900 / im.width)), Image.LANCZOS).save(
        os.path.join(OUT, "%s-900.jpg" % nombre), quality=82, optimize=True, progressive=True)
    im.resize((24, max(1, int(im.height * 24 / im.width))), Image.LANCZOS) \
      .filter(ImageFilter.GaussianBlur(0.6)) \
      .save(os.path.join(OUT, "%s-lqip.jpg" % nombre), quality=50)
    return nombre, im.size


if __name__ == "__main__":
    with concurrent.futures.ThreadPoolExecutor(4) as ex:
        for nombre, size in ex.map(procesar, PHOTOS):
            print(nombre, size)
