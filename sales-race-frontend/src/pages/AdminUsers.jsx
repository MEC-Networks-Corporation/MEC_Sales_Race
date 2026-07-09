import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #ccc',
  fontFamily: 'Outfit, sans-serif', fontSize: 14, boxSizing: 'border-box',
};

export default function AdminUsers() {
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [note, setNote] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState(null);

  useEffect(() => {
    api.me()
      .then((data) => setMe(data.user))
      .catch(() => navigate('/admin'))
      .finally(() => setCheckingAuth(false));
  }, [navigate]);

  useEffect(() => {
    if (!me) return;
    api.listAdmins().then((data) => { setUsers(data.users || []); setLoaded(true); });
  }, [me]);

  async function handleCreate(e) {
    e.preventDefault();
    setBusy(true);
    setErrors(null);
    setNote('');
    try {
      const { user } = await api.createAdmin(form);
      setUsers((prev) => [...prev, user].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({ name: '', email: '', password: '' });
      setNote(`Added ${user.name} 🎉`);
    } catch (err) {
      setErrors(err.errors || { form: [err.message] });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(user) {
    if (!window.confirm(`Remove admin "${user.name}"? They will no longer be able to sign in.`)) return;
    try {
      await api.deleteAdmin(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setNote(`Removed ${user.name}.`);
    } catch (err) {
      setNote(`⚠️ ${err.message}`);
    }
  }

  if (checkingAuth) return <div className="wrap"><p style={{ textAlign: 'center', padding: 40 }}>Loading…</p></div>;

  return (
    <div className="wrap">
      <div className="banner">
        <div className="checker" />
        <h1 style={{ fontSize: 32 }}>Manage Admins</h1>
        <div className="sub">Signed in as {me?.name || me?.email}</div>
      </div>

      <div className="editor open" style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <h2 style={{ margin: 0 }}>Admin Accounts</h2>
          <Link to="/admin" className="btn-tv">← Back to Team</Link>
        </div>
        {note && <p className="savenote">{note}</p>}

        <div className="sectionlabel">Existing admins</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {!loaded && <p className="noresults">Loading…</p>}
          {loaded && !users.length && <p className="noresults">No admins found.</p>}
          {users.map((u) => (
            <div key={u.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#f6f8fc', borderRadius: 10, padding: '10px 14px',
            }}>
              <div>
                <div style={{ fontWeight: 800 }}>
                  {u.name}{' '}
                  {u.id === me?.id && <span style={{ fontWeight: 600, fontSize: 12, color: '#778' }}>(you)</span>}
                </div>
                <div style={{ fontSize: 13, color: '#556' }}>{u.email}</div>
              </div>
              <button className="rm" title="Remove admin" onClick={() => handleDelete(u)} disabled={u.id === me?.id}
                style={u.id === me?.id ? { opacity: 0.35, cursor: 'not-allowed' } : undefined}>✕</button>
            </div>
          ))}
        </div>

        <div className="sectionlabel">Add a new admin</div>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 420 }}>
          <div>
            <label style={{ display: 'block', fontWeight: 800, fontSize: 13, marginBottom: 6 }}>Name</label>
            <input type="text" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 800, fontSize: 13, marginBottom: 6 }}>Email</label>
            <input type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 800, fontSize: 13, marginBottom: 6 }}>Password</label>
            <input type="password" required minLength={8} value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} style={inputStyle} />
          </div>
          {errors && (
            <p style={{ color: '#c0392b', fontWeight: 700 }}>{Object.values(errors).flat().join(' ')}</p>
          )}
          <button className="add" type="submit" disabled={busy}>{busy ? 'Adding…' : '+ Add admin'}</button>
        </form>
      </div>
    </div>
  );
}
