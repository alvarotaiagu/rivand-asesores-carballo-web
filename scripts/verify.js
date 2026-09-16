/* Verificación de la web de Rivand Asesores con Playwright.
   Requiere un servidor local:  python -m http.server 8971
   Uso: NODE_PATH=<ruta node_modules> node scripts/verify.js            */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.RIV_URL || 'http://127.0.0.1:8971/';
const RAIZ = path.join(__dirname, '..');
const CAPS = path.join(RAIZ, 'screenshots');
fs.mkdirSync(CAPS, { recursive: true });

const resultados = [];
const ok = (nombre, valor, detalle) =>
  resultados.push({ prueba: nombre, ok: !!valor, detalle: detalle === undefined ? null : detalle });

async function nuevaPagina(browser, opciones = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, ...opciones });
  const errores = [];
  page.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });
  page.on('pageerror', e => errores.push('pageerror: ' + e.message));
  page.errores = errores;
  return page;
}

/* ángulo de una matriz CSS/SVG, en grados 0..360 */
const angulo = m => {
  if (!m || m === 'none') return 0;
  const n = m.slice(m.indexOf('(') + 1).split(',').map(parseFloat);
  return (Math.round(Math.atan2(n[1], n[0]) * 180 / Math.PI) + 360) % 360;
};

/* trimestre en curso según la misma regla que usa main.js */
function trimestreEsperado(ahora) {
  const LIM = [[4, 20], [7, 20], [10, 20], [1, 20]];
  let q = Math.floor(ahora.getMonth() / 3) + 1;
  const venc = q2 => new Date(q2 === 4 ? ahora.getFullYear() + 1 : ahora.getFullYear(),
    LIM[q2 - 1][0] - 1, LIM[q2 - 1][1], 23, 59, 59);
  if (ahora > venc(q)) q = q % 4 + 1;
  return q;
}

