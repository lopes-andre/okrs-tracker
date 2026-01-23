/**
 * Script to generate PNG icons from SVG
 * Run with: node scripts/generate-icons.js
 *
 * Requires: npm install sharp
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('Sharp not installed. Installing...');
  require('child_process').execSync('npm install sharp --save-dev', { stdio: 'inherit' });
  sharp = require('sharp');
}

const sizes = [16, 32, 64, 128, 192, 512];
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// SVG template for the icon
const createSvg = (size) => {
  const radius = Math.round(size * 0.1875); // ~18.75% corner radius
  const strokeWidth = Math.max(2, Math.round(size * 0.052));
  const center = size / 2;
  const outerRadius = Math.round(size * 0.25);
  const middleRadius = Math.round(size * 0.125);
  const innerRadius = Math.round(size * 0.042);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="#2563EB"/>
  <circle cx="${center}" cy="${center}" r="${outerRadius}" fill="none" stroke="white" stroke-width="${strokeWidth}"/>
  <circle cx="${center}" cy="${center}" r="${middleRadius}" fill="none" stroke="white" stroke-width="${strokeWidth}"/>
  <circle cx="${center}" cy="${center}" r="${innerRadius}" fill="white"/>
</svg>`;
};

async function generateIcons() {
  console.log('Generating icons...');

  for (const size of sizes) {
    const svg = createSvg(size);
    const outputPath = path.join(iconsDir, `icon-${size}.png`);

    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);

    console.log(`  Created: icon-${size}.png`);
  }

  // Also create apple-touch-icon
  const appleSvg = createSvg(180);
  await sharp(Buffer.from(appleSvg))
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  console.log('  Created: apple-touch-icon.png');

  // Create favicon.ico (using 32x32)
  const favicon32 = createSvg(32);
  await sharp(Buffer.from(favicon32))
    .png()
    .toFile(path.join(__dirname, '..', 'public', 'favicon.png'));
  console.log('  Created: favicon.png');

  console.log('\nDone! Icons generated in public/icons/');
}

generateIcons().catch(console.error);
