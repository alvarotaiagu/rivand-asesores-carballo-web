/* Capturas rápidas mientras se construye. */
const { chromium } = require('playwright');
const path = require('path');
const BASE = 'http://127.0.0.1:8971/';
const OUT = path.join(__dirname, 'mirar');
require('fs').mkdirSync(OUT, { recursive: true });

(async () => {
  const w = parseInt(process.argv[2] || '1440', 10);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto(BASE, { waitUntil: "load" });
  await p.mouse.move(700, 880);
  await p.waitForTimeout(3600);
  const acc = await p.$('.cookie-ack'); if (acc) await acc.click();
  await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(OUT, `hero-${w}.png`) });
  const secs = ['#servicios', '#calendario', '#asesoria', '#opiniones', '#contacto'];
  for (const s of secs) {
    await p.evaluate(sel => {
      const el = document.querySelector(sel);
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 40, behavior: 'instant' });
    }, s);
    await p.waitForTimeout(1500);
    await p.screenshot({ path: path.join(OUT, `${s.slice(1)}-${w}.png`) });
  }
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(1200);
  await p.screenshot({ path: path.join(OUT, `pie-${w}.png`) });
  console.log('errores:', errs.length ? errs : 'ninguno');
  await b.close();
})();
