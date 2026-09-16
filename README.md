# Rivand Asesores · web

Sitio de una página para **Rivand Asesores**, asesor de impuestos en Carballo (A Coruña).
Concepto: **«Cuenta atrás»** — el calendario fiscal como mecanismo de reloj. Aquí no se
cuadran cuentas: se cuidan los plazos.

Séptima familia de plantilla de la carpeta en el sector asesoría y **segunda de asesoría
fiscal**. Deliberadamente distinta de *Dourado & Fernández* («Balance»: columnas contables
que cuadran, verde botella + crema + oro viejo). Aquí el lenguaje es el **tiempo** —dial,
aguja, trimestre— en **azul noche + cobre**, y la estructura de secciones es propia.

---

## Cómo verlo

```bash
python -m http.server 8971
# http://127.0.0.1:8971/
```

## Verificación

```bash
NODE_PATH=<ruta a node_modules con playwright> node scripts/verify.js
```

**55/55 pruebas pasan.** El informe queda en `scripts/verify-report.json`. Cubre:
la aguja encaja en el trimestre real, el aviso de cookies cierra de verdad, el mapa no se
carga hasta pulsarlo, reduced-motion, el sticky-stack, los contadores, 400 px sin recortes
ni scroll lateral, la página sin JS y la honestidad de los datos (sin precios, con la
reseña real reproducida literal, sin declarar ni insinuar ningún recuento, y con todos los marcadores de pendiente a la vista).

---

## ⚠️ Lo que falta — datos que hay que pedir al cliente

Nada de esto se ha inventado. Todo está en la página como marcador visible
(`[ASÍ]`, en cobre sobre fondo rayado) y es un *buscar y reemplazar* directo.

### Bloqueante

| Qué | Dónde está el marcador | Nota |
|---|---|---|
| **Enlace de WhatsApp (número exacto)** | `href="https://wa.me/34NUMERO-PENDIENTE"` en 5 sitios | Su ficha de Google enlaza las citas por WhatsApp, pero el número de ese enlace no está confirmado. **No se ha usado el fijo 981 32 95 64 como si fuera WhatsApp.** Mientras el `href` contenga `NUMERO-PENDIENTE`, pulsar el botón abre un diálogo que lo explica en vez de dar un enlace roto. |

### Contenido

| Qué | Marcador |
|---|---|
| Nombre del asesor/a | `[NOMBRE DEL ASESOR/A PENDIENTE]` — **la reseña de Google dice «Gracias Esther»**, así que casi con seguridad es Esther, pero es la palabra de una clienta, no un dato dado por la asesoría. Falta el apellido y la confirmación. |
| Titulación | `[TITULACIÓN PENDIENTE]` |
| Nº de colegiado/a | `[Nº DE COLEGIADO/A PENDIENTE]` |
| Años en activo | `[AÑOS DE ACTIVIDAD PENDIENTES]` — la reseña habla de «sus 20 de experiencia en el sector» (entiéndase 20 años). Es de nuevo la clienta quien lo dice, no la asesoría: sin confirmar no se pone como dato del sitio. |
| Idiomas de atención | `[IDIOMAS PENDIENTES]` |
| Bio / presentación | `[BIO PENDIENTE]` |
| Email de contacto | `[EMAIL PENDIENTE]` (pie y aviso legal) |
| Alcance real de cada servicio | `[ALCANCE PENDIENTE]` ×6 |
| Precios / tarifas | **No hay ninguno en la web.** No se ha puesto ni un «desde X €». |

### Legal (obligatorio antes de publicar)

`[DENOMINACIÓN SOCIAL COMPLETA PENDIENTE]` · `[NIF/CIF PENDIENTE]` ·
`[DATOS REGISTRALES PENDIENTES]` · `[RESPONSABLE DEL TRATAMIENTO PENDIENTE]` ·
`[CANAL DE EJERCICIO DE DERECHOS PENDIENTE]`

### A confirmar (hay contenido, pero es genérico)

- **Servicios** — `[CONFIRMAR CON LA ASESORÍA]`. Las 6 categorías son las genéricas y
  evidentes de un asesor de impuestos (IRPF, IVA trimestral, Sociedades, autónomos, Renta,
  requerimientos). Las descripciones explican **qué es cada impuesto**, no qué hace Rivand.
  No se ha inventado ninguna especialidad ni ningún software de gestión.
- **Calendario fiscal** — `[CONFIRMAR FECHAS CON LA ASESORÍA]`. Son las fechas genéricas
  del calendario fiscal español (20 de enero/abril/julio/octubre; Renta de abril a junio;
  Sociedades del 1 al 25 de julio). Cada ejercicio la AEAT publica las suyas y se mueven
  por festivos, fines de semana y domiciliación.
