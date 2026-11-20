import { createContext, useContext, useState, useCallback } from 'react';
import { Projector, Wifi, Droplets, FlaskConical, Bath, BedDouble, Zap, Wrench, Loader2, Inbox } from 'lucide-react';

const CATS = [['Classroom / Projector', Projector], ['Wi-Fi / Internet', Wifi], ['Drinking Water', Droplets], ['Laboratory Equipment', FlaskConical], ['Washroom Maintenance', Bath], ['Hostel Maintenance', BedDouble], ['Electrical Issues', Zap], ['Other Facilities', Wrench]];
export const CAT_NAMES = CATS.map((c) => c[0]);
export const STATUSES = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Rejected'];
export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
export const CatIcon = ({ name, size = 16 }) => { const I = (CATS.find((c) => c[0] === name) || [0, Wrench])[1]; return <I size={size} />; };
const SC = { Submitted: 'bg-slate-100 text-slate-700', 'Under Review': 'bg-violet-100 text-violet-700', Assigned: 'bg-sky-100 text-sky-700', 'In Progress': 'bg-amber-100 text-amber-700', Resolved: 'bg-emerald-100 text-emerald-700', Rejected: 'bg-red-100 text-red-700' };
const PC = { Low: 'bg-emerald-50 text-emerald-700', Medium: 'bg-amber-50 text-amber-700', High: 'bg-orange-100 text-orange-700', Critical: 'bg-red-100 text-red-700' };
export const StatusBadge = ({ s }) => <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${SC[s]}`}>{s}</span>;
export const PriorityBadge = ({ p }) => <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${PC[p]}`}>{p}</span>;
export const Spinner = () => <div className="flex justify-center py-16 text-blue-600"><Loader2 className="animate-spin" /></div>;
export const Empty = ({ title, hint }) => <div className="text-center py-14 text-slate-500"><Inbox className="mx-auto mb-3 text-slate-300" size={40} /><p className="font-semibold text-slate-700">{title}</p>{hint && <p className="text-sm mt-1">{hint}</p>}</div>;
export const Card = ({ children, className = '' }) => <div className={`bg-white rounded-xl border border-slate-200 p-5 ${className}`}>{children}</div>;
export const PageTitle = ({ children, sub }) => <div className="mb-5"><h1 className="text-2xl font-extrabold text-slate-900">{children}</h1>{sub && <p className="text-sm text-slate-500 mt-1">{sub}</p>}</div>;
export const inp = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
export const btn = 'inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50';
export const btn2 = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';
export const fmt = (d) => (d ? new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—');
export const Field = ({ label, children }) => <label className="block text-sm font-medium text-slate-700">{label}<div className="mt-1">{children}</div></label>;

const Ctx = createContext();
export const useToast = () => useContext(Ctx);
export function ToastProvider({ children }) {
  const [list, setList] = useState([]);
  const toast = useCallback((msg, type = 'ok') => { const id = Math.random(); setList((l) => [...l, { id, msg, type }]); setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 4000); }, []);
  return <Ctx.Provider value={toast}>{children}
    <div className="fixed bottom-4 right-4 z-50 space-y-2" role="status">{list.map((t) => <div key={t.id} className={`rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${t.type === 'error' ? 'bg-red-600' : t.type === 'warn' ? 'bg-amber-600' : 'bg-emerald-600'}`}>{t.msg}</div>)}</div></Ctx.Provider>;
}
