/**
 * scripts/apply-android-assets.js
 * Aplica os icones oficiais e recursos visuais ao projeto Android recem-gerado
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const srcRes = path.join(rootDir, 'resources', 'android', 'res');
const destRes = path.join(rootDir, 'android', 'app', 'src', 'main', 'res');

if (!fs.existsSync(srcRes)) {
  console.warn('⚠️ Pasta de recursos não encontrada:', srcRes);
  process.exit(0);
}

if (!fs.existsSync(destRes)) {
  console.warn('⚠️ Pasta de destino Android res não encontrada:', destRes);
  process.exit(0);
}

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  for (const file of files) {
    const curSource = path.join(source, file);
    const curTarget = path.join(target, file);
    if (fs.lstatSync(curSource).isDirectory()) {
      copyFolderRecursiveSync(curSource, curTarget);
    } else {
      fs.copyFileSync(curSource, curTarget);
    }
  }
}

try {
  // Remove o vetor padrão do Capacitor em drawable-v24 se existir para não sobrepor o ícone real
  const v24Dir = path.join(destRes, 'drawable-v24');
  if (fs.existsSync(v24Dir)) {
    fs.rmSync(v24Dir, { recursive: true, force: true });
    console.log('🗑️ Removido drawable-v24 padrão do Capacitor');
  }

  copyFolderRecursiveSync(srcRes, destRes);
  console.log('✅ Ícones oficiais do Compras Plus aplicados com sucesso em android/app/src/main/res/!');
} catch (err) {
  console.error('Erro ao aplicar assets Android:', err);
}
