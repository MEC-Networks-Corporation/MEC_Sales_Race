import { useEffect, useRef } from 'react';
import { adaptSizing, carSVG, initials, leftFor, tierFor, visibleTeam } from '../lib/track';

export default function RaceTrack({ team, currentFilter }) {
  const trackRef = useRef(null);
  const statsRef = useRef(null);

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
          <div class="stat"><div class="stat-num">${leader.pct}%</div><div class="stat-label">🥇 ${leader.name || 'Leader'}</div></div>
        `;
      }
    }

    // Rebuild lanes
    [...trackEl.querySelectorAll('.lane')].forEach((l) => l.remove());
    list.forEach((m, i) => {
      const laneEl = document.createElement('div');
      laneEl.className = 'lane';
      const face = m.photo
        ? `<div class="face" style="background-image:url('${m.photo}')"></div>`
        : `<div class="face">${initials(m.name)}</div>`;
      const rankClass = i === 0 ? 'g1' : i === 1 ? 'g2' : i === 2 ? 'g3' : '';
      const teamTag = m.team ? `<span class="tm">${m.team}</span>` : '';
      const tier = tierFor(m.pct);
      const mvpClass = tier === 'mvp' ? ' mvp' : '';
      const crown = i === 0 && m.pct >= 100 ? `<div class="crown">${tier === 'mvp' ? '👑' : '🏆'}</div>` : '';
      const trailEmoji = m.pct >= 100 ? '🔥' : '💨';
      const pctText = tier === 'mvp' ? `🔥 ${m.pct}%` : `${m.pct}%`;
      laneEl.innerHTML = `<div class="racer${mvpClass}" data-idx="${i}" style="left:18px">
        <div class="speed"><i></i><i></i><i></i></div>
        <div class="puff">${trailEmoji}</div>
        ${crown}
        <div class="pct ${tier}">${pctText}</div>
        <div class="carwrap">${face}<div class="car">${carSVG(m.color)}</div>
        <div class="plate"><span class="rank ${rankClass}">#${i + 1}</span><span class="nm">${m.name || '—'}</span>${teamTag}</div></div></div>`;
      trackEl.appendChild(laneEl);
    });

    // Animate every racer out to its position — this runs on first render and
    // again every time the roster changes (including live updates from the
    // admin), so the board always "re-races" into the new standings.
    const racers = trackEl.querySelectorAll('.racer');
    racers.forEach((r) => {
      const m = list[+r.dataset.idx];
      r.classList.add('racing');
      void r.offsetWidth;
      requestAnimationFrame(() => setTimeout(() => { r.style.left = leftFor(m.pct) + '%'; }, 60));
      setTimeout(() => r.classList.remove('racing'), 2700);
    });
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
