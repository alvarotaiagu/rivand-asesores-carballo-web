const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto('https://alvarotaiagu.github.io/rivand-asesores-carballo-web/', { waitUntil: 'load' });
  await p.mouse.move(700, 880);
  await p.waitForTimeout(5000);
  const acc = await p.$('.cookie-ack'); if (acc) await acc.click();
  await p.waitForTimeout(600);
  await p.screenshot({ path: path.join(__dirname, '..', 'screenshots', 'publicado-1440.png') });
  console.log('errores en vivo:', errs.length ? errs : 'ninguno');
  await b.close();
})();