- **Logotipo** — `logo.svg` / `logo-claro.svg` / `icon.svg` son un **wordmark tipográfico
  provisional** hecho aquí (Space Grotesk 700 + IBM Plex Mono, con el dial como
  distintivo). La web lo dice en el pie. Sustituir en cuanto llegue el logo real.
- **Fotografía** — ver abajo.

### Datos reales ya integrados

Nombre, categoría, dirección completa **con planta y puerta** (Rúa Fomento, 21, 2º puerta 4,
15100 Carballo), teléfono 981 32 95 64, horario completo (L–J 9:00–13:00 y 15:30–19:30 ·
V 9:00–14:00 · S y D cerrado) valoración **5,0 ★** y la reseña publicada en Google (texto, autora y fecha).

---

## Sobre las opiniones

La sección muestra la **valoración real de Google (5,0 ★)** y **reproduce entera y literal**
la reseña publicada, con su autora (*Ta Mi*) y su fecha.

**No se dice cuántas reseñas hay.** Por decisión del cliente, el recuento no se menciona:
la sección ya no lo declara ni en el texto ni en la interfaz. Omitirlo no es faltar a la
verdad; lo que no se hace en ningún caso es **insinuar que sean muchas**. No hay «nuestros
clientes», ni «cientos de opiniones», ni plurales que sugieran volumen. Hay dos pruebas
automáticas que fallan si alguna vez se cuela un número de reseñas o lenguaje de prueba
social masiva.

En `schema.org` el `aggregateRating` sigue con el `ratingCount` **real y exacto**: ese dato
es para Google, tiene que ser cierto y ahí no se toca.

La cita va **literal, con su errata incluida** («sus 20 de experiencia»): es lo que escribió
la clienta y no se corrige ni se maquilla. Las comillas las pone el CSS, no el texto, para
que el contenido siga siendo exactamente el original.

**La fecha es aproximada.** Google mostraba «hace 11 meses» en la captura del 16-09-2026, de
donde sale *octubre de 2025*. Puede bailar unas semanas; si quieres la fecha exacta, se ve
abriendo la reseña en Google y es cambiar dos palabras en `index.html`.

## Sobre la fotografía — leer esto

El encargo pedía **generar fotografía original**. En este entorno **no hay herramienta de
generación de imagen**, así que no se ha podido hacer, y no se ha simulado.

Lo que sí se ha hecho: elegir a mano fotografía con licencia **Pexels** (uso comercial libre,
sin atribución obligatoria) que responde punto por punto al brief, y llevarla a la paleta con
una gradación escrita para esta web (`scripts/process_photos.py`): los verdes saturados se
apagan —el salvia queda sólo para la interfaz—, maderas y metales se empujan a cobre, las
sombras viran a azul noche y las luces a crema. Es la operación inversa a la de Dourado,
que iba a verde botella y oro.

| Archivo | Pexels | Escena del brief |
|---|---|---|
| `despacho` | #7658310 | mesa de madera con documentos y luz de ventana |
| `reloj` | #37808313 | reloj de sobremesa como objeto real en escena |
| `calendario` | #11773871 | calendario con una fecha marcada a mano |
| `manos` | #5124872 | manos revisando un documento, reloj de pulsera a la vista |
| `carpetas` | #4792288 | documentos organizados |
| `ventana` | #3747070 | ambiente de despacho (previa del mapa) |
| `retrato` | #27086761 | **marcador provisional del asesor/a** |

**Ninguna es del despacho real de Rúa Fomento** y la web lo dice en cada pie de foto
(`[FOTOS DEL LOCAL PENDIENTES]`). El retrato lleva un aviso explícito: *«esta persona no
trabaja en Rivand Asesores»*. En cuanto lleguen fotos del local y un retrato real, se
sustituyen los `.jpg` de `assets/img/photos/` manteniendo los nombres.

---

## Cómo está hecho

### Paleta

| Token | Valor | Uso |
|---|---|---|
| `--noche` | `#1B2430` | estructural: hero, calendario fiscal, pie |
| `--crema` | `#F3EEE4` | base clara del resto |
| `--cobre` | `#C08552` | mecanismo: agujas, marcas activas, CTA |
| `--cobre-tinta` | `#8A5A2B` | el mismo cobre, legible como texto sobre crema (5,1:1) |
| `--salvia` | `#7C8B75` | estados «cerrado / al día», sólo en interfaz |

Cada acento tiene una variante oscurecida para texto (`-tinta`) y otra aclarada para fondo
noche (`-claro`), calculadas para cumplir contraste AA.

### Tipografía

