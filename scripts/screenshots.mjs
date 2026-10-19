import { chromium } from '@playwright/test';
import { execSync, spawn } from 'node:child_process';
import sharp from 'sharp';
import process from 'node:process';
import { mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'docs', 'screenshots');
const PREVIEW_URL = 'http://localhost:4173';
const MAX_BYTES = 400 * 1024;
const STATIONS_TIMEOUT = 15000;

mkdirSync(OUT_DIR, { recursive: true });

function waitForUrl(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url);
        if (res.ok) return resolve();
      } catch {
        // server not up yet, keep polling
      }
      if (Date.now() > deadline) return reject(new Error(`timed out waiting for ${url}`));
      setTimeout(tick, 300);
    };
    tick();
  });
}

function startPreview() {
  const child = spawn('npm', ['run', 'preview'], { cwd: ROOT, shell: true });
  return { child, ready: waitForUrl(PREVIEW_URL, 20000) };
}

function stopPreview(child) {
  if (process.platform === 'win32') {
    // shell:true wraps npm in cmd.exe on Windows — child.kill() only kills
    // that wrapper, leaving the actual vite preview server listening.
    execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
  } else {
    child.kill();
  }
}

async function waitForStations(page) {
  await page.goto(`${PREVIEW_URL}/radio`, { waitUntil: 'networkidle' });
  try {
    await page.waitForSelector('.station-card', { timeout: STATIONS_TIMEOUT });
  } catch {
    throw new Error('radio-browser.info no respondió a tiempo: la lista de emisoras no cargó');
  }
}

async function shrinkIfNeeded(path) {
  if (statSync(path).size > MAX_BYTES) {
    await sharp(path).png({ quality: 80, compressionLevel: 9 }).toFile(path);
  }
}

async function capture(page, name) {
  const path = join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path });
  await shrinkIfNeeded(path);
  console.log(`[screenshots] wrote ${name}.png`);
}

async function setTheme(page, theme) {
  await page.click(`button[aria-label="Tema ${theme}"]`);
  await page.waitForFunction(
    (t) => document.documentElement.getAttribute('data-theme') === t,
    theme,
  );
}

async function main() {
  execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
  const preview = startPreview();
  await preview.ready;

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      reducedMotion: 'reduce',
      colorScheme: 'dark',
    });
    const page = await context.newPage();

    // a) Radio, dark theme, station list loaded
    await waitForStations(page);
    await capture(page, 'radio');

    // b) Equalizer panel open over Radio
    await page.click('button[aria-label="Ecualizador"]');
    await page.waitForSelector('button[aria-label="Cerrar ecualizador"]');
    await capture(page, 'equalizer');
    await page.click('button[aria-label="Cerrar ecualizador"]');

    // d) Theme variants on Radio
    await capture(page, 'theme-dark');
    await setTheme(page, 'light');
    await capture(page, 'theme-light');
    await setTheme(page, 'neon');
    await capture(page, 'theme-neon');
    await setTheme(page, 'dark');

    await context.close();

    // c) Local player / Favorites, independent of theme state above
    const playerContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      reducedMotion: 'reduce',
      colorScheme: 'dark',
    });
    const playerPage = await playerContext.newPage();
    await playerPage.goto(`${PREVIEW_URL}/`, { waitUntil: 'networkidle' });
    await playerPage.waitForSelector('h2');
    await capture(playerPage, 'player');
    await playerContext.close();

    // e) Mobile viewport of Radio
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      reducedMotion: 'reduce',
      colorScheme: 'dark',
    });
    const mobilePage = await mobileContext.newPage();
    await waitForStations(mobilePage);
    await capture(mobilePage, 'mobile');
    await mobileContext.close();
  } finally {
    await browser.close();
    stopPreview(preview.child);
  }
}

main().catch((err) => {
  console.error(`[screenshots] ${err.message}`);
  process.exitCode = 1;
});
