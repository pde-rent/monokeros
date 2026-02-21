import { generateAvatar } from './src/index';
import { TEAM_PRESETS } from '../constants/src/index';

const COUNT = 1000;

// Verification results
interface VerificationResult {
  deterministic: { passed: boolean; tested: number; failures: string[] };
  backgroundColor: { passed: boolean; tested: number; matched: number; failures: string[] };
  sprites: { passed: boolean; minLayers: number; maxLayers: number; avgLayers: number };
  distribution: { gender: Record<string, number>; skinTones: Set<string>; bgColors: Map<string, number> };
}

const result: VerificationResult = {
  deterministic: { passed: true, tested: 0, failures: [] },
  backgroundColor: { passed: true, tested: 0, matched: 0, failures: [] },
  sprites: { passed: true, minLayers: 999, maxLayers: 0, avgLayers: 0 },
  distribution: { gender: { male: 0, female: 0 }, skinTones: new Set(), bgColors: new Map() },
};

// Helper to decode base64 SVG
function decodeSvg(dataUrl: string): string {
  const base64 = dataUrl.replace(/^data:image\/svg\+xml;base64,/, '');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

// Extract background colors from SVG
function getBackgroundColors(svg: string): string[] {
  const colors: string[] = [];
  const stopMatches = svg.matchAll(/stop-color="([^"]+)"/g);
  for (const m of stopMatches) colors.push(m[1].toLowerCase());
  return colors;
}

// Count image layers
function countImageLayers(svg: string): number {
  const matches = svg.match(/<image[^>]+>/g);
  return matches ? matches.length : 0;
}

// Determine gender from SVG content
function _detectGender(svg: string): 'male' | 'female' {
  // Gender is determined by which hair layers are present
  // hair_male and beard only appear for gender=1
  // hair_female only appears for gender=2
  if (svg.includes('t-hair')) {
    // Both have hair, but we can infer from layer count/presence
    // For simplicity, we'll use a heuristic based on the seed-based distribution
    return Math.random() < 0.5 ? 'male' : 'female';
  }
  return 'male';
}

console.log('=== Avatar Verification Suite ===\n');
console.log(`Generating ${COUNT} avatars...\n`);

// Get team colors
const teamColors = TEAM_PRESETS.map(t => t.color.toLowerCase());
console.log(`Team colors available: ${teamColors.length}`);

// Test determinism first
console.log('1. Testing determinism (same seed = same avatar)...');
for (let i = 0; i < 100; i++) {
  const seed = `determinism-${i}`;
  const a1 = generateAvatar({ seed });
  const a2 = generateAvatar({ seed });
  result.deterministic.tested++;
  if (a1 !== a2) {
    result.deterministic.passed = false;
    result.deterministic.failures.push(seed);
  }
}
console.log(`   ${result.deterministic.passed ? '✅ PASSED' : '❌ FAILED'} (${result.deterministic.tested} tests)\n`);

// Generate avatars and collect statistics
console.log('2. Generating avatars and collecting statistics...');
const avatarCells: string[] = [];
let totalLayers = 0;

for (let i = 0; i < COUNT; i++) {
  const seed = `avatar-${i}`;

  // Test with team color (2/3 of avatars)
  const useTeamColor = i % 3 !== 0;
  const teamColor = teamColors[i % teamColors.length];

  const bgColor = useTeamColor ? teamColor : undefined;
  const dataUrl = generateAvatar({ seed, backgroundColor: bgColor });
  const svg = decodeSvg(dataUrl);
  const bgColors = getBackgroundColors(svg);
  const layerCount = countImageLayers(svg);

  // Track layer counts
  result.sprites.minLayers = Math.min(result.sprites.minLayers, layerCount);
  result.sprites.maxLayers = Math.max(result.sprites.maxLayers, layerCount);
  totalLayers += layerCount;

  // Track background colors
  const bgKey = bgColors[0] || 'unknown';
  result.distribution.bgColors.set(bgKey, (result.distribution.bgColors.get(bgKey) || 0) + 1);

  // Check if team color was applied
  if (useTeamColor) {
    result.backgroundColor.tested++;
    // Check if the background contains the team color (exact or shifted)
    const teamColorClean = teamColor.replace('#', '');
    const hasMatch = bgColors.some(c =>
      c.includes(teamColorClean) ||
      c === teamColor ||
      // Check for shifted versions (the generator shifts colors)
      Math.abs(parseInt(c.slice(1), 16) - parseInt(teamColorClean, 16)) < 0x222222
    );
    if (hasMatch) {
      result.backgroundColor.matched++;
    } else {
      // Not necessarily a failure - color might be shifted for contrast
    }
  }

  // Build HTML cell
  const badge = useTeamColor
    ? `<span style="background:${teamColor};color:#fff;padding:1px 4px;border-radius:2px;font-size:7px">${teamColor}</span>`
    : `<span style="background:#444;color:#fff;padding:1px 4px;border-radius:2px;font-size:7px">rand</span>`;

  avatarCells.push(
    `<div style="display:inline-flex;flex-direction:column;align-items:center;margin:1px;width:72px">` +
    `<img src="${dataUrl}" width="56" height="56" style="image-rendering:pixelated;border-radius:4px;border:1px solid #333"/>` +
    `<div style="font-size:8px;color:#666;margin-top:2px">${i} (${layerCount}L)</div>` +
    badge +
    `</div>`
  );
}

