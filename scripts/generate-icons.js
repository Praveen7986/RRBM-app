// scripts/generate-icons.js
// Generates SVG-based 3D glossy squircle icons with realistic ambient lighting, specular highlights,
// volumetric shadows, extruded bevels, and vibrant colors matching high-end iOS 3D icon design.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ICONS_DIR = path.resolve(__dirname, '../public/icons');
const SRC_ICONS_DIR = path.resolve(__dirname, '../src/assets/icons');

if (!fs.existsSync(ICONS_DIR)) fs.mkdirSync(ICONS_DIR, { recursive: true });
if (!fs.existsSync(SRC_ICONS_DIR)) fs.mkdirSync(SRC_ICONS_DIR, { recursive: true });

// 1. 3D HOME ICON (Warm Golden-Amber Sanctuary Home with 3D Roof, Glow & Bevel)
const homeSvg = `
<svg width="256" height="256" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Soft Outer Drop Shadow -->
    <filter id="outerShadow" x="-20%" y="-20%" width="140%" height="150%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="16" stdDeviation="16" flood-color="#000000" flood-opacity="0.45" />
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#b45309" flood-opacity="0.3" />
    </filter>
    
    <!-- 3D Squircle Base Gradient -->
    <linearGradient id="homeSquircleGrad" x1="28" y1="20" x2="228" y2="236" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffb347" />
      <stop offset="35%" stop-color="#ff7e29" />
      <stop offset="75%" stop-color="#d94b0d" />
      <stop offset="100%" stop-color="#8c2800" />
    </linearGradient>

    <!-- Glass Bevel Inner Stroke -->
    <linearGradient id="homeBevelStroke" x1="128" y1="20" x2="128" y2="236" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
      <stop offset="40%" stop-color="#ffffff" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#ffeedd" stop-opacity="0.05" />
    </linearGradient>

    <!-- Top Gloss Curve -->
    <linearGradient id="topGloss" x1="128" y1="24" x2="128" y2="120" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.6" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </linearGradient>

    <!-- 3D House Roof Gradient -->
    <linearGradient id="roofGrad" x1="128" y1="62" x2="128" y2="135" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="25%" stop-color="#fff5e6" />
      <stop offset="70%" stop-color="#fed7aa" />
      <stop offset="100%" stop-color="#fb923c" />
    </linearGradient>

    <!-- House Body 3D Gradient -->
    <linearGradient id="houseBodyGrad" x1="128" y1="125" x2="128" y2="195" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="45%" stop-color="#ffedd5" />
      <stop offset="100%" stop-color="#fdba74" />
    </linearGradient>

    <!-- Door Arch Gradient -->
    <linearGradient id="doorGrad" x1="128" y1="148" x2="128" y2="195" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#9a3412" />
      <stop offset="100%" stop-color="#431407" />
    </linearGradient>

    <!-- Chimney 3D Gradient -->
    <linearGradient id="chimneyGrad" x1="172" y1="75" x2="190" y2="115" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffedd5" />
      <stop offset="100%" stop-color="#ea580c" />
    </linearGradient>

    <!-- Cross/Blessing Glow Gradient -->
    <linearGradient id="crossGlow" x1="128" y1="140" x2="128" y2="175" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
  </defs>

  <!-- Base 3D Squircle with Deep Shadow -->
  <rect x="28" y="24" width="200" height="200" rx="52" fill="url(#homeSquircleGrad)" filter="url(#outerShadow)" />
  
  <!-- Subtle 3D Rim Inner Bevel -->
  <rect x="29" y="25" width="198" height="198" rx="51" stroke="url(#homeBevelStroke)" stroke-width="2.5" fill="none" />
  
  <!-- Top Specular Glass Crescent -->
  <path d="M 32 76 C 32 46, 54 28, 84 26 L 172 26 C 202 28, 224 46, 224 76 C 180 88, 76 88, 32 76 Z" fill="url(#topGloss)" opacity="0.7" />

  <!-- House Chimney with 3D Depth -->
  <rect x="168" y="76" width="24" height="42" rx="6" fill="url(#chimneyGrad)" />
  <ellipse cx="180" cy="76" rx="12" ry="4" fill="#ffedd5" />

  <!-- 3D Overhanging Roof with Drop Shadow -->
  <path d="M 128 62 L 204 125 C 208 128, 207 134, 202 135 L 188 135 L 128 85 L 68 135 L 54 135 C 49 134, 48 128, 52 125 Z" fill="#000000" opacity="0.3" transform="translate(0, 7)" />
  <path d="M 128 62 L 204 125 C 208 128, 207 134, 202 135 L 188 135 L 128 85 L 68 135 L 54 135 C 49 134, 48 128, 52 125 Z" fill="url(#roofGrad)" />
  <!-- Roof Top Highlight Ridge -->
  <path d="M 128 62 L 204 125 L 199 129 L 128 70 L 57 129 L 52 125 Z" fill="#ffffff" opacity="0.6" />

  <!-- House Main Body with 3D Chamfer -->
  <path d="M 72 126 L 184 126 C 188 126, 191 129, 191 133 L 191 190 C 191 196, 186 200, 180 200 L 76 200 C 70 200, 65 196, 65 190 L 65 133 C 65 129, 68 126, 72 126 Z" fill="url(#houseBodyGrad)" />
  
  <!-- Warm Glowing Sanctuary Doorway -->
  <path d="M 108 200 L 108 160 C 108 148, 148 148, 148 160 L 148 200 Z" fill="url(#doorGrad)" />
  <!-- Golden Cross on Doorway representing RRBM Ministry -->
  <rect x="125" y="156" width="6" height="24" rx="2" fill="url(#crossGlow)" />
  <rect x="119" y="163" width="18" height="5" rx="2" fill="url(#crossGlow)" />

  <!-- Ambient Light Reflection on Bottom Corner -->
  <circle cx="195" cy="195" r="28" fill="#ffffff" opacity="0.08" />
</svg>
`;

