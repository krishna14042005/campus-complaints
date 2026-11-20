import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Sparkles, Star, Trash2 } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { useAuth } from '../App.jsx';
import { btn, btn2, CAT_NAMES, Card, CatIcon, Empty, Field, fmt, inp, PageTitle, PRIORITIES, PriorityBadge, Spinner, StatusBadge, STATUSES, useToast } from '../ui.jsx';

export function Complaints({ fixed }) {
  const { user } = useAuth(); const toast = useToast();
  const [f, setF] = useState({ q: '', category: '', status: fixed || '', priority: '', from: '', sort: 'new' }); const [rows, setRows] = useState(null);
  useEffect(() => {
    setRows(null);
    const t = setTimeout(() => { const { sort, ...params } = f; api.get('/complaints', { params }).then((r) => setRows(r.data)).catch((e) => { toast(errMsg(e), 'error'); setRows([]); }); }, 250);
    return () => clearTimeout(t);
  }, [f.q, f.category, f.status, f.priority, f.from]);
  const sorted = useMemo(() => !rows ? rows : [...rows].sort((a, b) => f.sort === 'old' ? new Date(a.createdAt) - new Date(b.createdAt) : f.sort === 'priority' ? PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority) : new Date(b.createdAt) - new Date(a.createdAt)), [rows, f.sort]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <>
      <PageTitle>{fixed ? 'Completed tasks' : user.role === 'student' ? 'My complaints' : 'All complaints'}</PageTitle>
      <Card className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <input className={inp + ' lg:col-span-2'} placeholder="Search ID, student, category" value={f.q} onChange={set('q')} aria-label="Search" />
        <select className={inp} value={f.category} onChange={set('category')}><option value="">All categories</option>{CAT_NAMES.map((c) => <option key={c}>{c}</option>)}</select>
        {!fixed && <select className={inp} value={f.status} onChange={set('status')}><option value="">All statuses</option>{STATUSES.map((c) => <option key={c}>{c}</option>)}</select>}
        <select className={inp} value={f.priority} onChange={set('priority')}><option value="">All priorities</option>{PRIORITIES.map((c) => <option key={c}>{c}</option>)}</select>
        <input type="date" className={inp} value={f.from} onChange={set('from')} aria-label="From date" />
        <select className={inp} value={f.sort} onChange={set('sort')}><option value="new">Newest first</option><option value="old">Oldest first</option><option value="priority">Highest priority</option></select>
      </Card>
      <Card className="p-0 overflow-x-auto">
        {!sorted ? <Spinner /> : sorted.length === 0 ? <Empty title="No complaints found" hint="Try clearing the filters." /> :
          <table className="w-full text-sm"><thead className="text-left text-slate-500 border-b"><tr>{['ID', 'Complaint', user.role !== 'student' && 'Student', 'Priority', 'Status', 'Date'].filter(Boolean).map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody className="divide-y">{sorted.map((c) => <tr key={c._id} className="hover:bg-slate-50">
              <td className="px-4 py-3 whitespace-nowrap"><Link className="font-semibold text-blue-700" to={`/complaints/${c._id}`}>{c.complaintId}</Link></td>
              <td className="px-4 py-3"><div className="flex gap-2 items-center"><CatIcon name={c.category} />{c.title}</div></td>
              {user.role !== 'student' && <td className="px-4 py-3">{c.studentName}</td>}
              <td className="px-4 py-3"><PriorityBadge p={c.priority} /></td><td className="px-4 py-3"><StatusBadge s={c.status} /></td>
              <td className="px-4 py-3 whitespace-nowrap text-slate-500">{fmt(c.createdAt)}</td></tr>)}</tbody></table>}
      </Card>
    </>
  );
}

