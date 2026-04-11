import sharp from "sharp";
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "../assets");
mkdirSync(outDir, { recursive: true });

// Stopwatch icon, slate-800 background, white outline timer
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="180" fill="#1e293b"/>

  <!-- Crown/button on top -->
  <rect x="464" y="120" width="96" height="64" rx="16" fill="#94a3b8"/>
  <rect x="432" y="168" width="160" height="40" rx="12" fill="#cbd5e1"/>

  <!-- Outer ring (workout phase color: emerald) -->
  <circle cx="512" cy="576" r="320" fill="none" stroke="#10b981" stroke-width="48"
    stroke-dasharray="1340 670" stroke-dashoffset="0" transform="rotate(-90 512 576)"/>
  <!-- Rest phase arc: amber -->
  <circle cx="512" cy="576" r="320" fill="none" stroke="#f59e0b" stroke-width="48"
    stroke-dasharray="670 1340" stroke-dashoffset="-1340" transform="rotate(-90 512 576)"/>

  <!-- Inner face -->
  <circle cx="512" cy="576" r="264" fill="#0f172a"/>

  <!-- Tick marks -->
  <g stroke="#ffffff" stroke-width="12" stroke-linecap="round">
    <line x1="512" y1="336" x2="512" y2="376"/>
    <line x1="752" y1="576" x2="712" y2="576"/>
    <line x1="512" y1="816" x2="512" y2="776"/>
    <line x1="272" y1="576" x2="312" y2="576"/>
  </g>

  <!-- Clock hands -->
  <line x1="512" y1="576" x2="512" y2="400" stroke="#ffffff" stroke-width="20" stroke-linecap="round"/>
  <line x1="512" y1="576" x2="640" y2="576" stroke="#10b981" stroke-width="20" stroke-linecap="round"/>
  <circle cx="512" cy="576" r="24" fill="#ffffff"/>
</svg>
`;

await sharp(Buffer.from(svg))
  .resize(1024, 1024)
  .png()
  .toFile(resolve(outDir, "icon.png"));

console.log("✓ icon.png (1024x1024)");
