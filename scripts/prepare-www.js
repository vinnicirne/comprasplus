/**
 * scripts/prepare-www.js
 * Prepara a pasta www para o Capacitor e compilação do APK
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const wwwDir = path.join(rootDir, 'www');

if (!fs.existsSync(wwwDir)) {
  fs.mkdirSync(wwwDir, { recursive: true });
}

const distDir = path.join(rootDir, 'dist');

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  for (const file of files) {
    if (file === '.git' || file === '.github') continue;
    const curSource = path.join(source, file);
    const curTarget = path.join(target, file);
    if (fs.lstatSync(curSource).isDirectory()) {
      copyFolderRecursiveSync(curSource, curTarget);
    } else {
      fs.copyFileSync(curSource, curTarget);
    }
  }
}

if (fs.existsSync(distDir) && fs.existsSync(path.join(distDir, 'index.html'))) {
  copyFolderRecursiveSync(distDir, wwwDir);
  console.log('✅ Pasta www sincronizada com o bundle de produção oficial (dist/)!');
} else {
  // Fallback se dist não foi gerado
  const filesToCopy = ['index.html', 'app.js', 'db.js', 'admob.js', 'env.js', 'style.css', 'manifest.json', 'sw.js'];
  for (const file of filesToCopy) {
    let src = path.join(rootDir, file);
    if (!fs.existsSync(src)) {
      const legacySrc = path.join(rootDir, 'legacy', file);
      if (fs.existsSync(legacySrc)) src = legacySrc;
    }
    const dest = path.join(wwwDir, file);
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
  }
  const iconsSrc = path.join(rootDir, 'icons');
  const iconsDest = path.join(wwwDir, 'icons');
  if (fs.existsSync(iconsSrc)) {
    copyFolderRecursiveSync(iconsSrc, iconsDest);
  }
  console.log('✅ Pasta www preparada via fallback!');
}