export function NewComplaint() {
  const nav = useNavigate(); const toast = useToast(); const [busy, setBusy] = useState(false); const [previews, setPreviews] = useState([]);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const { data } = await api.post('/complaints', new FormData(e.target));
      toast(`Submitted as ${data.complaintId}. Priority: ${data.priority}`);
      if (data.duplicateOf) toast(`A similar complaint (${data.duplicateOf}) is already open. Admins will link them.`, 'warn');
      nav(`/complaints/${data._id}`);
    } catch (err) { toast(errMsg(err), 'error'); } finally { setBusy(false); }
  };
  return (
    <>
      <PageTitle sub="Our AI will check the category and priority for you.">New complaint</PageTitle>
      <Card><form onSubmit={submit} className="grid gap-4 max-w-2xl">
        <Field label="Category"><select name="category" className={inp} required><option value="">Select a category</option>{CAT_NAMES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Title"><input name="title" className={inp} minLength={5} maxLength={120} required /></Field>
        <Field label="What is the problem?"><textarea name="description" rows={5} className={inp} minLength={15} maxLength={2000} required /></Field>
        <div className="grid sm:grid-cols-3 gap-3"><Field label="Block / hostel"><input name="block" className={inp} required /></Field><Field label="Floor"><input name="floor" className={inp} /></Field><Field label="Room / classroom"><input name="room" className={inp} /></Field></div>
        <Field label="Photos (up to 4, 5 MB each)"><input name="images" type="file" accept="image/*" multiple className={inp} onChange={(e) => setPreviews([...e.target.files].slice(0, 4).map((f) => URL.createObjectURL(f)))} /></Field>
        {previews.length > 0 && <div className="flex gap-2">{previews.map((p) => <img key={p} src={p} className="h-20 rounded-lg object-cover" alt="" />)}</div>}
        <button className={btn + ' w-fit'} disabled={busy}>{busy ? 'Submitting…' : 'Submit complaint'}</button>
      </form></Card>
    </>
  );
}

const Imgs = ({ title, list }) => list?.length ? <div><p className="text-sm font-semibold mb-2">{title}</p><div className="flex flex-wrap gap-2">{list.map((s) => <a key={s} href={s} target="_blank" rel="noreferrer"><img src={s} alt={title} className="h-28 rounded-lg object-cover" /></a>)}</div></div> : null;

