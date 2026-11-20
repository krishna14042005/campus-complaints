import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Send, Trash2 } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { useAuth } from '../App.jsx';
import { btn, btn2, Card, Empty, Field, fmt, inp, PageTitle, Spinner, useToast } from '../ui.jsx';

export function Users({ type }) {
  const toast = useToast(); const [rows, setRows] = useState(null); const [show, setShow] = useState(false);
  const load = () => api.get('/admin/users/' + type).then((r) => setRows(r.data)).catch((e) => { toast(errMsg(e), 'error'); setRows([]); });
  useEffect(() => { setRows(null); setShow(false); load(); }, [type]);
  const toggle = async (u) => { try { await api.patch(`/admin/users/${type}/${u._id}`, { active: !u.active }); load(); } catch (e) { toast(errMsg(e), 'error'); } };
  const del = async (u) => { if (!confirm(`Delete ${u.name}?`)) return; try { await api.delete(`/admin/users/${type}/${u._id}`); toast('Account deleted'); load(); } catch (e) { toast(errMsg(e), 'error'); } };
  const add = async (e) => { e.preventDefault(); try { await api.post('/admin/users/staff', Object.fromEntries(new FormData(e.target))); toast('Staff account created'); setShow(false); load(); } catch (err) { toast(errMsg(err), 'error'); } };
  return (
    <>
      <div className="flex justify-between items-start"><PageTitle>{type === 'students' ? 'Students' : 'Maintenance staff'}</PageTitle>{type === 'staff' && <button className={btn} onClick={() => setShow(!show)}>Add staff</button>}</div>
      {show && <Card className="mb-4"><form onSubmit={add} className="grid sm:grid-cols-2 gap-3"><Field label="Name"><input name="name" className={inp} required /></Field><Field label="Email"><input name="email" type="email" className={inp} required /></Field><Field label="Temporary password"><input name="password" type="password" minLength={8} className={inp} required /></Field><Field label="Specialty"><input name="specialty" className={inp} placeholder="Electrical, plumbing…" /></Field><button className={btn + ' w-fit'}>Create account</button></form></Card>}
      <Card className="p-0 overflow-x-auto">{!rows ? <Spinner /> : !rows.length ? <Empty title="No accounts yet" /> :
        <table className="w-full text-sm"><thead className="text-left text-slate-500 border-b"><tr>{['Name', 'Email', type === 'students' ? 'Roll / Dept' : 'Specialty', 'Status', ''].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody className="divide-y">{rows.map((u) => <tr key={u._id}><td className="px-4 py-3 font-semibold">{u.name}</td><td className="px-4 py-3">{u.email}</td><td className="px-4 py-3">{type === 'students' ? [u.rollNo, u.department].filter(Boolean).join(' · ') || '—' : u.specialty || '—'}</td>
            <td className="px-4 py-3"><span className={u.active ? 'text-emerald-600' : 'text-red-600'}>{u.active ? 'Active' : 'Disabled'}</span></td>
            <td className="px-4 py-3 flex gap-2 justify-end"><button className={btn2} onClick={() => toggle(u)}>{u.active ? 'Disable' : 'Enable'}</button><button className={btn2 + ' text-red-600'} onClick={() => del(u)} aria-label="Delete"><Trash2 size={16} /></button></td></tr>)}</tbody></table>}</Card>
    </>
  );
}

export function Reports() {
  const toast = useToast(); const [period, setPeriod] = useState('daily'); const [r, setR] = useState(null);
  useEffect(() => { setR(null); api.get('/admin/report', { params: { period } }).then((x) => setR(x.data)).catch((e) => toast(errMsg(e), 'error')); }, [period]);
  const csv = () => {
    const rows = [['ID', 'Student', 'Category', 'Priority', 'Status', 'Assigned', 'Created', 'Resolved'], ...r.complaints.map((c) => [c.complaintId, c.studentName, c.category, c.priority, c.status, c.assignedStaff?.name || '', c.createdAt, c.resolvedAt || ''])];
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.map((x) => x.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' })); a.download = `complaints-${period}.csv`; a.click();
  };
  return (
    <>
      <PageTitle>Reports</PageTitle>
      <div className="flex gap-2 mb-4">{['daily', 'weekly', 'monthly'].map((p) => <button key={p} onClick={() => setPeriod(p)} className={(p === period ? btn : btn2) + ' capitalize'}>{p}</button>)}{r && <button className={btn2 + ' ml-auto'} onClick={csv}><Download size={16} /> Export CSV</button>}</div>
      {!r ? <Spinner /> : <>
        <div className="grid grid-cols-3 gap-4 mb-4">{[['Received', r.total], ['Resolved', r.resolved], ['Avg. resolution (hrs)', r.avgResolutionHours ?? '—']].map(([l, v]) => <Card key={l}><p className="text-sm text-slate-500">{l}</p><p className="text-3xl font-extrabold text-blue-700">{v}</p></Card>)}</div>
        <div className="grid md:grid-cols-2 gap-4 mb-4">{[['By category', r.byCategory], ['By status', r.byStatus]].map(([t, list]) => <Card key={t}><h3 className="font-bold mb-2">{t}</h3>{list.length ? list.map((x) => <p key={x.name} className="flex justify-between text-sm py-1"><span>{x.name}</span><b>{x.value}</b></p>) : <Empty title="No complaints in this period" />}</Card>)}</div></>}
    </>
  );
}

export function Notifications() {
  const toast = useToast(); const nav = useNavigate(); const [d, setD] = useState(null);
  const load = () => api.get('/notifications').then((r) => setD(r.data)).catch((e) => { toast(errMsg(e), 'error'); setD({ items: [] }); });
  useEffect(() => { load(); }, []);
  const readAll = async () => { await api.patch('/notifications/read'); load(); };
  return (
    <>
      <div className="flex justify-between items-start"><PageTitle>Notifications</PageTitle>{d?.unread > 0 && <button className={btn2} onClick={readAll}>Mark all as read</button>}</div>
      <Card>{!d ? <Spinner /> : !d.items.length ? <Empty title="You are all caught up" /> : <ul className="divide-y">{d.items.map((n) => <li key={n._id} className={`py-3 text-sm ${n.complaint ? 'cursor-pointer' : ''}`} onClick={() => n.complaint && nav('/complaints/' + n.complaint)}><span className={n.read ? 'text-slate-600' : 'font-semibold'}>{n.message}</span><p className="text-xs text-slate-500">{fmt(n.createdAt)}</p></li>)}</ul>}</Card>
    </>
  );
}

export function Profile() {
  const { user, update } = useAuth(); const toast = useToast();
  const save = async (e) => {
    e.preventDefault(); const body = Object.fromEntries(new FormData(e.target)); if (!body.password) delete body.password;
    try { const { data } = await api.put('/me', body); update(data); e.target.password.value = ''; toast('Profile updated'); } catch (err) { toast(errMsg(err), 'error'); }
  };
  return (
    <>
      <PageTitle sub={user.email}>Profile</PageTitle>
      <Card><form onSubmit={save} className="grid gap-4 max-w-lg">
        <Field label="Full name"><input name="name" defaultValue={user.name} className={inp} required /></Field>
        <Field label="Phone"><input name="phone" defaultValue={user.phone} className={inp} /></Field>
        {user.role === 'student' && <><Field label="Roll number"><input name="rollNo" defaultValue={user.rollNo} className={inp} /></Field><Field label="Department"><input name="department" defaultValue={user.department} className={inp} /></Field><Field label="Hostel"><input name="hostel" defaultValue={user.hostel} className={inp} /></Field></>}
        <Field label="New password (leave blank to keep)"><input name="password" type="password" minLength={8} className={inp} autoComplete="new-password" /></Field>
        <button className={btn + ' w-fit'}>Save profile</button></form></Card>
    </>
  );
}

export function Assistant() {
  const toast = useToast(); const [msgs, setMsgs] = useState([{ role: 'bot', text: 'Hi! Ask me how to submit a complaint, or where your latest complaint stands.' }]); const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const end = useRef();
  useEffect(() => end.current?.scrollIntoView({ behavior: 'smooth' }), [msgs]);
  const send = async (e) => {
    e.preventDefault(); const m = text.trim(); if (!m) return; setText(''); setMsgs((x) => [...x, { role: 'me', text: m }]); setBusy(true);
    try { const { data } = await api.post('/ai/chat', { message: m }); setMsgs((x) => [...x, { role: 'bot', text: data.reply }]); } catch (err) { toast(errMsg(err), 'error'); } finally { setBusy(false); }
  };
  return (
    <>
      <PageTitle>Assistant</PageTitle>
      <Card className="max-w-2xl flex flex-col h-[65vh]">
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">{msgs.map((m, i) => <div key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${m.role === 'me' ? 'ml-auto bg-blue-600 text-white' : 'bg-slate-100'}`}>{m.text}</div>)}{busy && <div className="text-sm text-slate-400">Thinking…</div>}<div ref={end} /></div>
        <form onSubmit={send} className="flex gap-2 pt-3"><input className={inp} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask a question" maxLength={500} /><button className={btn} disabled={busy} aria-label="Send"><Send size={16} /></button></form>
      </Card>
    </>
  );
}
