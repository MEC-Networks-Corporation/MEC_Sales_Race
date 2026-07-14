import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, setToken } from '../lib/api';
import { PALETTE, downloadTemplate, exportRoster, parseCSV } from '../lib/track';

export default function Admin() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.me()
      .then((data) => setUser(data.user))
      .catch(() => setToken(null))
      .finally(() => setCheckingAuth(false));
  }, []);

  if (checkingAuth) return <div className="wrap"><p style={{ textAlign: 'center', padding: 40 }}>Loading…</p></div>;

  return user ? <Editor user={user} onLogout={() => setUser(null)} /> : <Login onLoggedIn={setUser} />;
}

function Login({ onLoggedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await api.login(email, password);
      setToken(data.token);
      onLoggedIn(data.user);
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap" style={{ maxWidth: 420 }}>
      <div className="banner">
        <div className="checker" />
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 16px 0' }}>
          <Link to="/" className="btn-tv">🏁 View Race</Link>
        </div>
        <h1 style={{ fontSize: 32 }}>Admin Login</h1>
        <div className="sub">Race to Quota</div>
      </div>
      <form onSubmit={handleSubmit} className="empty-state" style={{ textAlign: 'left' }}>
        <label style={{ display: 'block', fontWeight: 800, fontSize: 13, marginBottom: 6 }}>Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          style={inputStyle} autoFocus />
        <label style={{ display: 'block', fontWeight: 800, fontSize: 13, margin: '14px 0 6px' }}>Password</label>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
          style={inputStyle} />
        {error && <p style={{ color: '#c0392b', fontWeight: 700, marginTop: 12 }}>{error}</p>}
        <button className="add" type="submit" disabled={busy} style={{ width: '100%', marginTop: 18 }}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #ccc',
  fontFamily: 'Outfit, sans-serif', fontSize: 14, boxSizing: 'border-box',
};

function Editor({ user, onLogout }) {
  const [team, setTeam] = useState([]);
  const [period, setPeriod] = useState(null);
  const [periodBusy, setPeriodBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [syncNote, setSyncNote] = useState('Loading roster…');
  const [undoLabel, setUndoLabel] = useState(null); // short description of the last change, or null if nothing to undo
  const [undoBusy, setUndoBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [modal, setModal] = useState(null); // {title, body, actions:[{label,onClick,danger}]}
  const [dirty, setDirty] = useState(false); // true if there are draft changes not yet on the TV
  const [publishBusy, setPublishBusy] = useState(false);
  const fileInputRef = useRef(null);
  const photoInputsRef = useRef({});
  const saveTimers = useRef({});
  const rowsContainerRef = useRef(null);

  useEffect(() => {
    api.getDraftTeam().then((data) => {
      setTeam(data.team || []);
      setPeriod(data.period || null);
      setLoaded(true);
      setSyncNote('📝 Editing draft — click Publish to update the TV');
    });
  }, []);

  async function publish() {
    setPublishBusy(true);
    try {
      await api.publish();
      setDirty(false);
      setSyncNote('📺 Published — the TV is now showing this roster');
    } catch (e) {
      setSyncNote('⚠️ Could not publish — check your connection.');
    } finally {
      setPublishBusy(false);
    }
  }

  async function updatePeriod(patch) {
    const next = { ...period, ...patch };
    setPeriod(next);
    setPeriodBusy(true);
    try {
      const { period: saved } = await api.updateSettings(next.period_type, next.quarter, next.month, next.year);
      setPeriod(saved);
      setDirty(true);
    } catch (e) {
      setSyncNote('⚠️ Could not save the period — check your connection.');
    } finally {
      setPeriodBusy(false);
    }
  }

  function scheduleSave(id, patch, label) {
    clearTimeout(saveTimers.current[id]);
    saveTimers.current[id] = setTimeout(async () => {
      try {
        await api.updateMember(id, patch);
        setUndoLabel(label);
        setDirty(true);
      } catch (e) {
        setSyncNote('⚠️ Could not save a change — check your connection.');
      }
    }, 450);
  }

  function updateField(id, field, value) {
    const name = team.find((m) => m.id === id)?.name || 'teammate';
    setTeam((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
    scheduleSave(
      id,
      { [field]: field === 'pct' ? Math.max(0, Math.min(999, parseInt(value || 0, 10) || 0)) : value },
      `edited ${name}`,
    );
  }

  async function addTeammate() {
    try {
      const { member } = await api.createMember({
        name: 'New teammate', team: '', pct: 0, color: PALETTE[team.length % PALETTE.length],
      });
      setTeam((prev) => [...prev, member]);
      setUndoLabel('added a teammate');
      setDirty(true);
      setTimeout(() => {
        const inputs = rowsContainerRef.current?.querySelectorAll('input[data-field="name"]');
        const last = inputs?.[inputs.length - 1];
        last?.focus();
        last?.select();
      }, 0);
    } catch (e) {
      setSyncNote('⚠️ Could not add teammate — check your connection.');
    }
  }

  async function removeTeammate(id) {
    const removed = team.find((m) => m.id === id);
    setTeam((prev) => prev.filter((m) => m.id !== id));
    try {
      await api.deleteMember(id);
      setUndoLabel(`removed ${removed?.name || 'a teammate'}`);
      setDirty(true);
    } catch (e) {
      setSyncNote('⚠️ Could not remove teammate — check your connection.');
    }
  }

  async function undoLastChange() {
    setUndoBusy(true);
    try {
      const data = await api.undoLastChange();
      setTeam(data.team || []);
      setUndoLabel(null);
      setDirty(true);
      setSyncNote('↩️ Last change undone');
    } catch (e) {
      setSyncNote(e.status === 409 ? 'Nothing left to undo.' : '⚠️ Could not undo — check your connection.');
      setUndoLabel(null);
    } finally {
      setUndoBusy(false);
    }
  }

  function confirmClearAll() {
    if (!team.length) return;
    setModal({
      title: 'Remove all teammates?',
      body: 'This clears everyone from the race. You can undo it right after with the Undo button.',
      actions: [
        { label: 'Cancel' },
        { label: 'Remove all', danger: true, onClick: async () => {
          setTeam([]);
          try {
            await api.clearAll();
            setUndoLabel('cleared the roster');
            setDirty(true);
          } catch (e) { setSyncNote('⚠️ Could not clear roster — check your connection.'); }
        } },
      ],
    });
  }

  async function handlePhotoPick(id, file) {
    if (!file) return;
    try {
      const { member } = await api.uploadPhoto(id, file);
      setTeam((prev) => prev.map((m) => (m.id === id ? member : m)));
      setUndoLabel(`changed ${member.name || 'a teammate'}'s photo`);
      setDirty(true);
    } catch (e) {
      setSyncNote('⚠️ Photo upload failed — check the file is an image under 5MB.');
    }
  }

  async function commitImport(rows, mode) {
    try {
      await api.importRows(rows, mode);
      const data = await api.getDraftTeam();
      setTeam(data.team || []);
      setUndoLabel(`imported ${rows.length} teammate${rows.length === 1 ? '' : 's'}`);
      setDirty(true);
      setSyncNote(`Imported ${rows.length} teammate${rows.length === 1 ? '' : 's'}${mode === 'merge' ? ' (added to existing roster)' : ''} 🎉`);
    } catch (e) {
      setSyncNote('⚠️ Import failed — check your connection.');
    }
  }

  function handleCSVFile(file) {
    if (!file) return;
    const looksLikeCSV = /\.csv$/i.test(file.name) || file.type === 'text/csv' || file.type === '';
    if (!looksLikeCSV) { setSyncNote('Please choose a .csv file.'); return; }
    const rd = new FileReader();
    rd.onload = () => {
      let parsed;
      try { parsed = parseCSV(String(rd.result || '')); } catch { setSyncNote('That file could not be parsed as CSV.'); return; }
      if (!parsed.rows.length) { setSyncNote('No teammates found in that file.'); return; }
      const skippedNote = parsed.skipped ? ` (${parsed.skipped} row${parsed.skipped === 1 ? '' : 's'} skipped — missing name)` : '';
      if (team.length) {
        setModal({
          title: 'Import CSV',
          body: `Found ${parsed.rows.length} teammate${parsed.rows.length === 1 ? '' : 's'}${skippedNote}. Add them to your current roster of ${team.length}, or replace it entirely?`,
          actions: [
            { label: 'Cancel' },
            { label: 'Merge — add to roster', onClick: () => commitImport(parsed.rows, 'merge') },
            { label: 'Replace roster', danger: true, onClick: () => commitImport(parsed.rows, 'replace') },
          ],
        });
      } else {
        commitImport(parsed.rows, 'replace');
      }
    };
    rd.readAsText(file);
  }

  async function handleLogout() {
    try { await api.logout(); } catch (e) { /* token may already be invalid — fine */ }
    setToken(null);
    onLogout();
  }

  const filtered = team.filter((m) => {
    const q = search.trim().toLowerCase();
    return !q || (m.name || '').toLowerCase().includes(q) || (m.team || '').toLowerCase().includes(q);
  });

  return (
    <div className="wrap">
      <div className="banner">
        <div className="checker" />
        <h1 style={{ fontSize: 32 }}>Admin</h1>
        <div className="sub">Signed in as {user?.name || user?.email}</div>
      </div>

      <div className="editor open" id="editor" style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <h2 style={{ margin: 0 }}>Your Team</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to="/" className="btn-tv">🏁 View Race</Link>
            <Link to="/admin/users" className="btn-tv">👤 Manage Admins</Link>
            <button className="btn-tv" onClick={handleLogout}>Log out</button>
          </div>
        </div>
        <p className="savenote" id="saveNote" style={{ marginTop: 18 }}>{syncNote}</p>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <button
            className="add"
            onClick={publish}
            disabled={publishBusy || !loaded}
            style={dirty ? { boxShadow: '0 0 0 3px #ffb00066' } : undefined}
          >
            {publishBusy ? 'Publishing…' : dirty ? '📺 Publish to TV — unpublished changes' : '📺 Publish to TV'}
          </button>
        </div>
        {undoLabel && (
          <p className="savenote" style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
            You {undoLabel}.
            <button className="btn-edit" style={{ padding: '4px 12px', fontSize: 12 }} onClick={undoLastChange} disabled={undoBusy}>
              {undoBusy ? 'Undoing…' : '↩ Undo'}
            </button>
          </p>
        )}

        <div className="sectionlabel">Period</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
          <label style={{ fontWeight: 800, fontSize: 13 }}>
            Basis{' '}
            <select
              value={period?.period_type ?? 'quarter'}
              disabled={!period || periodBusy}
              onChange={(e) => updatePeriod({ period_type: e.target.value })}
              style={{ ...inputStyle, width: 'auto', display: 'inline-block' }}
            >
              <option value="quarter">Quarterly</option>
              <option value="month">Monthly</option>
            </select>
          </label>
          {(period?.period_type ?? 'quarter') === 'quarter' ? (
            <label style={{ fontWeight: 800, fontSize: 13 }}>
              Quarter{' '}
              <select
                value={period?.quarter ?? ''}
                disabled={!period || periodBusy}
                onChange={(e) => updatePeriod({ quarter: parseInt(e.target.value, 10) })}
                style={{ ...inputStyle, width: 'auto', display: 'inline-block' }}
              >
                {[1, 2, 3, 4].map((q) => <option key={q} value={q}>Q{q}</option>)}
              </select>
            </label>
          ) : (
            <label style={{ fontWeight: 800, fontSize: 13 }}>
              Month{' '}
              <select
                value={period?.month ?? ''}
                disabled={!period || periodBusy}
                onChange={(e) => updatePeriod({ month: parseInt(e.target.value, 10) })}
                style={{ ...inputStyle, width: 'auto', display: 'inline-block' }}
              >
                {MONTH_NAMES.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
              </select>
            </label>
          )}
          <label style={{ fontWeight: 800, fontSize: 13 }}>
            Year{' '}
            <input
              type="number" min="2000" max="2100"
              value={period?.year ?? ''}
              disabled={!period || periodBusy}
              onChange={(e) => updatePeriod({ year: parseInt(e.target.value, 10) || period?.year })}
              style={{ ...inputStyle, width: 90, display: 'inline-block' }}
            />
          </label>
        </div>

        <div className="sectionlabel">Import teammates</div>
        <div
          className={`dropzone${dragOver ? ' drag' : ''}`}
          tabIndex={0}
          role="button"
          aria-label="Upload CSV file"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleCSVFile(f); }}
        >
          <span className="dz-icon">📄</span>
          <div className="dz-main">Drag a CSV file here, or click to browse</div>
          <div className="dz-sub">Columns: <b>name, team, percentage, color</b> (team and color are optional).</div>
        </div>
        <input ref={fileInputRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files?.[0]) handleCSVFile(e.target.files[0]); e.target.value = ''; }} />

        <div className="csvbar">
          <button className="btn-tmpl" onClick={downloadTemplate}>⬇ Download CSV template</button>
          <button className="btn-export" onClick={() => (team.length ? exportRoster(team) : setSyncNote('No teammates to export yet.'))}>⬇ Export current roster</button>
          <button className="btn-clear" onClick={confirmClearAll}>Clear all teammates</button>
        </div>

        <div className="sectionlabel">Teammates</div>
        <div className="searchbar">
          <input type="text" placeholder="🔍 Search by name or team…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="rowhead">
          <span>Photo</span><span>Name</span><span>Team</span><span>%</span><span>Progress</span><span>Color</span><span></span>
        </div>
        <div className="scrollbox">
          <div id="rows" ref={rowsContainerRef}>
            {!loaded && <p className="noresults">Loading…</p>}
            {loaded && !filtered.length && (
              <p className="noresults">{team.length ? `No teammates match "${search}"` : 'No teammates yet — add one below or import a CSV above.'}</p>
            )}
            {filtered.map((m) => (
              <Row key={m.id} member={m} onChange={updateField} onRemove={removeTeammate}
                onPhotoPick={handlePhotoPick} photoInputsRef={photoInputsRef} />
            ))}
          </div>
        </div>
        <button className="add" onClick={addTeammate}>+ Add teammate</button>
        <p className="count">{team.length} teammate{team.length === 1 ? '' : 's'} total.</p>
      </div>

      {modal && (
        <div className="modal-overlay show" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal">
            <h3>{modal.title}</h3>
            <p>{modal.body}</p>
            <div className="modal-actions">
              {modal.actions.map((a, i) => (
                <button key={i} className={a.danger ? 'btn-clear' : 'btn-edit'}
                  onClick={() => { setModal(null); a.onClick?.(); }}>{a.label}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ member, onChange, onRemove, onPhotoPick, photoInputsRef }) {
  const tier = member.pct >= 150 ? 'mvp' : member.pct >= 100 ? 'done' : member.pct >= 70 ? 'warm' : '';
  const barWidth = Math.max(0, Math.min(100, member.pct));

  return (
    <div className="row">
      <div className="avatar" onClick={() => photoInputsRef.current[member.id]?.click()} title="Click to change photo"
        style={member.photo ? { backgroundImage: `url('${member.photo}')` } : undefined}>
        {!member.photo && (member.name || '?').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
      </div>
      <input ref={(el) => { if (el) photoInputsRef.current[member.id] = el; }} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhotoPick(member.id, f); e.target.value = ''; }} />
      <input type="text" data-field="name" value={member.name || ''} placeholder="Name"
        onChange={(e) => onChange(member.id, 'name', e.target.value)} />
      <input type="text" data-field="team" value={member.team || ''} placeholder="Team"
        onChange={(e) => onChange(member.id, 'team', e.target.value)} />
      <input type="number" min="0" max="999" value={member.pct} data-field="pct"
        onChange={(e) => onChange(member.id, 'pct', e.target.value)} />
      <div className="minibar"><i className={tier} style={{ width: barWidth + '%' }} /></div>
      <input type="color" className="colordot" value={member.color || '#2d8cff'}
        onChange={(e) => onChange(member.id, 'color', e.target.value)} />
      <button className="rm" title="Remove" onClick={() => onRemove(member.id)}>✕</button>
    </div>
  );
}
