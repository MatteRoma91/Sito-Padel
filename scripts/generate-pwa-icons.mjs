#!/usr/bin/env node
import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const publicDir = join(root, 'public');
const iconsDir = join(publicDir, 'icons');
const logoPath = join(publicDir, 'logo.png');

if (!existsSync(logoPath)) {
  console.error('logo.png not found in public/');
  process.exit(1);
}

if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

await sharp(logoPath)
  .resize(192, 192)
  .png()
  .toFile(join(iconsDir, 'icon-192.png'));

await sharp(logoPath)
  .resize(512, 512)
  .png()
  .toFile(join(iconsDir, 'icon-512.png'));

console.log('PWA icons generated: public/icons/icon-192.png, public/icons/icon-512.png');
