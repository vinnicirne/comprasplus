/**
 * scripts/prepare-www.js
 * Prepara a pasta www para o Capacitor e compilação do APK
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const wwwDir = path.join(rootDir, 'www');

if (!fs.existsSync(wwwDir)) {
  fs.mkdirSync(wwwDir, { recursive: true });
}

// Arquivos a serem copiados
const filesToCopy = [
  'index.html',
  'app.js',
  'db.js',
  'admob.js',
  'env.js',
  'style.css',
  'manifest.json',
  'sw.js'
];

for (const file of filesToCopy) {
  const src = path.join(rootDir, file);
  const dest = path.join(wwwDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

// Copia pasta icons
const iconsSrc = path.join(rootDir, 'icons');
const iconsDest = path.join(wwwDir, 'icons');
if (fs.existsSync(iconsSrc)) {
  if (!fs.existsSync(iconsDest)) {
    fs.mkdirSync(iconsDest, { recursive: true });
  }
  const icons = fs.readdirSync(iconsSrc);
  for (const icon of icons) {
    fs.copyFileSync(path.join(iconsSrc, icon), path.join(iconsDest, icon));
  }
}

console.log('✅ Pasta www preparada com sucesso para o Capacitor!');
