/**
 * scripts/apply-android-assets.js
 * Aplica os icones oficiais e recursos visuais ao projeto Android recem-gerado
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  // Garante que variables.gradle use compileSdkVersion 35 (Android 15 / Vanilla Ice Cream)
  const varsFile = path.join(rootDir, 'android', 'variables.gradle');
  if (fs.existsSync(varsFile)) {
    let varsContent = fs.readFileSync(varsFile, 'utf8');
    if (varsContent.includes('compileSdkVersion = 34') || !varsContent.includes('compileSdkVersion = 35')) {
      varsContent = varsContent.replace(/compileSdkVersion = \d+/g, 'compileSdkVersion = 35')
                               .replace(/targetSdkVersion = \d+/g, 'targetSdkVersion = 35');
      fs.writeFileSync(varsFile, varsContent, 'utf8');
      console.log('✅ android/variables.gradle atualizado com compileSdkVersion = 35');
    }
  }

  // Garante que AndroidManifest.xml tenha o App ID do AdMob
  const manifestFile = path.join(rootDir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  if (fs.existsSync(manifestFile)) {
    let manifestContent = fs.readFileSync(manifestFile, 'utf8');
    const admobAppId = 'ca-app-pub-2871403878275209~7634642461';
    if (!manifestContent.includes(admobAppId)) {
      const metaTag = `\n        <!-- Google Mobile Ads (AdMob) App ID -->\n        <meta-data\n            android:name="com.google.android.gms.ads.APPLICATION_ID"\n            android:value="${admobAppId}" />\n`;
      manifestContent = manifestContent.replace('</application>', `${metaTag}    </application>`);
      fs.writeFileSync(manifestFile, manifestContent, 'utf8');
      console.log('✅ AndroidManifest.xml atualizado com App ID do AdMob');
    }
  }

  // Garante que o ic_launcher_background.xml use a cor verde esmeralda oficial #059669
  const bgValFile = path.join(destRes, 'values', 'ic_launcher_background.xml');
  if (fs.existsSync(bgValFile)) {
    const valContent = `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#059669</color>\n</resources>\n`;
    fs.writeFileSync(bgValFile, valContent, 'utf8');
  }

  // Garante que strings.xml tenha o nome oficial 'Compras Plus'
  const stringsFile = path.join(destRes, 'values', 'strings.xml');
  if (fs.existsSync(stringsFile)) {
    let stringsContent = fs.readFileSync(stringsFile, 'utf8');
    stringsContent = stringsContent
      .replace(/<string name="app_name">.*?<\/string>/, '<string name="app_name">Compras Plus</string>')
      .replace(/<string name="title_activity_main">.*?<\/string>/, '<string name="title_activity_main">Compras Plus</string>');
    fs.writeFileSync(stringsFile, stringsContent, 'utf8');
    console.log('✅ android strings.xml atualizado com nome Compras Plus');
  }

  // Garante que build.gradle use versionCode 3 e versionName 1.2.0
  const buildGradleFile = path.join(rootDir, 'android', 'app', 'build.gradle');
  if (fs.existsSync(buildGradleFile)) {
    let gradleContent = fs.readFileSync(buildGradleFile, 'utf8');
    gradleContent = gradleContent
      .replace(/versionCode \d+/g, 'versionCode 3')
      .replace(/versionName "[^"]+"/g, 'versionName "1.2.0"');
    fs.writeFileSync(buildGradleFile, gradleContent, 'utf8');
    console.log('✅ android/app/build.gradle atualizado com versionCode 3 e versionName 1.2.0');
  }
} catch (err) {
  console.error('Erro ao aplicar assets Android:', err);
}
