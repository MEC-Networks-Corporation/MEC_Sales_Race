import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { adaptSizing, initials, leftFor, tierFor, vehicleSVG, visibleTeam } from '../lib/track';

/** Smoothly count from one number to another with ease-out curve. */
function useCountUp(target, duration = 900) {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const frameRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();
    const diff = target - from;
    fromRef.current = target;

    function tick(now) {
      const elapsed = now - start;
      const raw = Math.min(elapsed / duration, 1);
      const t = 1 - Math.pow(1 - raw, 3);
      setDisplay(Math.round(from + diff * t));
      if (raw < 1) frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [target, duration]);

  return display;
}

/** Smoothly interpolate a number (float) with ease-out cubic. */
function useAnimatedValue(target, duration = 2600) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const frameRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();
    const diff = target - from;
    fromRef.current = target;

    function tick(now) {
      const elapsed = now - start;
      const raw = Math.min(elapsed / duration, 1);
      const t = 1 - Math.pow(1 - raw, 3); // ease-out cubic
      setValue(from + diff * t);
      if (raw < 1) frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [target, duration]);

  return value;
}

function Lane({ m, rank }) {
  const animatedPct = useCountUp(m.pct);
  const animatedLeft = useAnimatedValue(leftFor(m.pct));
  const tier = tierFor(m.pct);
  const isFirst = rank === 0 && m.pct >= 100;
  const [racing, setRacing] = useState(false);
  const prevPctRef = useRef(m.pct);

  // Trigger the racing animation (speed lines + puff) when pct changes.
  useEffect(() => {
    if (m.pct !== prevPctRef.current) {
      prevPctRef.current = m.pct;
      setRacing(true);
      const t = setTimeout(() => setRacing(false), 2700);
      return () => clearTimeout(t);
    }
  }, [m.pct]);

  return (
    <motion.div
      layout
      layoutId={`lane-${m.id}`}
      className="lane"
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
    >
      <div
        className={`racer ${tier === 'mvp' ? 'mvp' : ''} ${racing ? 'racing' : ''}`}
        style={{ left: animatedLeft + '%' }}
      >
        <div className="speed"><i /><i /><i /></div>
        <div className="puff">{m.pct >= 100 ? '🔥' : '💨'}</div>
        <div className="crown" style={{ display: isFirst ? '' : 'none' }}>
          {tier === 'mvp' ? '👑' : '🏆'}
        </div>
        <motion.div
          className={`pct ${tier}`}
          key={`pct-${m.id}-${tier}`}
          initial={false}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 0.4 }}
        >
          {tier === 'mvp' ? `🔥 ${animatedPct}%` : `${animatedPct}%`}
        </motion.div>
        <div className="carwrap">
          <div
            className="face"
            style={m.photo ? { backgroundImage: `url('${m.photo}')` } : undefined}
          >
            {!m.photo && initials(m.name)}
          </div>
          <div className="car" dangerouslySetInnerHTML={{ __html: vehicleSVG(m.color) }} />
          <div className="plate">
            <span className={`rank ${rank === 0 ? 'g1' : rank === 1 ? 'g2' : rank === 2 ? 'g3' : ''}`}>
              #{rank + 1}
            </span>
            <span className="nm">{m.name || '—'}</span>
            {m.team && <span className="tm">{m.team}</span>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const FIXED_HEIGHT_LANES = 4; // lanes visible when track is fixed in TV mode

export default function RaceTrack({ team, currentFilter, isTV }) {
  const statsRef = useRef(null);
  const list = useMemo(() => visibleTeam(team, currentFilter), [team, currentFilter]);
  const { head, lane, scale } = adaptSizing(list.length);
  const useFixedTrack = isTV && list.length > FIXED_HEIGHT_LANES + 1;

  // Stats bar
  useEffect(() => {
    const statsEl = statsRef.current;
    if (!statsEl) return;
    if (!list.length) {
      statsEl.style.display = 'none';
      return;
    }
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
  }, [list]);

  return (
    <>
      <div className="statsbar" id="statsBar" ref={statsRef} style={{ display: 'none' }} />
      <div
        className="track"
        id="track"
        style={{
          '--head': head,
          '--lane': lane,
          '--carscale': scale,
          ...(useFixedTrack ? {
            height: '65vh',
            overflow: 'hidden',
          } : {}),
        }}
      >
        {/* Static decorations — stay fixed, never scroll */}
        <div className="startline" />
        <div className="marker" style={{ left: '25%' }}><span>25%</span></div>
        <div className="marker" style={{ left: '50%' }}><span>50%</span></div>
        <div className="marker" style={{ left: '75%' }}><span>75%</span></div>
        <div className="finishline" />
        <div className="finishflag">100%<br />QUOTA</div>
        <div className="overdrive"><span>OVERDRIVE</span></div>

        {/* Scrollable lane container */}
        <div
          className="track-lanes"
          style={useFixedTrack ? {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingTop: `calc(${head} * 1.35 - ${lane} / 2 + 36px)`,
            paddingBottom: '18px',
          } : undefined}
        >
          <LayoutGroup>
            {list.map((m, rank) => (
              <Lane key={m.id} m={m} rank={rank} />
            ))}
          </LayoutGroup>
        </div>
      </div>
    </>
  );
}
