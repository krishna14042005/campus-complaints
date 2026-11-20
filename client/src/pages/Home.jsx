import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api, { errMsg } from '../api.js';
import { useAuth } from '../App.jsx';
import { Card, CatIcon, Empty, fmt, PageTitle, PriorityBadge, Spinner, StatusBadge, useToast } from '../ui.jsx';

const COLORS = ['#2563eb', '#0ea5e9', '#6366f1', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];
const Stat = ({ label, value, tone = 'text-blue-700' }) => <Card><p className="text-sm text-slate-500">{label}</p><p className={`text-3xl font-extrabold mt-1 ${tone}`}>{value ?? 0}</p></Card>;

export default function Home() {
  const { user } = useAuth(); const toast = useToast(); const [s, setS] = useState(); const [recent, setRecent] = useState();
  useEffect(() => {
    api.get('/stats').then((r) => setS(r.data)).catch((e) => toast(errMsg(e), 'error'));
    api.get('/complaints', { params: { limit: user.role === 'staff' ? 100 : 6 } }).then((r) => setRecent(user.role === 'staff' ? r.data.filter((c) => c.status !== 'Resolved') : r.data)).catch(() => setRecent([]));
  }, []);
  if (!s || !recent) return <Spinner />;
  const st = s.status, pending = (st.Submitted || 0) + (st['Under Review'] || 0) + (st.Assigned || 0);
  return (
    <>
      <PageTitle sub={user.role === 'admin' ? 'Campus-wide complaint activity' : undefined}>Hello, {user.name.split(' ')[0]}</PageTitle>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {user.role === 'admin' && <Stat label="Registered students" value={s.students} />}
        <Stat label={user.role === 'staff' ? 'Assigned to me' : 'Total complaints'} value={s.total} />
        {user.role === 'staff' ? <Stat label="Pending start" value={st.Assigned} tone="text-sky-600" /> : <Stat label="Pending" value={pending} tone="text-violet-600" />}
        <Stat label="In progress" value={st['In Progress']} tone="text-amber-600" />
        <Stat label="Resolved" value={st.Resolved} tone="text-emerald-600" />
        {user.role !== 'staff' && <Stat label="Rejected" value={st.Rejected} tone="text-red-600" />}
      </div>
      {user.role === 'admin' && (
        <div className="grid lg:grid-cols-2 gap-4 mb-6">
          <Card><h3 className="font-bold mb-3">Complaints by category</h3>{s.byCategory.length ? <ResponsiveContainer width="100%" height={240}><PieChart><Pie data={s.byCategory} dataKey="value" nameKey="name" outerRadius={85} label={({ value }) => value}>{s.byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % 8]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <Empty title="No data yet" />}</Card>
          <Card><h3 className="font-bold mb-3">Status breakdown</h3><ResponsiveContainer width="100%" height={240}><BarChart data={Object.entries(st).map(([name, v]) => ({ name, v }))}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={11} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="v" fill="#2563eb" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></Card>
          <Card><h3 className="font-bold mb-3">Last 14 days</h3>{s.trend.length ? <ResponsiveContainer width="100%" height={220}><LineChart data={s.trend}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" fontSize={11} /><YAxis allowDecimals={false} /><Tooltip /><Line dataKey="count" stroke="#2563eb" strokeWidth={2} /></LineChart></ResponsiveContainer> : <Empty title="No recent complaints" />}</Card>
          <Card><h3 className="font-bold mb-3">Most reported problems</h3>{s.frequent.length ? <ul className="divide-y">{s.frequent.map((f, i) => <li key={i} className="flex items-center gap-3 py-2.5 text-sm"><CatIcon name={f.category} /><span className="flex-1">{f.category} <span className="text-slate-500">· {f.block || 'Unknown location'}</span></span><b>{f.count}</b></li>)}</ul> : <Empty title="No data yet" />}</Card>
        </div>
      )}
      <Card>
        <div className="flex justify-between mb-3"><h3 className="font-bold">{user.role === 'staff' ? 'Open tasks' : 'Recent complaints'}</h3>{user.role !== 'staff' && <Link to="/complaints" className="text-sm font-semibold text-blue-700">View all</Link>}</div>
        {recent.length === 0 ? <Empty title={user.role === 'student' ? 'No complaints yet' : 'Nothing here'} hint={user.role === 'student' ? 'Use New complaint to report a campus problem.' : undefined} /> :
          <ul className="divide-y">{recent.map((c) => <li key={c._id}><Link to={`/complaints/${c._id}`} className="flex flex-wrap items-center gap-3 py-3 hover:bg-slate-50 rounded px-1"><CatIcon name={c.category} /><div className="flex-1 min-w-40"><p className="font-semibold text-sm">{c.title}</p><p className="text-xs text-slate-500">{c.complaintId} · {fmt(c.createdAt)}</p></div><PriorityBadge p={c.priority} /><StatusBadge s={c.status} /></Link></li>)}</ul>}
      </Card>
    </>
  );
}
