import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import RaceTrack from '../components/RaceTrack';
import { api } from '../lib/api';
import { subscribeToRaceUpdates } from '../lib/echo';

// ---- TV mode auto-scroll (so a long roster isn't cut off on a wallboard) ----
const SCROLL_PX_PER_TICK = 1.1; // ~33px/sec
const SCROLL_TICK_MS = 30;
const SCROLL_PAUSE_MS = 2600; // dwell time at top/bottom

export default function Display() {
  const [team, setTeam] = useState([]);
  const [period, setPeriod] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [currentFilter, setCurrentFilter] = useState('__ALL__');
  const [isTV, setIsTV] = useState(false);
  const autoScroll = useRef({ timer: null, dir: 1, pauseUntil: 0 });

  useEffect(() => {
    let cancelled = false;
    api.getTeam()
      .then((data) => { if (!cancelled) { setTeam(data.team || []); setPeriod(data.period || null); setLoaded(true); } })
      .catch(() => { if (!cancelled) { setLoadError(true); setLoaded(true); } });

    const unsubscribe = subscribeToRaceUpdates((newTeam, newPeriod) => {
      setTeam(newTeam);
      if (newPeriod) setPeriod(newPeriod);
    });
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  const teams = useMemo(() => [...new Set(team.map((m) => m.team).filter(Boolean))].sort(), [team]);

  useEffect(() => {
    if (currentFilter !== '__ALL__' && !teams.includes(currentFilter)) setCurrentFilter('__ALL__');
  }, [teams, currentFilter]);

  function stopAutoScroll() {
    if (autoScroll.current.timer) { clearInterval(autoScroll.current.timer); autoScroll.current.timer = null; }
  }
  function startAutoScroll() {
    stopAutoScroll();
    autoScroll.current.dir = 1;
    autoScroll.current.pauseUntil = Date.now() + SCROLL_PAUSE_MS;
    autoScroll.current.timer = setInterval(() => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) return;
      if (Date.now() < autoScroll.current.pauseUntil) return;
      let next = window.scrollY + autoScroll.current.dir * SCROLL_PX_PER_TICK;
      if (next >= maxScroll) { next = maxScroll; autoScroll.current.dir = -1; autoScroll.current.pauseUntil = Date.now() + SCROLL_PAUSE_MS; }
      else if (next <= 0) { next = 0; autoScroll.current.dir = 1; autoScroll.current.pauseUntil = Date.now() + SCROLL_PAUSE_MS; }
      window.scrollTo(0, next);
    }, SCROLL_TICK_MS);
  }

  useEffect(() => {
    const onFsChange = () => {
      const active = !!document.fullscreenElement;
      setIsTV(active);
      document.body.classList.toggle('tv-mode', active);
      if (active) { window.scrollTo(0, 0); setTimeout(startAutoScroll, 400); }
      else { stopAutoScroll(); window.scrollTo({ top: 0 }); }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => { document.removeEventListener('fullscreenchange', onFsChange); stopAutoScroll(); };
  }, []);

  function toggleTV() {
    if (!document.fullscreenElement) {
      (document.documentElement.requestFullscreen?.() || Promise.reject()).catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }

  const hasTeam = team.length > 0;

  return (
    <div className="wrap">
      <div className="banner">
        <div className="checker" />
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 16px 0' }}>
          <Link to="/admin" className="btn-tv">🔑 Admin Login</Link>
        </div>
        <h1>Race to Quota</h1>
        <div className="sub">🏁 The push to 100% (and beyond) 🏁</div>
        {period && <div className="period">Q{period.quarter} {period.year}</div>}
      </div>

      {loaded && loadError && (
        <div className="empty-state">
          <span className="emoji">📡</span>
          <h2>Can't reach the server</h2>
          <p>The race board couldn't load data. Check that the backend is running and reachable.</p>
        </div>
      )}

      {loaded && !loadError && !hasTeam && (
        <div className="empty-state">
          <span className="emoji">🏎️</span>
          <h2>Waiting for teammates</h2>
          <p>Once an admin adds people to the roster, they'll appear here automatically.</p>
        </div>
      )}

      {loaded && !loadError && hasTeam && (
        <>
          <div className="toolbar">
            <label htmlFor="teamFilter">Show team:</label>
            <select id="teamFilter" value={currentFilter} onChange={(e) => setCurrentFilter(e.target.value)}>
              <option value="__ALL__">All Teams ({team.length})</option>
              {teams.map((t) => (
                <option key={t} value={t}>{t} ({team.filter((m) => m.team === t).length})</option>
              ))}
            </select>
          </div>

          <RaceTrack team={team} currentFilter={currentFilter} />

          <div className="bar">
            <button className="btn-tv" id="tvBtn" onClick={toggleTV}>
              {isTV ? '✕ Exit TV Mode' : '⛶ TV Mode'}
            </button>
          </div>
          <p className="legend" id="legend">
            🟠 Under quota &nbsp; 🟢 100%+ Quota Crushed &nbsp; 🔥 150%+ MVP Club
          </p>
        </>
      )}
    </div>
  );
}
