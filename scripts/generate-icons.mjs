import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'public', 'icons');

async function render(srcSvg, outPng, size) {
  const svg = readFileSync(join(iconsDir, srcSvg));
  await sharp(svg).resize(size, size).png().toFile(join(iconsDir, outPng));
  console.log(`wrote ${outPng} (${size}x${size})`);
}

await render('icon.svg', 'icon-192.png', 192);
await render('icon.svg', 'icon-512.png', 512);
await render('icon-maskable.svg', 'icon-maskable-512.png', 512);