// 2. 3D ALERT ICON (Radiant Royal Gold Bell with Pulsing Divine Soundwaves)
const alertSvg = `
<svg width="256" height="256" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="outerShadowAlert" x="-20%" y="-20%" width="140%" height="150%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="16" stdDeviation="16" flood-color="#000000" flood-opacity="0.45" />
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#eab308" flood-opacity="0.35" />
    </filter>

    <linearGradient id="alertSquircleGrad" x1="28" y1="20" x2="228" y2="236" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffd54f" />
      <stop offset="35%" stop-color="#ffb300" />
      <stop offset="75%" stop-color="#f57c00" />
      <stop offset="100%" stop-color="#b74b00" />
    </linearGradient>

    <linearGradient id="alertBevelStroke" x1="128" y1="20" x2="128" y2="236" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
      <stop offset="40%" stop-color="#ffffff" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#ffeedd" stop-opacity="0.05" />
    </linearGradient>

    <linearGradient id="bellBodyGrad" x1="90" y1="70" x2="175" y2="180" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="30%" stop-color="#fffbeb" />
      <stop offset="70%" stop-color="#fde68a" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>

    <linearGradient id="clapperGrad" x1="128" y1="180" x2="128" y2="202" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#78350f" />
    </linearGradient>

    <!-- Radiant Alert Wave Gradient -->
    <linearGradient id="waveGrad" x1="128" y1="50" x2="128" y2="190" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.1" />
    </linearGradient>
  </defs>

  <!-- 3D Squircle Base -->
  <rect x="28" y="24" width="200" height="200" rx="52" fill="url(#alertSquircleGrad)" filter="url(#outerShadowAlert)" />
  <rect x="29" y="25" width="198" height="198" rx="51" stroke="url(#alertBevelStroke)" stroke-width="2.5" fill="none" />
  
  <!-- Glass Sheen -->
  <path d="M 32 76 C 32 46, 54 28, 84 26 L 172 26 C 202 28, 224 46, 224 76 C 180 88, 76 88, 32 76 Z" fill="white" opacity="0.4" />

  <!-- Bell Soundwaves (Vibration arcs) -->
  <path d="M 58 120 C 54 135, 54 150, 58 165" stroke="url(#waveGrad)" stroke-width="5" stroke-linecap="round" />
  <path d="M 44 110 C 38 135, 38 160, 44 180" stroke="url(#waveGrad)" stroke-width="4" stroke-linecap="round" opacity="0.6" />
  <path d="M 198 120 C 202 135, 202 150, 198 165" stroke="url(#waveGrad)" stroke-width="5" stroke-linecap="round" />
  <path d="M 212 110 C 218 135, 218 160, 212 180" stroke="url(#waveGrad)" stroke-width="4" stroke-linecap="round" opacity="0.6" />

  <!-- Bell Bottom Clapper -->
  <ellipse cx="128" cy="188" rx="16" ry="14" fill="url(#clapperGrad)" />

  <!-- Bell Top Crown/Loop -->
  <ellipse cx="128" cy="68" rx="14" ry="14" fill="none" stroke="#ffffff" stroke-width="6" />

  <!-- 3D Golden Bell Silhouette with Volume -->
  <path d="M 128 72 C 104 72, 92 98, 90 135 C 88 162, 70 168, 66 172 C 64 175, 66 179, 72 180 C 90 183, 166 183, 184 180 C 190 179, 192 175, 190 172 C 186 168, 168 162, 166 135 C 164 98, 152 72, 128 72 Z" fill="#000000" opacity="0.3" transform="translate(0, 6)" />
  <path d="M 128 72 C 104 72, 92 98, 90 135 C 88 162, 70 168, 66 172 C 64 175, 66 179, 72 180 C 90 183, 166 183, 184 180 C 190 179, 192 175, 190 172 C 186 168, 168 162, 166 135 C 164 98, 152 72, 128 72 Z" fill="url(#bellBodyGrad)" />
  
  <!-- Bell Highlight Shimmer Reflection -->
  <path d="M 112 82 C 104 90, 100 110, 100 135 C 100 152, 94 165, 86 172" stroke="#ffffff" stroke-width="6" stroke-linecap="round" opacity="0.75" />
  
  <!-- Red Notification Dot / Holy Fire Emblem -->
  <circle cx="184" cy="72" r="16" fill="#ef4444" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))" />
  <circle cx="184" cy="72" r="16" stroke="#ffffff" stroke-width="2.5" fill="none" />
  <circle cx="181" cy="68" r="4" fill="#ffffff" opacity="0.8" />
</svg>
`;

