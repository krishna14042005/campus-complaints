import { createContext, useContext, useState, useEffect } from 'react';
import { Routes, Route, Navigate, NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, ListChecks, Bell, Bot, User, GraduationCap, HardHat, BarChart3, CheckCircle2, LogOut, Menu, X, Building2 } from 'lucide-react';
import api from './api.js';
import Auth from './pages/Auth.jsx';
import Home from './pages/Home.jsx';
import { Complaints, Detail, NewComplaint } from './pages/Complaints.jsx';
import { Users, Reports, Notifications, Profile, Assistant } from './pages/Manage.jsx';

const AuthCtx = createContext();
export const useAuth = () => useContext(AuthCtx);
const NAV = {
  student: [['/', 'Dashboard', LayoutDashboard], ['/new', 'New complaint', PlusCircle], ['/complaints', 'My complaints', ListChecks], ['/notifications', 'Notifications', Bell], ['/assistant', 'Assistant', Bot], ['/profile', 'Profile', User]],
  admin: [['/', 'Overview', LayoutDashboard], ['/complaints', 'Complaints', ListChecks], ['/students', 'Students', GraduationCap], ['/staff', 'Staff', HardHat], ['/reports', 'Reports', BarChart3], ['/notifications', 'Notifications', Bell]],
  staff: [['/', 'My tasks', LayoutDashboard], ['/completed', 'Completed', CheckCircle2], ['/notifications', 'Notifications', Bell], ['/profile', 'Profile', User]]
};

function Layout() {
  const { user, logout } = useAuth(); const [open, setOpen] = useState(false); const [unread, setUnread] = useState(0);
  useEffect(() => { const f = () => api.get('/notifications').then((r) => setUnread(r.data.unread)).catch(() => {}); f(); const t = setInterval(f, 30000); return () => clearInterval(t); }, []);
  return (
    <div className="min-h-screen lg:flex">
      <header className="lg:hidden flex items-center justify-between bg-blue-950 text-white px-4 py-3">
        <span className="font-bold flex items-center gap-2"><Building2 size={18} /> Campus Care</span>
        <button onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X /> : <Menu />}</button>
      </header>
      <aside className={`${open ? 'block' : 'hidden'} lg:block lg:sticky lg:top-0 lg:h-screen w-full lg:w-64 shrink-0 bg-blue-950 text-blue-100 p-4 flex-col`}>
        <div className="hidden lg:flex items-center gap-2 text-white font-extrabold text-lg px-2 mb-1"><Building2 /> Campus Care</div>
        <p className="px-2 mb-6 text-xs text-blue-300">{user.name} · {user.role}</p>
        <nav className="space-y-1">
          {NAV[user.role].map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-blue-900'}`}>
              <Icon size={18} /> {label}
              {label === 'Notifications' && unread > 0 && <span className="ml-auto rounded-full bg-white text-blue-700 text-xs px-2 font-bold">{unread}</span>}
            </NavLink>
          ))}
        </nav>
        <button onClick={logout} className="mt-6 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-blue-900"><LogOut size={18} /> Log out</button>
      </aside>
      <main className="flex-1 min-w-0 p-4 lg:p-8"><Outlet /></main>
    </div>
  );
}
const Only = ({ role, children }) => (useAuth().user.role === role ? children : <Navigate to="/" replace />);

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const login = (token, u) => { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(u)); setUser(u); };
  const logout = () => { localStorage.clear(); setUser(null); };
  const update = (u) => { localStorage.setItem('user', JSON.stringify(u)); setUser(u); };
  return (
    <AuthCtx.Provider value={{ user, login, logout, update }}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Auth />} />
        <Route element={user ? <Layout /> : <Navigate to="/login" replace />}>
          <Route index element={<Home />} />
          <Route path="new" element={<Only role="student"><NewComplaint /></Only>} />
          <Route path="complaints" element={<Complaints />} />
          <Route path="complaints/:id" element={<Detail />} />
          <Route path="completed" element={<Only role="staff"><Complaints fixed="Resolved" /></Only>} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Profile />} />
          <Route path="assistant" element={<Only role="student"><Assistant /></Only>} />
          <Route path="students" element={<Only role="admin"><Users type="students" /></Only>} />
          <Route path="staff" element={<Only role="admin"><Users type="staff" /></Only>} />
          <Route path="reports" element={<Only role="admin"><Reports /></Only>} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthCtx.Provider>
  );
}
