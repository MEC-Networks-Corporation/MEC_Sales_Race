export const PALETTE = ['#ff5a3c', '#2d8cff', '#9b5cff', '#27d07a', '#ffb000', '#ff3b9d', '#00c6c0', '#ff7a00'];
export const PCT_CAP = 999;

// 0–100% maps to the main straight; anything past 100% compresses into a short
// "overdrive" zone past the finish line so huge overachievers never run off-track.
export function leftFor(p) {
  const min = 4, max = 84;
  if (p <= 100) return min + (Math.max(0, p) / 100) * (max - min);
  const bonusMax = 94;
  const overshoot = Math.min(p - 100, 200);
  return max + (overshoot / 200) * (bonusMax - max);
}

export function tierFor(p) {
  if (p >= 150) return 'mvp';
  if (p >= 100) return 'done';
  if (p >= 70) return 'warm';
  return '';
}

export function initials(n) {
  return (n || '').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

export function adaptSizing(n) {
  // Smooth continuous scaling — no hard jumps between breakpoints.
  // t ramps from 0 (≤5 people) to 1 (≥20 people).
  const t = Math.min(1, Math.max(0, (n - 5) / 15));

  // Head (face circle): 88 px → 42 px
  const head = Math.round(88 - t * 46);

  // Lane height: 134 px → 82 px, with a floor so the pct badge
  // (positioned above the racer centre) doesn't collide with the name plate.
  const lane = Math.max(Math.round(134 - t * 52), head + 68);

  // Car scale: always full size for readability.
  const scale = 1;

  return { head: head + 'px', lane: lane + 'px', scale };
}

export function carSVG(color) {
  return `<svg width="104" height="52" viewBox="0 0 104 52" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="52" cy="47" rx="46" ry="5" fill="rgba(0,0,0,.22)"/>
    <circle cx="28" cy="40" r="12" fill="#1a1a1a"/><circle cx="28" cy="40" r="5" fill="#d9d9d9"/><circle cx="28" cy="40" r="2" fill="#888"/>
    <circle cx="78" cy="40" r="12" fill="#1a1a1a"/><circle cx="78" cy="40" r="5" fill="#d9d9d9"/><circle cx="78" cy="40" r="2" fill="#888"/>
    <path d="M8 38 Q6 20 26 20 L36 11 Q44 5 60 8 L74 16 Q96 17 98 33 L98 38 Q98 43 92 43 L14 43 Q8 43 8 38 Z" fill="${color}"/>
    <path d="M37 14 Q45 8 58 11 L70 18 L44 18 Q37 18 37 14 Z" fill="rgba(255,255,255,.65)"/>
    <rect x="8" y="29" width="90" height="5" rx="2.5" fill="rgba(255,255,255,.45)"/>
    <circle cx="94" cy="30" r="5" fill="#fff8c4" stroke="#fff" stroke-width="1.5"/>
  </svg>`;
}

// March–May: a pointed-nose surfboard carving through a curling wave.
export function surfboardSVG(color) {
  return `<svg width="104" height="52" viewBox="0 0 104 52" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="52" cy="47" rx="46" ry="5" fill="rgba(0,0,0,.18)"/>
    <path d="M6 46 C2 36 6 22 22 18 C34 15 42 22 40 30 C38 36 28 34 24 40 C20 46 12 48 6 46 Z" fill="#1f9fe0"/>
    <path d="M22 18 C34 15 42 22 40 30" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="30" cy="19" r="2" fill="rgba(255,255,255,.65)"/>
    <circle cx="38" cy="25" r="1.6" fill="rgba(255,255,255,.55)"/>
    <path d="M16 24 Q55 14 96 26 Q55 38 16 32 Q10 28 16 24 Z" fill="${color}"/>
    <path d="M24 28 Q55 25 90 26" stroke="rgba(255,255,255,.6)" stroke-width="1.5" fill="none"/>
    <path d="M19 31 L26 31 L22 39 Z" fill="#15171c" opacity=".75"/>
  </svg>`;
}

// December: Santa's sleigh — curled runner tip, flat blade, boxy seat back.
export function sleighSVG(color) {
  return `<svg width="104" height="52" viewBox="0 0 104 52" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="52" cy="47" rx="46" ry="5" fill="rgba(0,0,0,.22)"/>
    <path d="M6 42 Q4 40 8 40 L92 40 Q96 40 94 42 Q90 46 84 46 L14 46 Q8 46 6 42 Z" fill="#c9a227"/>
    <path d="M10 40 Q4 40 4 34 Q4 24 16 16 Q24 10 34 14 L88 14 Q96 14 96 22 L96 34 Q96 40 88 40 L10 40 Z" fill="${color}"/>
    <rect x="38" y="18" width="46" height="5" rx="2.5" fill="rgba(255,255,255,.5)"/>
    <circle cx="26" cy="12" r="4" fill="#ffe27a"/>
    <circle cx="19" cy="19" r="2.6" fill="#ff3b3b"/>
  </svg>`;
}

// Which vehicle the race track shows this month — a seasonal reskin of the racer.
export function seasonalVehicle(date = new Date()) {
  const month = date.getMonth() + 1; // 1-12
  if (month >= 3 && month <= 5) return 'surfboard';
  if (month === 12) return 'sleigh';
  return 'car';
}

export function vehicleSVG(color, date) {
  const vehicle = seasonalVehicle(date);
  if (vehicle === 'surfboard') return surfboardSVG(color);
  if (vehicle === 'sleigh') return sleighSVG(color);
  return carSVG(color);
}

export function visibleTeam(team, currentFilter) {
  const list = currentFilter === '__ALL__' ? team.slice() : team.filter((m) => m.team === currentFilter);
  return list.sort((a, b) => b.pct - a.pct);
}

// ---- CSV ----
export function csvEscape(v) {
  v = String(v == null ? '' : v);
  return /[,"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

export function downloadCSV(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadTemplate() {
  downloadCSV('quota-template.csv', 'name,team,percentage,color\n');
}

export function exportRoster(team) {
  const header = 'name,team,percentage,color\n';
  const body = team.map((m) => [csvEscape(m.name), csvEscape(m.team || ''), m.pct, m.color || ''].join(',')).join('\n');
  downloadCSV('race-to-quota-export.csv', header + body + '\n');
}

export function parseCSV(text) {
  // Strip a UTF-8 BOM — spreadsheet apps prepend one when exporting "CSV UTF-8".
  text = text.replace(/^﻿/, '');
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '');
  if (!lines.length) return { rows: [], skipped: 0 };

  // Auto-detect the delimiter — many spreadsheet apps export CSV with ';' instead
  // of ',' under non-US locale settings, which would otherwise silently mangle
  // every row into one giant "name" field.
  const delimiter = [',', ';', '\t'].reduce(
    (best, d) => { const count = lines[0].split(d).length - 1; return count > best.count ? { d, count } : best; },
    { d: ',', count: -1 },
  ).d;

  const split = (l) => {
    const out = [];
    let cur = '', q = false;
    for (const c of l) {
      if (c === '"') q = !q;
      else if (c === delimiter && !q) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const header = split(lines[0]).map((h) => h.toLowerCase());
  const hasHeader = header.some((h) => ['name', 'team', 'percentage', 'percent', '%', 'color', 'quota'].includes(h));
  let idx = { name: 0, team: 1, pct: 2, color: 3 };
  if (hasHeader) {
    idx = {
      name: header.indexOf('name'),
      team: header.indexOf('team'),
      pct: ['percentage', 'percent', '%', 'quota'].map((k) => header.indexOf(k)).find((x) => x >= 0),
      color: header.indexOf('color'),
    };
    if (idx.pct === undefined) idx.pct = -1;
  }
  const start = hasHeader ? 1 : 0;
  const res = [];
  let skipped = 0;
  for (let i = start; i < lines.length; i++) {
    const c = split(lines[i]);
    const name = (idx.name >= 0 ? c[idx.name] : c[0]) || '';
    if (!name) { skipped++; continue; }
    const pctRaw = (idx.pct >= 0 ? c[idx.pct] : c[2]) || '0';
    const pct = Math.max(0, Math.min(PCT_CAP, parseInt(String(pctRaw).replace('%', ''), 10) || 0));
    let color = (idx.color >= 0 ? c[idx.color] : '') || '';
    if (color && !/^#[0-9a-f]{3,6}$/i.test(color)) color = '';
    res.push({ name, team: (idx.team >= 0 ? c[idx.team] : '') || '', pct, color: color || undefined });
  }
  return { rows: res, skipped };
}