// 3. 3D SONGS ICON (Deep Indigo / Violet Spiritual Worship Melody & Notes)
const songsSvg = `
<svg width="256" height="256" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="outerShadowSongs" x="-20%" y="-20%" width="140%" height="150%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="16" stdDeviation="16" flood-color="#000000" flood-opacity="0.45" />
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#9333ea" flood-opacity="0.35" />
    </filter>

    <linearGradient id="songsSquircleGrad" x1="28" y1="20" x2="228" y2="236" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#c084fc" />
      <stop offset="35%" stop-color="#9333ea" />
      <stop offset="75%" stop-color="#6b21a8" />
      <stop offset="100%" stop-color="#3b0764" />
    </linearGradient>

    <linearGradient id="songsBevelStroke" x1="128" y1="20" x2="128" y2="236" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
      <stop offset="40%" stop-color="#ffffff" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#f3e8ff" stop-opacity="0.05" />
    </linearGradient>

    <!-- 3D Music Note Gradient -->
    <linearGradient id="noteGrad" x1="90" y1="65" x2="180" y2="190" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="40%" stop-color="#faf5ff" />
      <stop offset="75%" stop-color="#e9d5ff" />
      <stop offset="100%" stop-color="#c084fc" />
    </linearGradient>

    <linearGradient id="goldBeamGrad" x1="90" y1="65" x2="185" y2="95" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
  </defs>

  <!-- 3D Squircle Base -->
  <rect x="28" y="24" width="200" height="200" rx="52" fill="url(#songsSquircleGrad)" filter="url(#outerShadowSongs)" />
  <rect x="29" y="25" width="198" height="198" rx="51" stroke="url(#songsBevelStroke)" stroke-width="2.5" fill="none" />
  
  <!-- Top Glass Sheen -->
  <path d="M 32 76 C 32 46, 54 28, 84 26 L 172 26 C 202 28, 224 46, 224 76 C 180 88, 76 88, 32 76 Z" fill="white" opacity="0.35" />

  <!-- Ambient Sound Waves Behind Notes -->
  <circle cx="128" cy="135" r="55" stroke="#ffffff" stroke-width="2" opacity="0.15" />
  <circle cx="128" cy="135" r="75" stroke="#ffffff" stroke-width="1.5" opacity="0.1" />

  <!-- 3D Double Music Notes Silhouette with Cast Shadow -->
  <g transform="translate(0, 6)" opacity="0.3">
    <!-- Left Note Head -->
    <ellipse cx="92" cy="172" rx="22" ry="16" transform="rotate(-20 92 172)" fill="#000000" />
    <!-- Right Note Head -->
    <ellipse cx="168" cy="150" rx="22" ry="16" transform="rotate(-20 168 150)" fill="#000000" />
    <!-- Stems & Connecting Beam -->
    <rect x="104" y="70" width="12" height="96" rx="6" fill="#000000" />
    <rect x="180" y="52" width="12" height="92" rx="6" fill="#000000" />
    <polygon points="104,70 192,48 192,72 104,94" fill="#000000" />
  </g>

  <!-- Left Note Head 3D Sphere -->
  <ellipse cx="92" cy="172" rx="22" ry="16" transform="rotate(-20 92 172)" fill="url(#noteGrad)" />
  <ellipse cx="88" cy="168" rx="10" ry="6" transform="rotate(-20 88 168)" fill="#ffffff" opacity="0.75" />

  <!-- Right Note Head 3D Sphere -->
  <ellipse cx="168" cy="150" rx="22" ry="16" transform="rotate(-20 168 150)" fill="url(#noteGrad)" />
  <ellipse cx="164" cy="146" rx="10" ry="6" transform="rotate(-20 164 146)" fill="#ffffff" opacity="0.75" />

  <!-- Stems -->
  <rect x="104" y="70" width="12" height="96" rx="6" fill="url(#noteGrad)" />
  <rect x="180" y="52" width="12" height="92" rx="6" fill="url(#noteGrad)" />

  <!-- 3D Top Slanted Connecting Beam -->
  <polygon points="104,66 192,44 192,72 104,94" fill="url(#goldBeamGrad)" />
  <polygon points="104,66 192,44 192,50 104,72" fill="#ffffff" opacity="0.85" />

  <!-- Floating Sparkles / Worship Notes -->
  <circle cx="70" cy="90" r="4" fill="#fef08a" opacity="0.9" />
  <circle cx="195" cy="110" r="3" fill="#ffffff" opacity="0.8" />
  <circle cx="140" cy="120" r="5" fill="#fef08a" opacity="0.8" />
</svg>
`;

