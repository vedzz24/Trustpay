import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generate() {
  const svgPath = path.join(__dirname, 'guardx-icon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  // 192x192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(__dirname, 'icon-192.png'));
  console.log('✓ icon-192.png generated');

  // 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(__dirname, 'icon-512.png'));
  console.log('✓ icon-512.png generated');

  // Apple touch icon 180x180
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(__dirname, 'apple-touch-icon.png'));
  console.log('✓ apple-touch-icon.png generated');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
