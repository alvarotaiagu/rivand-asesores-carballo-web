/* Busca en Pexels y arma hojas de contacto etiquetadas para elegir a ojo.
   NODE_PATH=/c/Users/alvar/node_modules node scripts/buscar_pexels.js "query1" "query2" ... */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'busqueda');
fs.mkdirSync(OUT, { recursive: true });
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36';

(async () => {
  const queries = process.argv.slice(2);
  for (const q of queries) {
    const slug = q.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1400, height: 2200 }, locale: 'en-US' });
    const page = await ctx.newPage();
    try {
      await page.goto('https://www.pexels.com/search/' + encodeURIComponent(q) + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(9000);
      await page.mouse.wheel(0, 1600);
      await page.waitForTimeout(3500);
      const items = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('img[src*="images.pexels.com/photos/"]').forEach(img => {
          const m = img.src.match(/\/photos\/(\d+)\//);
          if (!m) return;
          const alt = (img.alt || '').slice(0, 80);
          if (!out.find(o => o.id === m[1])) out.push({ id: m[1], alt, thumb: img.src });
        });
        return out.slice(0, 24);
      });
      fs.writeFileSync(path.join(OUT, slug + '.json'), JSON.stringify(items, null, 1));
      console.log(q, '->', items.length, 'resultados');
    } catch (e) {
      console.log(q, 'FALLO', e.message);
    }
    await browser.close();
  }
})();