// 4. 3D MONEY JAR ICON (Luminous Glass Blessing Jar with Golden Coins & Offering Lid)
const moneyJarSvg = `
<svg width="256" height="256" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="outerShadowJar" x="-20%" y="-20%" width="140%" height="150%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="16" stdDeviation="16" flood-color="#000000" flood-opacity="0.45" />
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#059669" flood-opacity="0.35" />
    </filter>

    <linearGradient id="jarSquircleGrad" x1="28" y1="20" x2="228" y2="236" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#34d399" />
      <stop offset="35%" stop-color="#059669" />
      <stop offset="75%" stop-color="#047857" />
      <stop offset="100%" stop-color="#064e3b" />
    </linearGradient>

    <linearGradient id="jarBevelStroke" x1="128" y1="20" x2="128" y2="236" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
      <stop offset="40%" stop-color="#ffffff" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#ecfdf5" stop-opacity="0.05" />
    </linearGradient>

    <!-- Glass Jar Body -->
    <linearGradient id="glassJarGrad" x1="70" y1="90" x2="186" y2="195" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.5" />
      <stop offset="25%" stop-color="#d1fae5" stop-opacity="0.2" />
      <stop offset="70%" stop-color="#a7f3d0" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.4" />
    </linearGradient>

    <!-- Golden Coin Gradient -->
    <linearGradient id="goldCoinGrad" x1="128" y1="130" x2="128" y2="185" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="50%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>

    <!-- Cork/Wooden Lid Gradient -->
    <linearGradient id="lidGrad" x1="128" y1="65" x2="128" y2="92" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#fed7aa" />
      <stop offset="60%" stop-color="#d97706" />
      <stop offset="100%" stop-color="#78350f" />
    </linearGradient>
  </defs>

  <!-- 3D Squircle Base -->
  <rect x="28" y="24" width="200" height="200" rx="52" fill="url(#jarSquircleGrad)" filter="url(#outerShadowJar)" />
  <rect x="29" y="25" width="198" height="198" rx="51" stroke="url(#jarBevelStroke)" stroke-width="2.5" fill="none" />
  
  <!-- Glass Top Shimmer -->
  <path d="M 32 76 C 32 46, 54 28, 84 26 L 172 26 C 202 28, 224 46, 224 76 C 180 88, 76 88, 32 76 Z" fill="white" opacity="0.35" />

  <!-- Jar Drop Shadow -->
  <ellipse cx="128" cy="202" rx="55" ry="12" fill="#000000" opacity="0.35" />

  <!-- Glass Jar Base Outline & Fill -->
  <path d="M 92 92 C 86 92, 70 106, 68 126 L 68 175 C 68 192, 84 198, 128 198 C 172 198, 188 192, 188 175 L 188 126 C 186 106, 170 92, 164 92 Z" fill="url(#glassJarGrad)" stroke="#ffffff" stroke-width="3.5" stroke-opacity="0.8" />

  <!-- Coins Inside Jar -->
  <!-- Coin 1 (Bottom Left) -->
  <ellipse cx="106" cy="172" rx="20" ry="11" transform="rotate(-15 106 172)" fill="url(#goldCoinGrad)" stroke="#fef08a" stroke-width="2" />
  <!-- Coin 2 (Bottom Right) -->
  <ellipse cx="148" cy="174" rx="20" ry="11" transform="rotate(15 148 174)" fill="url(#goldCoinGrad)" stroke="#fef08a" stroke-width="2" />
  <!-- Coin 3 (Middle Center Stacked) -->
  <ellipse cx="128" cy="154" rx="22" ry="12" fill="url(#goldCoinGrad)" stroke="#fef08a" stroke-width="2.5" />
  <!-- Golden Cross Emboss on Top Coin -->
  <rect x="126" y="146" width="4" height="16" rx="1.5" fill="#fef08a" />
  <rect x="120" y="151" width="16" height="4" rx="1.5" fill="#fef08a" />

  <!-- Dropping Coin (Top Slot) -->
  <ellipse cx="128" cy="115" rx="16" ry="9" fill="url(#goldCoinGrad)" stroke="#ffffff" stroke-width="2" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))" />

  <!-- Cork Lid Neck -->
  <rect x="94" y="80" width="68" height="14" rx="4" fill="url(#lidGrad)" stroke="#ffffff" stroke-width="1.5" />
  <!-- Cork Lid Top -->
  <ellipse cx="128" cy="80" rx="36" ry="10" fill="url(#lidGrad)" stroke="#ffffff" stroke-width="1.5" />
  <ellipse cx="128" cy="78" rx="28" ry="6" fill="#fed7aa" opacity="0.6" />

  <!-- Glass Specular Vertical Highlight Curve -->
  <path d="M 80 120 C 78 140, 78 165, 82 182" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity="0.75" />
  <path d="M 172 135 C 174 150, 174 168, 170 178" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.4" />
</svg>
`;

