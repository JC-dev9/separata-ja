/**
 * Gera os ícones da app a partir do SVG oficial da logo.
 *
 * A variante "Claro" (#E5EEFC) é a usada em todo o lado porque a app é toda
 * escura. A variante "Escuro" (#0E1E2F) existe para materiais sobre fundo
 * claro e não é consumida aqui.
 *
 * Correr apenas quando a logo mudar:
 *
 *   npm install --no-save sharp
 *   node scripts/generate-icons.js
 *
 * `sharp` não é dependência do projeto de propósito — só é preciso para esta
 * tarefa pontual e é pesado (binários nativos).
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const SRC_SVG = path.join(ROOT, 'assets/Logos Separata/Logo Claro.svg');
// A logo completa (marca + "SEPARATA JA") já vem exportada na cor certa e com
// fundo transparente, por isso é copiada tal e qual — o SVG dela traz as fontes
// embutidas como glifos e não sobrevive bem à rasterização.
const SRC_FULL_PNG = path.join(ROOT, 'assets/Logos Separata/Completo Claro.png');
const OUT = path.join(ROOT, 'assets/images');

const BG = '#0E1E2F'; // colors.background
const LIGHT = '#E5EEFC'; // colors.text

const svgRaw = fs.readFileSync(SRC_SVG, 'utf8');

// Recolore o SVG trocando o fill declarado no bloco <style>.
function recolor(hex) {
  return Buffer.from(svgRaw.replace(new RegExp(LIGHT, 'gi'), hex));
}

// Rasteriza a logo com uma altura alvo, preservando a proporção.
function renderLogo(hex, targetHeight) {
  return sharp(recolor(hex), { density: 900 })
    .resize({ height: targetHeight, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

// Compõe a logo centrada num canvas quadrado.
async function compose({ size, logoHeightRatio, hex, background, out, opaque }) {
  const logo = await renderLogo(hex, Math.round(size * logoHeightRatio));
  const meta = await sharp(logo).metadata();

  let canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: background ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite([
    {
      input: logo,
      left: Math.round((size - meta.width) / 2),
      top: Math.round((size - meta.height) / 2),
    },
  ]);

  // A App Store rejeita ícones com canal alfa, mesmo totalmente opaco.
  if (opaque) canvas = canvas.flatten({ background: BG }).removeAlpha();

  await canvas.png().toFile(path.join(OUT, out));
  console.log(`  ${out.padEnd(32)} ${size}x${size}`);
}

(async () => {
  console.log('A gerar ícones a partir de "Logo Claro.svg":\n');

  await compose({
    size: 1024,
    logoHeightRatio: 0.72,
    hex: LIGHT,
    background: BG,
    opaque: true,
    out: 'icon.png',
  });

  // Adaptive icon Android: o sistema corta as bordas, por isso a logo fica
  // dentro da zona segura (~66% central), mas com menos margem visual.
  await compose({
    size: 1024,
    logoHeightRatio: 0.56,
    hex: LIGHT,
    out: 'android-icon-foreground.png',
  });

  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: BG } })
    .png()
    .toFile(path.join(OUT, 'android-icon-background.png'));
  console.log(`  ${'android-icon-background.png'.padEnd(32)} 1024x1024`);

  // Ícone temático do Android 13+: silhueta branca sobre transparente.
  await compose({
    size: 1024,
    logoHeightRatio: 0.56,
    hex: '#FFFFFF',
    out: 'android-icon-monochrome.png',
  });

  // Splash: o fundo vem do expo-splash-screen, a logo fica transparente.
  await compose({
    size: 1024,
    logoHeightRatio: 0.82,
    hex: LIGHT,
    out: 'splash-icon.png',
  });

  // Splash a sério — a logo completa, com o nome. É esta que o app.json usa.
  fs.copyFileSync(SRC_FULL_PNG, path.join(OUT, 'splash-logo.png'));
  console.log(`  ${'splash-logo.png'.padEnd(32)} (cópia de "Completo Claro.png")`);

  await compose({
    size: 48,
    logoHeightRatio: 0.72,
    hex: LIGHT,
    background: BG,
    opaque: true,
    out: 'favicon.png',
  });

  console.log('\nConcluído.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