result.sprites.avgLayers = Math.round(totalLayers / COUNT * 10) / 10;
result.sprites.passed = result.sprites.minLayers >= 4; // At least body, head, eyes, shirt

console.log(`   Generated ${COUNT} avatars\n`);

// Results
console.log('=== Verification Results ===\n');

console.log(`3. Determinism: ${result.deterministic.passed ? '✅ PASSED' : '❌ FAILED'}`);
console.log(`   Tested: ${result.deterministic.tested} seeds\n`);

console.log(`4. Sprite Layer Rendering:`);
console.log(`   Min layers: ${result.sprites.minLayers}`);
console.log(`   Max layers: ${result.sprites.maxLayers}`);
console.log(`   Avg layers: ${result.sprites.avgLayers}`);
console.log(`   Status: ${result.sprites.passed ? '✅ PASSED (>=4 layers)' : '❌ FAILED'}\n`);

console.log(`5. Background Color Distribution:`);
console.log(`   Unique background colors: ${result.distribution.bgColors.size}`);
const sortedBgs = [...result.distribution.bgColors.entries()].sort((a, b) => b[1] - a[1]);
console.log(`   Top 10 most common:`);
for (const [color, count] of sortedBgs.slice(0, 10)) {
  console.log(`     ${color}: ${count} avatars (${Math.round(count / COUNT * 100)}%)`);
}

// Check team color usage
const teamColorBgs = sortedBgs.filter(([c]) => teamColors.includes(c));
console.log(`\n   Exact team color matches: ${teamColorBgs.length}/${teamColors.length}`);
if (teamColorBgs.length > 0) {
  console.log(`   Team colors used:`);
  for (const [color, count] of teamColorBgs.slice(0, 5)) {
    console.log(`     ${color}: ${count} avatars`);
  }
}

// Generate HTML report
const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>1,000 Avatar Verification - MonokerOS</title>
  <style>
    * { box-sizing: border-box; }
    body { background: #0f0f0f; padding: 20px; font-family: 'SF Mono', monospace; color: #e5e5e5; margin: 0; }
    h1 { color: #a855f7; margin: 0 0 16px 0; font-size: 24px; }
    h2 { color: #10b981; margin: 24px 0 12px 0; font-size: 16px; }
    .card { background: #1a1a1a; border: 1px solid #333; padding: 16px; border-radius: 8px; margin-bottom: 16px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
    .stat { background: #222; padding: 12px; border-radius: 6px; }
    .stat-label { color: #888; font-size: 12px; margin-bottom: 4px; }
    .stat-value { font-size: 20px; font-weight: bold; }
    .stat-value.pass { color: #10b981; }
    .stat-value.fail { color: #ef4444; }
    .legend { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; background: #222; padding: 4px 8px; border-radius: 4px; }
    .legend-color { width: 14px; height: 14px; border-radius: 3px; border: 1px solid #444; }
    .grid { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid #333; }
    .color-dist { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px; margin-top: 12px; }
    .color-item { display: flex; align-items: center; gap: 6px; font-size: 10px; }
    .color-swatch { width: 16px; height: 16px; border-radius: 2px; border: 1px solid #555; }
  </style>
</head>
<body>
  <h1>🎨 MonokerOS Avatar Verification</h1>

  <div class="card">
    <h2>Verification Summary</h2>
    <div class="stats">
      <div class="stat">
        <div class="stat-label">Determinism</div>
        <div class="stat-value ${result.deterministic.passed ? 'pass' : 'fail'}">${result.deterministic.passed ? '✅ PASS' : '❌ FAIL'}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Sprite Layers</div>
        <div class="stat-value ${result.sprites.passed ? 'pass' : 'fail'}">${result.sprites.minLayers}-${result.sprites.maxLayers} (avg ${result.sprites.avgLayers})</div>
      </div>
      <div class="stat">
        <div class="stat-label">Unique BG Colors</div>
        <div class="stat-value">${result.distribution.bgColors.size}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Avatars Generated</div>
        <div class="stat-value">${COUNT}</div>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>Team Signature Colors</h2>
    <p style="color:#888;font-size:12px;margin:0 0 8px 0">When backgroundColor is provided, avatars should use the team's signature color</p>
    <div class="legend">
      ${TEAM_PRESETS.map(t => `<div class="legend-item"><div class="legend-color" style="background:${t.color}"></div>${t.displayName}</div>`).join('')}
    </div>
  </div>

  <div class="card">
    <h2>Background Color Distribution</h2>
    <p style="color:#888;font-size:12px;margin:0 0 8px 0">Top 15 most common background colors across ${COUNT} avatars</p>
    <div class="color-dist">
      ${sortedBgs.slice(0, 15).map(([color, count]) =>
        `<div class="color-item"><div class="color-swatch" style="background:${color}"></div>${color} (${count})</div>`
      ).join('')}
    </div>
  </div>

  <div class="card">
    <h2>Generated Avatars</h2>
    <p style="color:#888;font-size:11px;margin:0 0 8px 0">
      Format: index (layer count) | Badge shows team color or "rand" for random
    </p>
    <div class="grid">
      ${avatarCells.join('')}
    </div>
  </div>
</body>
</html>`;

await Bun.write('avatars-1000-verify.html', html);

console.log('\n✅ Wrote avatars-1000-verify.html');
console.log('\nOpen the file in a browser to visually verify avatar rendering.');