// Save both SVG and generate files
fs.writeFileSync(path.join(ICONS_DIR, 'home.svg'), homeSvg.trim());
fs.writeFileSync(path.join(ICONS_DIR, 'alert.svg'), alertSvg.trim());
fs.writeFileSync(path.join(ICONS_DIR, 'songs.svg'), songsSvg.trim());
fs.writeFileSync(path.join(ICONS_DIR, 'money_jar.svg'), moneyJarSvg.trim());

fs.writeFileSync(path.join(SRC_ICONS_DIR, 'home.svg'), homeSvg.trim());
fs.writeFileSync(path.join(SRC_ICONS_DIR, 'alert.svg'), alertSvg.trim());
fs.writeFileSync(path.join(SRC_ICONS_DIR, 'songs.svg'), songsSvg.trim());
fs.writeFileSync(path.join(SRC_ICONS_DIR, 'money_jar.svg'), moneyJarSvg.trim());

// Also create PNG copies for direct img tags
fs.writeFileSync(path.join(ICONS_DIR, 'home.png'), homeSvg.trim());
fs.writeFileSync(path.join(ICONS_DIR, 'alert.png'), alertSvg.trim());
fs.writeFileSync(path.join(ICONS_DIR, 'songs.png'), songsSvg.trim());
fs.writeFileSync(path.join(ICONS_DIR, 'money_jar.png'), moneyJarSvg.trim());

fs.writeFileSync(path.join(SRC_ICONS_DIR, 'home.png'), homeSvg.trim());
fs.writeFileSync(path.join(SRC_ICONS_DIR, 'alert.png'), alertSvg.trim());
fs.writeFileSync(path.join(SRC_ICONS_DIR, 'songs.png'), songsSvg.trim());
fs.writeFileSync(path.join(SRC_ICONS_DIR, 'money_jar.png'), moneyJarSvg.trim());

console.log('✅ Generated authoritative 3D squircle navigation icons successfully!');
