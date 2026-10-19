import { chromium } from '@playwright/test';
import { statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const HTML_PATH = join(ROOT, 'docs', 'social-preview.html');
const OUT_PATH = join(ROOT, 'docs', 'social-preview.png');
const MAX_BYTES = 1024 * 1024;

async function main() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 640 } });
    await page.goto(`file://${HTML_PATH.replace(/\\/g, '/')}`, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: OUT_PATH,
      clip: { x: 0, y: 0, width: 1280, height: 640 },
    });

    const size = statSync(OUT_PATH).size;
    if (size > MAX_BYTES) {
      throw new Error(`social-preview.png is ${size} bytes, over the ${MAX_BYTES} byte limit`);
    }
    console.log(`[social-preview] wrote docs/social-preview.png (${size} bytes)`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(`[social-preview] ${err.message}`);
  process.exitCode = 1;
});
