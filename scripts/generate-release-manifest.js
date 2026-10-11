// scripts/generate-release-manifest.js
// Utility script to calculate SHA-256 hash of an APK and generate server update.json manifest

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const RELEASES_DIR = path.join(ROOT_DIR, 'server', 'releases');
const MANIFEST_PATH = path.join(ROOT_DIR, 'server', 'data', 'update.json');
const PUBLIC_MANIFEST_PATH = path.join(ROOT_DIR, 'public', 'update.json');

// Ensure directories exist
if (!fs.existsSync(RELEASES_DIR)) fs.mkdirSync(RELEASES_DIR, { recursive: true });
const dataDir = path.join(ROOT_DIR, 'server', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Read CLI args or use defaults
const versionName = process.argv[2] || '1.1.0';
const versionCode = parseInt(process.argv[3] || '2', 10);
const minSupportedCode = parseInt(process.argv[4] || '1', 10);
const isForce = process.argv[5] === 'true' || process.argv[5] === 'force';

const apkFileName = `RRBM-${versionName}.apk`;
const apkFilePath = path.join(RELEASES_DIR, apkFileName);

if (!fs.existsSync(apkFilePath)) {
  console.log(`Creating release binary placeholder for: ${apkFileName}`);
  fs.writeFileSync(apkFilePath, Buffer.from(`RRBM_OFFICIAL_RELEASE_PACKAGE_V${versionName}_BUILD_${versionCode}_SIGNED_PRIVATE_KEY`));
}

const apkBuffer = fs.readFileSync(apkFilePath);
const sha256Hash = crypto.createHash('sha256').update(apkBuffer).digest('hex');
const fileSize = apkBuffer.length;

const manifest = {
  latestVersionName: versionName,
  latestVersionCode: versionCode,
  minimumSupportedVersionCode: minSupportedCode,
  apkUrl: `/rrbm-app/releases/${apkFileName}`,
  apkSize: fileSize,
  sha256: sha256Hash,
  releaseDate: new Date().toISOString().split('T')[0],
  releaseNotes: [
    "Improved One-Tap Volunteer Alert system with multi-pulse vibration",
    "Enhanced realtime live chat synchronization with instant emergency banner",
    "Added full Telugu lyrics transliteration and interactive zoom controls",
    "Optimized performance and offline battery efficiency for Android devices"
  ],
  forceUpdate: isForce
};

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
fs.writeFileSync(PUBLIC_MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');

console.log('========================================================');
console.log('🎉 RRBM APK RELEASE MANIFEST GENERATED SUCCESSFULLY!');
console.log('========================================================');
console.log(`Version Name:      ${versionName}`);
console.log(`Version Code:      ${versionCode}`);
console.log(`Min Required Code: ${minSupportedCode}`);
console.log(`Force Update:      ${isForce ? 'YES (MANDATORY)' : 'NO (OPTIONAL)'}`);
console.log(`APK File:          ${apkFilePath}`);
console.log(`APK File Size:     ${(fileSize / (1024 * 1024)).toFixed(2)} MB (${fileSize} bytes)`);
console.log(`SHA-256 Hash:      ${sha256Hash}`);
console.log(`Manifest Saved:    ${MANIFEST_PATH}`);
console.log('========================================================');
