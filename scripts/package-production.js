// scripts/package-production.js
// Automated script to create small, clean deployment ZIP packages without node_modules

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'dist-packages');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('🚀 Step 1: Building production bundle with Vite...');
execSync('npm run build', { cwd: ROOT_DIR, stdio: 'inherit' });

console.log('\n📦 Step 2: Creating clean production distribution bundle (dist + server)...');
const prodDistTemp = path.join(OUTPUT_DIR, 'rrbm-prod-bundle');
if (fs.existsSync(prodDistTemp)) {
  fs.rmSync(prodDistTemp, { recursive: true, force: true });
}
fs.mkdirSync(prodDistTemp, { recursive: true });

// Copy dist, server, start scripts, package.json, README, .env.example
function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(child => {
      copyRecursive(path.join(src, child), path.join(dest, child));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

copyRecursive(path.join(ROOT_DIR, 'dist'), path.join(prodDistTemp, 'dist'));
copyRecursive(path.join(ROOT_DIR, 'server'), path.join(prodDistTemp, 'server'));
fs.copyFileSync(path.join(ROOT_DIR, 'start-rrbm-production.bat'), path.join(prodDistTemp, 'start-rrbm-production.bat'));
fs.copyFileSync(path.join(ROOT_DIR, 'start-rrbm-production.sh'), path.join(prodDistTemp, 'start-rrbm-production.sh'));
fs.copyFileSync(path.join(ROOT_DIR, 'package.json'), path.join(prodDistTemp, 'package.json'));
fs.copyFileSync(path.join(ROOT_DIR, 'README.md'), path.join(prodDistTemp, 'README.md'));
fs.copyFileSync(path.join(ROOT_DIR, '.env.example'), path.join(prodDistTemp, '.env.example'));

// Generate ZIPs using PowerShell on Windows or zip on Linux
const prodZipPath = path.join(OUTPUT_DIR, 'rrbm-production-dist.zip');
const sourceZipPath = path.join(OUTPUT_DIR, 'rrbm-source-package.zip');

if (fs.existsSync(prodZipPath)) fs.unlinkSync(prodZipPath);
if (fs.existsSync(sourceZipPath)) fs.unlinkSync(sourceZipPath);

try {
  // Compress production dist
  console.log('Compressing rrbm-production-dist.zip...');
  execSync(`powershell -Command "Compress-Archive -Path '${prodDistTemp}\\*' -DestinationPath '${prodZipPath}' -Force"`, { cwd: ROOT_DIR });

  // Clean temp folder
  fs.rmSync(prodDistTemp, { recursive: true, force: true });

  // Compress Source Package (Excluding node_modules, dist, dist-packages, .git, .vscode)
  console.log('\n📦 Step 3: Creating clean source code package (Excluding node_modules & cache)...');
  const sourceTemp = path.join(OUTPUT_DIR, 'rrbm-source-temp');
  if (fs.existsSync(sourceTemp)) fs.rmSync(sourceTemp, { recursive: true, force: true });
  fs.mkdirSync(sourceTemp, { recursive: true });

  const includeItems = [
    'src',
    'public',
    'server',
    'scripts',
    'index.html',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'vite.config.ts',
    '.env.example',
    'README.md',
    'start-rrbm-production.bat',
    'start-rrbm-production.sh'
  ];

  includeItems.forEach(item => {
    const srcPath = path.join(ROOT_DIR, item);
    const destPath = path.join(sourceTemp, item);
    copyRecursive(srcPath, destPath);
  });

  execSync(`powershell -Command "Compress-Archive -Path '${sourceTemp}\\*' -DestinationPath '${sourceZipPath}' -Force"`, { cwd: ROOT_DIR });
  fs.rmSync(sourceTemp, { recursive: true, force: true });

  const prodSize = (fs.statSync(prodZipPath).size / (1024 * 1024)).toFixed(2);
  const srcSize = (fs.statSync(sourceZipPath).size / (1024 * 1024)).toFixed(2);

  console.log('\n========================================================');
  console.log('🎉 RRBM PRODUCTION PACKAGES GENERATED SUCCESSFULLY!');
  console.log('========================================================');
  console.log(`1. Production Distribution: ${prodZipPath} (${prodSize} MB)`);
  console.log(`2. Clean Source Package:    ${sourceZipPath} (${srcSize} MB)`);
  console.log('========================================================');
} catch (err) {
  console.error('Packaging error:', err);
}