export function Detail() {
  const { id } = useParams(); const { user } = useAuth(); const toast = useToast(); const nav = useNavigate();
  const [d, setD] = useState(null); const [staff, setStaff] = useState([]); const [busy, setBusy] = useState(false); const [rate, setRate] = useState({ rating: 5, comment: '' });
  const load = () => api.get('/complaints/' + id).then((r) => setD(r.data)).catch((e) => { toast(errMsg(e), 'error'); nav('/complaints'); });
  useEffect(() => { load(); if (user.role === 'admin') api.get('/staff').then((r) => setStaff(r.data)); }, [id]);
  if (!d) return <Spinner />;
  const c = d.complaint;
  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await api.patch('/complaints/' + id, new FormData(e.target)); toast('Changes saved'); await load(); } catch (err) { toast(errMsg(err), 'error'); } finally { setBusy(false); }
  };
  const remove = async () => { if (!confirm('Delete this complaint permanently?')) return; try { await api.delete('/complaints/' + id); toast('Complaint deleted'); nav('/complaints'); } catch (err) { toast(errMsg(err), 'error'); } };
  const sendFeedback = async (e) => { e.preventDefault(); try { await api.post(`/complaints/${id}/feedback`, rate); toast('Thanks for your feedback'); load(); } catch (err) { toast(errMsg(err), 'error'); } };
  const canStaffAct = user.role === 'staff' && !['Resolved', 'Rejected'].includes(c.status);
  return (
    <>
      <PageTitle sub={`${c.complaintId} · submitted ${fmt(c.createdAt)} by ${c.studentName}`}>{c.title}</PageTitle>
      <div className="grid xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <Card className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center"><StatusBadge s={c.status} /><PriorityBadge p={c.priority} /><span className="flex items-center gap-1 text-sm text-slate-600"><CatIcon name={c.category} /> {c.category}</span></div>
            <p className="whitespace-pre-wrap text-sm">{c.description}</p>
            <p className="text-sm text-slate-600">Location: {[c.location?.block, c.location?.floor && `Floor ${c.location.floor}`, c.location?.room].filter(Boolean).join(', ')}</p>
            <Imgs title="Evidence" list={c.images} /><Imgs title="Before work" list={c.beforeImages} /><Imgs title="After work" list={c.afterImages} />
            {c.assignedStaff && <p className="text-sm">Assigned to <b>{c.assignedStaff.name}</b></p>}
            {c.adminRemarks && <div className="rounded-lg bg-blue-50 p-3 text-sm"><b>Admin remarks:</b> {c.adminRemarks}</div>}
            {c.resolutionRemarks && <div className="rounded-lg bg-emerald-50 p-3 text-sm"><b>Resolution:</b> {c.resolutionRemarks}{c.resolvedAt && <span className="text-slate-500"> ({fmt(c.resolvedAt)})</span>}</div>}
            {c.rating && <p className="text-sm flex items-center gap-1"><Star size={16} className="text-amber-500" /> {c.rating}/5 {c.feedback && `· ${c.feedback}`}</p>}
          </Card>
          {user.role === 'student' && c.status === 'Resolved' && !c.rating && (
            <Card><h3 className="font-bold mb-3">How did we do?</h3><form onSubmit={sendFeedback} className="grid gap-3 max-w-md">
              <select className={inp} value={rate.rating} onChange={(e) => setRate({ ...rate, rating: +e.target.value })}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 && 's'}</option>)}</select>
              <textarea className={inp} rows={3} placeholder="Comments (optional)" value={rate.comment} onChange={(e) => setRate({ ...rate, comment: e.target.value })} /><button className={btn + ' w-fit'}>Send feedback</button></form></Card>)}
          <Card><h3 className="font-bold mb-3">Activity</h3><ol className="space-y-3 border-l-2 border-blue-100 pl-4">{d.history.map((h) => <li key={h._id} className="text-sm"><b>{h.action}</b> {h.note && <span>· {h.note}</span>}<p className="text-xs text-slate-500">{h.by} ({h.byRole}) · {fmt(h.createdAt)}</p></li>)}</ol></Card>
        </div>
        <div className="space-y-4">
          {user.role !== 'student' && (
            <Card className="space-y-2 text-sm"><h3 className="font-bold flex items-center gap-2"><Sparkles size={16} className="text-blue-600" /> AI analysis</h3>
              <p><b>Detected category:</b> {c.aiCategory}</p><p><b>Priority:</b> {c.aiPriority}</p><p><b>Sentiment:</b> {c.sentiment}</p><p><b>Summary:</b> {c.summary}</p><p><b>Suggested action:</b> {c.recommendation}</p>
              {c.duplicateOf && <p className="flex gap-2 rounded-lg bg-amber-50 p-2 text-amber-800"><AlertTriangle size={16} className="shrink-0" /> Possible duplicate of {c.duplicateOf}</p>}</Card>)}
          {user.role === 'admin' && (
            <Card><h3 className="font-bold mb-3">Manage</h3><form key={c.updatedAt} onSubmit={save} className="grid gap-3">
              <Field label="Status"><select name="status" defaultValue={c.status} className={inp}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
              <Field label="Priority"><select name="priority" defaultValue={c.priority} className={inp}>{PRIORITIES.map((s) => <option key={s}>{s}</option>)}</select></Field>
              <Field label="Assign to"><select name="assignedStaff" defaultValue={c.assignedStaff?._id || ''} className={inp}><option value="">Unassigned</option>{staff.map((s) => <option key={s._id} value={s._id}>{s.name}{s.specialty && ` (${s.specialty})`}</option>)}</select></Field>
              <Field label="Remarks for the student"><textarea name="adminRemarks" defaultValue={c.adminRemarks} rows={3} className={inp} /></Field>
              <button className={btn} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
              <button type="button" onClick={remove} className={btn2 + ' text-red-600'}><Trash2 size={16} /> Delete complaint</button></form></Card>)}
          {canStaffAct && (
            <Card><h3 className="font-bold mb-3">Update work</h3><form key={c.updatedAt} onSubmit={save} className="grid gap-3">
              <Field label="Progress"><select name="status" defaultValue={c.status === 'Assigned' ? 'In Progress' : c.status} className={inp}><option>In Progress</option><option>Resolved</option></select></Field>
              <Field label="Work remarks"><textarea name="resolutionRemarks" defaultValue={c.resolutionRemarks} rows={3} className={inp} /></Field>
              <Field label="Before photos"><input name="before" type="file" accept="image/*" multiple className={inp} /></Field>
              <Field label="After photos"><input name="after" type="file" accept="image/*" multiple className={inp} /></Field>
              <button className={btn} disabled={busy}>{busy ? 'Saving…' : 'Save update'}</button></form></Card>)}
        </div>
      </div>
    </>
  );
}
