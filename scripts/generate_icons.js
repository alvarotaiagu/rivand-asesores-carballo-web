/* Rasteriza icon.svg a los PNG de PWA y compone og.png sobre azul noche.
   NODE_PATH=<ruta node_modules> node scripts/generate_icons.js  (con el server en :8971) */
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.RIV_URL || 'http://127.0.0.1:8971/';
const OUT = path.join(__dirname, '..', 'assets', 'img', 'logo');

(async () => {
  const b = await chromium.launch();
  for (const size of [96, 180, 192, 512]) {
    const p = await b.newPage({ viewport: { width: size, height: size } });
    await p.goto(BASE);
    await p.setContent(`<body style="margin:0"><img src="${BASE}assets/img/logo/icon.svg" width="${size}" height="${size}"></body>`);
    await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(OUT, `icon-${size}.png`), omitBackground: false });
    await p.close();
  }
  const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await p.goto(BASE);
  await p.setContent(`<body style="margin:0;height:630px;background:#1B2430;display:grid;place-items:center">
    <div style="display:grid;place-items:center;gap:34px">
      <img src="${BASE}assets/img/logo/logo-claro.svg" width="620">
      <p style="margin:0;font:400 21px/1 'IBM Plex Mono',monospace;letter-spacing:.34em;color:#C08552;text-transform:uppercase">Que no se te pase ni un plazo</p>
    </div></body>`);
  await p.waitForTimeout(600);
  await p.screenshot({ path: path.join(OUT, 'og.png') });
  await b.close();
  console.log('iconos y og listos');
})();
