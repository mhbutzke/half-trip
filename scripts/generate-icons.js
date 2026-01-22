import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputFile = path.join(__dirname, '../public/icon.svg');
const outputDir = path.join(__dirname, '../public/icons');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log('Generating PWA icons...');

  for (const size of sizes) {
    const outputFile = path.join(outputDir, `icon-${size}x${size}.png`);

    await sharp(inputFile)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 20, g: 184, b: 166, alpha: 1 }, // #14b8a6
      })
      .png()
      .toFile(outputFile);

    console.log(`✓ Generated ${size}x${size} icon`);
  }

  // Also generate apple-touch-icon
  const appleTouchIcon = path.join(__dirname, '../public/apple-touch-icon.png');
  await sharp(inputFile)
    .resize(180, 180, {
      fit: 'contain',
      background: { r: 20, g: 184, b: 166, alpha: 1 },
    })
    .png()
    .toFile(appleTouchIcon);

  console.log('✓ Generated apple-touch-icon.png');

  // Generate favicon
  const favicon = path.join(__dirname, '../public/favicon.ico');
  await sharp(inputFile)
    .resize(32, 32, {
      fit: 'contain',
      background: { r: 20, g: 184, b: 166, alpha: 1 },
    })
    .png()
    .toFile(favicon);

  console.log('✓ Generated favicon.ico');

  console.log('\n✅ All icons generated successfully!');
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