**Space Grotesk** (geométrica, tabular) para titulares y cifras; **IBM Plex Mono** para
etiquetas de fecha y trimestre (T1–T4, horarios, marcadores de pendiente). Las fechas van
siempre en mono; los titulares, siempre en la geométrica.

### El dial

Es el motivo que recorre la web y aparece en siete tamaños: cabecera y pie (logo),
hero (grande, con la cuenta atrás dentro), servicios (miniatura de 6 pasos),
la asesoría y contacto (marcadores de sección), y el calendario fiscal (grande, con las
cuatro fechas límite alrededor).

Detalles que importan:

- **La aguja es un bastón flotante.** Una «tapa» central del color del fondo esconde su
  mitad interior, así el número de la cuenta atrás queda limpio y sin agujas cruzándolo.
- **Las etiquetas T1–T4 y sus fechas van dentro del `viewBox`** (`-34 -34 268 268`), no en
  HTML posicionado encima. Por eso a 400 px el dial se encoge con sus etiquetas y **no se
  recorta nada** — hay una prueba que lo comprueba contra el `getBBox()`.
- **Las 60 marcas menores son un solo `<circle>`** con `stroke-dasharray`, no 60 elementos.
- **El trimestre en curso y los días que faltan se calculan con la fecha real del
  navegador**, no están escritos a mano: la web no se queda obsoleta sola.

### Movimiento

Lenis + GSAP/ScrollTrigger. Todo el movimiento es el mismo gesto: **algo gira y encaja**.

- La aguja da una vuelta larga y casi mecánica (`power2.inOut`) y remata con un encaje
  elástico corto (`elastic.out(1, 0.38)`) que se pasa y se asienta; al encajar, la marca del
  trimestre se enciende en cobre y un halo se expande y se apaga.
- Sticky-stack de servicios con el dial en miniatura avanzando un paso por tarjeta, cada
  paso con su propio encaje elástico.
- Char-reveal en los titulares, marquee lento en mono (`T1 · T2 · T3 · T4 · RENTA ·
  SOCIEDADES`), contadores en las cifras de contacto y botones magnéticos.
- **Sin canvas.** Sin `filter: blur` ni `shadowBlur` por frame.

### Dos trampas que costaron encontrar (anotadas en el código)

1. **`transformOrigin` no vale para rotar SVG con GSAP.** En SVG, GSAP mide
   `transformOrigin` sobre el *bounding box del elemento*, no sobre el sistema de
   coordenadas del `viewBox`. La aguja giraba alrededor de un punto a 300 px del centro del
   dial y desaparecía de la pantalla. Se arregla con **`svgOrigin: "100 100"`**.
2. **Una regla CSS de `transform` sobre el elemento animado lo deja clavado.** GSAP mueve
   los SVG escribiendo el **atributo** `transform`, y cualquier `transform` en CSS lo pisa.
   Había un `.js .d-aguja { transform: rotate(0deg) }` puesto como salvaguarda y mantenía la
   aguja inmóvil apuntando a T1 pasara lo que pasara. Está documentado en el CSS para que no
   vuelva.

### Accesibilidad y privacidad

- `prefers-reduced-motion`: la aguja **aparece ya en su posición final** (se coloca con
  `style` inline, que sí gana a la clase), no se activa Lenis y nada queda invisible.
- Sin JS la página sigue completa y legible: nada se oculta si GSAP no carga.
- Aviso de cookies con `.cookie-banner:not([hidden]) { display: flex }`, para que `[hidden]`
  gane siempre y el botón cierre de verdad.
- Mapa de Google bajo consentimiento (`.map-consent`): el `iframe` se construye sólo al
  pulsar, con `google.com/maps?q=…&output=embed` y **sin API key**. Antes del clic no sale
  ni una petición a Google Maps.
- Diálogos legales nativos (`<dialog>`), `skip link`, foco visible en cobre y menú móvil
  accesible con `aria-expanded`.

---

## Estructura

```
index.html            una sola página
404.html
manifest.json
css/style.css
js/main.js
assets/img/logo/      wordmark provisional, iconos PWA y og
assets/img/photos/    fotografía graduada (1600 / 900 / lqip)
scripts/
  generate_brand.py   wordmark y dial -> SVG (trazados con fontTools)
  generate_icons.js   iconos PWA y og.png
  buscar_pexels.js    búsqueda + hojas de contacto para elegir fotos
  hoja_contacto.py
  process_photos.py   descarga y gradación a la paleta
  verify.js           las 52 pruebas de Playwright
  verify-report.json
screenshots/
```

Las secciones son propias de esta plantilla: hero con dial de trimestres → marquee →
servicios en sticky-stack → calendario fiscal alrededor del dial → la asesoría →
opiniones → contacto con esferas de reloj. No reutiliza el esqueleto de ninguna otra web
de la carpeta.