(async () => {
  const browser = await chromium.launch();
  const Q = trimestreEsperado(new Date());

  /* ---------- 1. carga, consola y la aguja que encaja ---------- */
  {
    const page = await nuevaPagina(browser);
    await page.addInitScript(() => {
      window.__longtasks = [];
      new PerformanceObserver(l => l.getEntries().forEach(e =>
        window.__longtasks.push({ inicio: Math.round(e.startTime), dur: Math.round(e.duration) })))
        .observe({ entryTypes: ['longtask'] });
    });
    await page.goto(BASE, { waitUntil: 'load' });
    await page.mouse.move(700, 880);
    await page.waitForTimeout(4500);

    ok('carga sin errores de consola', page.errores.length === 0, page.errores);

    const dial = await page.evaluate(() => {
      const svg = document.querySelector('.hero [data-dial]');
      const ag = svg.querySelector('.d-aguja');
      const m = ag.getAttribute('transform') || getComputedStyle(ag).transform;
      const marca = [...svg.querySelectorAll('.d-marca')].find(x => x.classList.contains('on'));
      const eti = [...svg.querySelectorAll('.d-eti')].find(x => x.classList.contains('on'));
      return {
        transform: m,
        matrix: getComputedStyle(ag).transform,
        marcaOn: marca && marca.getAttribute('data-marca'),
        etiOn: eti && eti.getAttribute('data-letra'),
        cuenta: document.querySelector('[data-cuenta]').textContent.trim(),
        dataQ: svg.getAttribute('data-q')
      };
    });
    ok('el dial del hero sigue el trimestre real (T' + Q + ')', dial.dataQ === String(Q), dial.dataQ);
    ok('la aguja encaja en la marca del trimestre', angulo(dial.matrix) === ((Q - 1) * 90) % 360,
      { grados: angulo(dial.matrix), esperado: ((Q - 1) * 90) % 360 });
    ok('la marca del trimestre se ilumina en cobre', dial.marcaOn === String(Q), dial.marcaOn);
    ok('la etiqueta mono del trimestre se ilumina', dial.etiOn === String(Q), dial.etiOn);
    ok('la cuenta atrás muestra un número de días', /^\d+$/.test(dial.cuenta), dial.cuenta);

    /* la aguja gira dentro del dial, no fuera: el bbox tiene que caer dentro del svg */
    const dentro = await page.evaluate(() => {
      const svg = document.querySelector('.hero [data-dial]');
      const a = svg.querySelector('.d-aguja').getBoundingClientRect();
      const s = svg.getBoundingClientRect();
      return a.left >= s.left - 1 && a.right <= s.right + 1 && a.top >= s.top - 1 && a.bottom <= s.bottom + 1;
    });
    ok('la aguja gira sobre el centro del dial (no se sale del svg)', dentro);

    ok('sin canvas en la página', await page.evaluate(() => document.querySelectorAll('canvas').length === 0));

    /* la tarea larga de carga (layout inicial del documento) se anota, no se
       suspende: la referencia es que el SCROLL no genere jank sostenido */
    const carga = await page.evaluate(() => window.__longtasks || []);
    resultados.push({ prueba: 'tareas largas en la carga (informativo)', ok: true, detalle: carga });

    await page.evaluate(() => { window.__longtasks.length = 0; });
    for (let y = 0; y < 12; y++) {
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(260);
    }
    await page.waitForTimeout(600);
    const enScroll = (await page.evaluate(() => window.__longtasks || [])).filter(t => t.dur > 120);
    ok('sin tareas largas durante el scroll (ni una por frame)', enScroll.length === 0, enScroll);

    await page.screenshot({ path: path.join(CAPS, 'hero-1440.png') });
    await page.close();
  }

  /* ---------- 2. aviso de cookies: el botón cierra de verdad ---------- */
  {
    const page = await nuevaPagina(browser);
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(600);
    const visible = await page.locator('.cookie-banner').isVisible();
    ok('el aviso de cookies aparece en la primera visita', visible);
    await page.locator('.cookie-ack').click();
    await page.waitForTimeout(350);
    const estado = await page.evaluate(() => {
      const b = document.querySelector('.cookie-banner');
      return { hidden: b.hidden, display: getComputedStyle(b).display, alto: b.offsetHeight };
    });
    ok('el botón cierra el aviso ([hidden] gana al display:flex)',
      estado.hidden && estado.display === 'none' && estado.alto === 0, estado);

    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(600);
    ok('el aviso no vuelve tras aceptarlo', !(await page.locator('.cookie-banner').isVisible()));
    await page.close();
  }

  /* ---------- 3. mapa bajo consentimiento, sin API key ---------- */
  {
    const page = await nuevaPagina(browser);
    const peticionesGoogle = [];
    page.on('request', r => { if (/maps\.google|google\.[a-z.]+\/maps/.test(r.url())) peticionesGoogle.push(r.url()); });
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    ok('sin iframe de mapa antes del clic', await page.evaluate(() => !document.querySelector('.map-consent iframe')));
    ok('sin peticiones a Google Maps antes del clic', peticionesGoogle.length === 0, peticionesGoogle);

    await page.locator('[data-map-btn]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.locator('[data-map-btn]').click();
    await page.waitForTimeout(1200);
    const src = await page.evaluate(() => {
      const f = document.querySelector('.map-consent iframe');
      return f ? f.getAttribute('src') : null;
    });
    ok('tras el clic se inserta el iframe del mapa', !!src);
    ok('el embed no usa API key', src && src.includes('output=embed') && !/key=/.test(src), src);
    ok('el embed apunta al nombre y la dirección reales',
      src && /Rivand/.test(decodeURIComponent(src)) && /Fomento/.test(decodeURIComponent(src)));
    await page.close();
  }

  /* ---------- 4. reduced-motion: la aguja ya está puesta ---------- */
  {
    const page = await nuevaPagina(browser, { reducedMotion: 'reduce' });
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(700);   // mucho antes de que acabase ninguna animación
    const r = await page.evaluate(() => {
      const ag = document.querySelector('.hero .d-aguja');
      const ocultos = [...document.querySelectorAll('.chars .car, .reveal')]
        .filter(e => parseFloat(getComputedStyle(e).opacity) < 0.9).length;
      return { matrix: getComputedStyle(ag).transform, ocultos, lenis: document.documentElement.className };
    });
    ok('con reduced-motion la aguja aparece ya en su sitio', angulo(r.matrix) === ((Q - 1) * 90) % 360,
      { grados: angulo(r.matrix), esperado: ((Q - 1) * 90) % 360 });
    ok('con reduced-motion no queda nada invisible', r.ocultos === 0, r.ocultos);
    ok('con reduced-motion no se activa el smooth scroll', !/lenis/.test(r.lenis), r.lenis);
    await page.screenshot({ path: path.join(CAPS, 'reduced-motion.png') });
    await page.close();
  }

  /* ---------- 5. sticky-stack: el dial avanza de tarjeta en tarjeta ---------- */
  {
    const page = await nuevaPagina(browser);
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await page.locator('.cookie-ack').click();
    const pasos = [];
    const lis = await page.locator('.stack-li').count();
    for (let i = 0; i < lis; i++) {
      await page.evaluate(n => {
        const li = document.querySelectorAll('.stack-li')[n];
        window.scrollTo({ top: li.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.30, behavior: 'instant' });
      }, i);
      await page.waitForTimeout(900);
      pasos.push(await page.evaluate(() => ({
        n: document.querySelector('[data-serv-n]').textContent.trim(),
        on: [...document.querySelectorAll('.d-paso')].findIndex(p => p.classList.contains('on')) + 1,
        matriz: getComputedStyle(document.querySelector('[data-dial-pasos] .d-aguja')).transform
      })));
    }
    const contadores = pasos.map(p => p && p.n);
    ok('el contador de servicios recorre 01..0' + lis, contadores.join(',') === ['01', '02', '03', '04', '05', '06'].slice(0, lis).join(','), contadores);
    const marcas = pasos.map(p => p && p.on);
    ok('el dial en miniatura ilumina el paso de cada tarjeta',
      marcas.every((m, i) => m === i + 1), marcas);
    const angulos = pasos.map(p => angulo(p.matriz));
    ok('la aguja del dial en miniatura avanza con cada tarjeta',
      angulos.every((a, i) => i === 0 || a > angulos[i - 1]) && angulos[0] === 0, angulos);
    await page.screenshot({ path: path.join(CAPS, 'stack-1440.png') });
    await page.close();
  }

  /* ---------- 6. contadores y marquee ---------- */
  {
    const page = await nuevaPagina(browser);
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    await page.locator('.cookie-ack').click();
    const x1 = await page.evaluate(() => getComputedStyle(document.querySelector('[data-marquee]')).transform);
    await page.waitForTimeout(900);
    const x2 = await page.evaluate(() => getComputedStyle(document.querySelector('[data-marquee]')).transform);
    ok('el marquee de trimestres se mueve', x1 !== x2, { x1, x2 });

    await page.locator('#opiniones').scrollIntoViewIfNeeded();
    await page.waitForTimeout(2200);
    const val = await page.evaluate(() => document.querySelector('[data-contador][data-a="5"]').textContent.trim());
    ok('el contador de valoración acaba en 5,0 (el dato real)', val === '5,0', val);

    await page.locator('#contacto').scrollIntoViewIfNeeded();
    await page.waitForTimeout(2500);
    const tel = await page.evaluate(() => document.querySelector('.esfera-tel').textContent.trim());
    ok('el contador del teléfono acaba en el número real', tel === '981 32 95 64', tel);
    await page.screenshot({ path: path.join(CAPS, 'contacto-1440.png') });
    await page.close();
  }

  /* ---------- 7. WhatsApp pendiente: no se finge que funciona ---------- */
  {
    const page = await nuevaPagina(browser);
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(900);
    await page.locator('.cookie-ack').click();
    const hrefs = await page.evaluate(() => [...document.querySelectorAll('[data-wa]')].map(a => a.getAttribute('href')));
    ok('los CTA de WhatsApp llevan un marcador único y greppable',
      hrefs.length > 0 && hrefs.every(h => h.includes('NUMERO-PENDIENTE')), hrefs);
    await page.locator('.hero-cta [data-wa]').click();
    await page.waitForTimeout(400);
    ok('al pulsar WhatsApp se explica que el enlace está pendiente',
      await page.evaluate(() => document.getElementById('dlg-wa').open));
    await page.evaluate(() => document.getElementById('dlg-wa').close());

    const tels = await page.evaluate(() => [...document.querySelectorAll('a[href^="tel:"]')].map(a => a.getAttribute('href')));
    ok('los enlaces de teléfono usan el número real confirmado',
      tels.length > 0 && tels.every(h => h === 'tel:+34981329564'), tels);
    await page.close();
  }

  /* ---------- 8. diálogos legales y menú móvil ---------- */
  {
    const page = await nuevaPagina(browser, { viewport: { width: 400, height: 860 } });
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(900);
    await page.locator('.cookie-ack').click();
    await page.waitForTimeout(300);
    await page.locator('.menu-btn').click();
    await page.waitForTimeout(400);
    ok('el menú móvil abre', await page.locator('.menu').isVisible());
    await page.locator('.menu a[href="#contacto"]').click();
    await page.waitForTimeout(700);
    ok('el menú móvil cierra al navegar', !(await page.locator('.menu').isVisible()));

    for (const id of ['dlg-aviso', 'dlg-privacidad', 'dlg-cookies']) {
      await page.evaluate(i => document.querySelector('[data-dialog="' + i + '"]').click(), id);
      await page.waitForTimeout(250);
      const abierto = await page.evaluate(i => document.getElementById(i).open, id);
      ok('el diálogo ' + id + ' abre', abierto);
      await page.evaluate(i => document.getElementById(i).close(), id);
    }
    await page.close();
  }

  /* ---------- 9. 400 px: sin scroll lateral y el dial entero ---------- */
  {
    const page = await nuevaPagina(browser, { viewport: { width: 400, height: 860 } });
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(4200);
    await page.locator('.cookie-ack').click();
    await page.waitForTimeout(400);

    const scroll = await page.evaluate(() => ({
      ancho: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth
    }));
    ok('a 400 px no hay scroll horizontal', scroll.ancho <= scroll.viewport + 1, scroll);

    const dial = await page.evaluate(() => {
      const svg = document.querySelector('.hero [data-dial]');
      const r = svg.getBoundingClientRect();
      /* el bbox real del contenido dibujado, etiquetas incluidas */
      const b = svg.getBBox();
      const vb = svg.viewBox.baseVal;
      return {
        izq: Math.round(r.left), der: Math.round(r.right), ancho: Math.round(r.width),
        vp: document.documentElement.clientWidth,
        contenidoDentro: b.x >= vb.x - 0.5 && b.x + b.width <= vb.x + vb.width + 0.5 &&
                         b.y >= vb.y - 0.5 && b.y + b.height <= vb.y + vb.height + 0.5
      };
    });
    ok('a 400 px el dial se reduce pero cabe entero', dial.izq >= 0 && dial.der <= dial.vp, dial);
    ok('nada del dial queda fuera de su viewBox (ni etiquetas ni marcas)', dial.contenidoDentro, dial);

    const desbordan = await page.evaluate(() => {
      const w = document.documentElement.clientWidth;
      const recortado = el => {
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          const o = getComputedStyle(p).overflowX;
          if (o === 'hidden' || o === 'clip' || o === 'auto' || o === 'scroll') return true;
        }
        return false;
      };
      return [...document.querySelectorAll('body *')]
        .filter(e => {
          const r = e.getBoundingClientRect();
          return r.width > 0 && (r.right > w + 1 || r.left < -1) && !recortado(e);
        })
        .slice(0, 8).map(e => {
          const c = e.className.baseVal !== undefined ? e.className.baseVal : e.className;
          return e.tagName + '.' + String(c).split(' ')[0];
        });
    });
    ok('ningún elemento sin recortar se sale por los lados a 400 px', desbordan.length === 0, desbordan);

    await page.screenshot({ path: path.join(CAPS, 'hero-400.png') });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(CAPS, 'pie-400.png') });
    await page.close();
  }

  /* ---------- 10. sin JS: la página sigue legible ---------- */
  {
    const page = await nuevaPagina(browser, { javaScriptEnabled: false });
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(900);
    const r = await page.evaluate ? null : null;
    const invisibles = await page.$$eval('h1, h2, .tarjeta, .cal-item, .esfera',
      els => els.filter(e => parseFloat(getComputedStyle(e).opacity) < 0.9).length);
    ok('sin JS no queda contenido oculto', invisibles === 0, invisibles);
    const texto = await page.textContent('body');
    ok('sin JS siguen el teléfono y la dirección', /981 32 95 64/.test(texto) && /Fomento, 21/.test(texto));
    await page.screenshot({ path: path.join(CAPS, 'sin-js.png') });
    await page.close();
  }

  /* ---------- 11. horario: arcos de 24 h calculados ---------- */
  {
    const page = await nuevaPagina(browser);
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(900);
    const arcos = await page.evaluate(() => [...document.querySelectorAll('.hr-arco')].map(c => ({
      banda: c.getAttribute('data-arco'),
      dash: c.getAttribute('stroke-dasharray'),
      off: c.getAttribute('stroke-dashoffset')
    })));
    const C = 2 * Math.PI * 30;
    const bien = arcos.every(a => {
      const [d, h] = a.banda.split(',').map(Number);
      return Math.abs(parseFloat(a.dash) - (h - d) / 24 * C) < 0.5 &&
             Math.abs(parseFloat(a.off) + d / 24 * C) < 0.5;
    });
    ok('los anillos de horario dibujan las bandas reales de apertura', arcos.length === 3 && bien, arcos);
    const ahora = await page.textContent('[data-ahora]');
    ok('se indica si está abierto o cerrado ahora mismo', /Abierto ahora|Cerrado ahora/.test(ahora), ahora);
    await page.close();
  }

  /* ---------- 12. honestidad de los datos ---------- */
  {
    const page = await nuevaPagina(browser);
    await page.goto(BASE, { waitUntil: 'load' });
    const texto = await page.textContent('body');
    const pendientes = await page.$$eval('.pend', e => e.map(x => x.textContent.trim()));
    ok('los marcadores de dato pendiente están a la vista', pendientes.length >= 12, pendientes.length);
    ok('la valoración real 5,0 se muestra', /5,0/.test(texto));
    ok('la reseña real se reproduce entera y literal',
      /Acabo de cambiarme a esta gestoría/.test(texto) &&
      /dedicándome tiempo y atención/.test(texto) &&
      /Gracias Esther/.test(texto));
    ok('la reseña lleva su autora y su fecha', /Ta Mi/.test(texto) && /octubre de 2025/.test(texto));
    /* no se dice cuántas reseñas hay, pero tampoco se insinúa que sean muchas */
    const inflado = texto.match(/(\d+|decenas|cientos|miles|muchos|multitud)\s+(de\s+)?(reseñas|opiniones|valoraciones|clientes)/gi) || [];
    ok('no se declara ni se insinúa ningún número de reseñas', inflado.length === 0, inflado);
    ok('sin lenguaje de prueba social masiva',
      !/(nuestros|cientos de|miles de)\s+clientes\s+(satisfechos|contentos)/i.test(texto));
    ok('no hay precios inventados', !/\d+\s*€|\beuros\b/i.test(texto));
    ok('la dirección lleva la planta y la puerta', /Fomento, 21/.test(texto) && /2º puerta 4/.test(texto));
    ok('las fechas del calendario están marcadas para confirmar',
      /CONFIRMAR FECHAS CON LA ASESORÍA/.test(texto));
    ok('la lista de servicios está marcada para confirmar',
      /CONFIRMAR CON LA ASESORÍA/.test(texto));
    ok('el logotipo se declara provisional', /provisional/i.test(texto));
    ok('las fotos se declaran de ambiente, no del local',
      /no es el despacho|no del local|ambiente/i.test(texto));
    await page.close();
  }

  /* ---------- informe ---------- */
  await browser.close();
  const fallos = resultados.filter(r => !r.ok);
  fs.writeFileSync(path.join(__dirname, 'verify-report.json'),
    JSON.stringify({ fecha: new Date().toISOString(), total: resultados.length, fallos: fallos.length, resultados }, null, 1));

  resultados.forEach(r => console.log((r.ok ? 'OK   ' : 'FALLA') + '  ' + r.prueba +
    (r.ok || r.detalle === null ? '' : '   -> ' + JSON.stringify(r.detalle))));
  console.log('\n' + (resultados.length - fallos.length) + '/' + resultados.length + ' pruebas pasan');
  process.exit(fallos.length ? 1 : 0);
})();
