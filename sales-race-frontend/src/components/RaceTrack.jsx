import { useEffect, useRef } from 'react';
import { adaptSizing, initials, leftFor, tierFor, vehicleSVG, visibleTeam } from '../lib/track';

// Builds the persistent DOM structure for one racer. Only created once per
// member id — later updates mutate this in place instead of rebuilding it, so
// unrelated racers never get touched (and never re-animate) when one teammate
// changes.
function createLaneEntry(startAtLeft) {
  const laneEl = document.createElement('div');
  laneEl.className = 'lane';

  const racerEl = document.createElement('div');
  racerEl.className = 'racer';
  racerEl.style.left = startAtLeft;

  const speedEl = document.createElement('div');
  speedEl.className = 'speed';
  speedEl.innerHTML = '<i></i><i></i><i></i>';

  const puffEl = document.createElement('div');
  puffEl.className = 'puff';

  const crownEl = document.createElement('div');
  crownEl.className = 'crown';
  crownEl.style.display = 'none';

  const pctEl = document.createElement('div');
  pctEl.className = 'pct';

  const carwrapEl = document.createElement('div');
  carwrapEl.className = 'carwrap';

  const faceEl = document.createElement('div');
  faceEl.className = 'face';

  const carEl = document.createElement('div');
  carEl.className = 'car';

  const plateEl = document.createElement('div');
  plateEl.className = 'plate';

  const rankEl = document.createElement('span');
  rankEl.className = 'rank';

  const nmEl = document.createElement('span');
  nmEl.className = 'nm';

  const tmEl = document.createElement('span');
  tmEl.className = 'tm';
  tmEl.style.display = 'none';

  plateEl.append(rankEl, nmEl, tmEl);
  carwrapEl.append(faceEl, carEl, plateEl);
  racerEl.append(speedEl, puffEl, crownEl, pctEl, carwrapEl);
  laneEl.append(racerEl);

  return { laneEl, racerEl, crownEl, pctEl, puffEl, faceEl, carEl, rankEl, nmEl, tmEl, snapshot: null };
}

function paintContent(entry, m, rank) {
  const tier = tierFor(m.pct);
  entry.racerEl.classList.toggle('mvp', tier === 'mvp');
  entry.pctEl.className = 'pct ' + tier;
  entry.pctEl.textContent = tier === 'mvp' ? `🔥 ${m.pct}%` : `${m.pct}%`;
  entry.puffEl.textContent = m.pct >= 100 ? '🔥' : '💨';

  const rankClass = rank === 0 ? 'g1' : rank === 1 ? 'g2' : rank === 2 ? 'g3' : '';
  entry.rankEl.className = 'rank ' + rankClass;
  entry.rankEl.textContent = `#${rank + 1}`;
  entry.nmEl.textContent = m.name || '—';

  if (m.team) { entry.tmEl.style.display = ''; entry.tmEl.textContent = m.team; }
  else { entry.tmEl.style.display = 'none'; }

  if (rank === 0 && m.pct >= 100) { entry.crownEl.style.display = ''; entry.crownEl.textContent = tier === 'mvp' ? '👑' : '🏆'; }
  else { entry.crownEl.style.display = 'none'; }

  if (m.photo) { entry.faceEl.style.backgroundImage = `url('${m.photo}')`; entry.faceEl.textContent = ''; }
  else { entry.faceEl.style.backgroundImage = ''; entry.faceEl.textContent = initials(m.name); }

  entry.carEl.innerHTML = vehicleSVG(m.color);
}

function animateTo(entry, pct) {
  entry.racerEl.classList.add('racing');
  void entry.racerEl.offsetWidth; // force reflow so the transition kicks in
  requestAnimationFrame(() => setTimeout(() => { entry.racerEl.style.left = leftFor(pct) + '%'; }, 60));
  setTimeout(() => entry.racerEl.classList.remove('racing'), 2700);
}

export default function RaceTrack({ team, currentFilter }) {
  const trackRef = useRef(null);
  const statsRef = useRef(null);
  const lanesRef = useRef(new Map()); // member id -> lane entry, persists across renders

  useEffect(() => {
    const trackEl = trackRef.current;
    const statsEl = statsRef.current;
    if (!trackEl) return;

    const list = visibleTeam(team, currentFilter);

    // Size lanes based on roster length, same breakpoints as the original.
    const { head, lane, scale } = adaptSizing(list.length);
    const root = document.documentElement.style;
    root.setProperty('--head', head);
    root.setProperty('--lane', lane);
    root.setProperty('--carscale', scale);

    // Stats bar
    if (statsEl) {
      if (!list.length) {
        statsEl.style.display = 'none';
      } else {
        const avg = Math.round(list.reduce((s, m) => s + m.pct, 0) / list.length);
        const overCount = list.filter((m) => m.pct >= 100).length;
        const leader = list[0];
        statsEl.style.display = 'flex';
        statsEl.innerHTML = `
          <div class="stat"><div class="stat-num">${avg}%</div><div class="stat-label">Team Average</div></div>
          <div class="stat"><div class="stat-num ${overCount > 0 ? 'gold' : ''}">${overCount}/${list.length}</div><div class="stat-label">Over Quota</div></div>
          <div class="stat"><div class="stat-num">${leader.pct}%</div><div class="stat-label">🥇 <span data-leader-name></span></div></div>
        `;
        statsEl.querySelector('[data-leader-name]').textContent = leader.name || 'Leader';
      }
    }

    const lanes = lanesRef.current;
    const seen = new Set();

    list.forEach((m, rank) => {
      seen.add(m.id);
      let entry = lanes.get(m.id);
      const prev = entry?.snapshot;

      if (!entry) {
        // New teammate — create their lane and drive them in from the start line.
        entry = createLaneEntry('18px');
        trackEl.appendChild(entry.laneEl);
        lanes.set(m.id, entry);
        paintContent(entry, m, rank);
        animateTo(entry, m.pct);
      } else {
        const pctChanged = !prev || prev.pct !== m.pct;
        const otherChanged = !prev || prev.name !== m.name || prev.team !== m.team
          || prev.color !== m.color || prev.photo !== m.photo;
        const rankChanged = !prev || prev.rank !== rank;

        if (pctChanged || otherChanged || rankChanged) paintContent(entry, m, rank);
        // Only move the racer whose percentage actually changed — everyone
        // else keeps their current track position.
        if (pctChanged) animateTo(entry, m.pct);
      }

      entry.snapshot = { pct: m.pct, name: m.name, team: m.team, color: m.color, photo: m.photo, rank };
    });

    // Drop lanes for teammates no longer in the (filtered) list.
    for (const [id, entry] of lanes) {
      if (!seen.has(id)) { entry.laneEl.remove(); lanes.delete(id); }
    }

    // Reorder lane DOM nodes to match current standings. appendChild on an
    // already-attached node just moves it — it doesn't recreate or restart
    // any in-flight CSS transition on the racer inside it.
    list.forEach((m) => trackEl.appendChild(lanes.get(m.id).laneEl));
  }, [team, currentFilter]);

  return (
    <>
      <div className="statsbar" id="statsBar" ref={statsRef} style={{ display: 'none' }} />
      <div className="track" id="track" ref={trackRef}>
        <div className="startline" />
        <div className="marker" style={{ left: '25%' }}><span>25%</span></div>
        <div className="marker" style={{ left: '50%' }}><span>50%</span></div>
        <div className="marker" style={{ left: '75%' }}><span>75%</span></div>
        <div className="finishline" />
        <div className="finishflag">100%<br />QUOTA</div>
        <div className="overdrive"><span>OVERDRIVE</span></div>
      </div>
    </>
  );
}
