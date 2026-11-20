import { useState } from 'react';
import { Building2 } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { useAuth } from '../App.jsx';
import { btn, inp, Field, useToast } from '../ui.jsx';

export default function Auth() {
  const { login } = useAuth(); const toast = useToast();
  const [role, setRole] = useState('student'); const [reg, setReg] = useState(false); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    const body = Object.fromEntries(new FormData(e.target));
    try {
      const { data } = reg ? await api.post('/auth/register', body) : await api.post('/auth/login', { ...body, role });
      login(data.token, data.user);
    } catch (err) { toast(errMsg(err), 'error'); } finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-center bg-blue-950 text-white p-16">
        <Building2 size={40} className="mb-6 text-blue-400" />
        <h1 className="text-4xl font-extrabold leading-tight">Report it once.<br />Watch it get fixed.</h1>
        <p className="mt-4 max-w-md text-blue-200">Projectors, Wi-Fi, drinking water, labs, washrooms and hostels: every complaint gets an ID, an owner and a status you can track.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4" noValidate>
          <h2 className="text-2xl font-extrabold">{reg ? 'Create student account' : 'Log in'}</h2>
          {!reg && <div className="grid grid-cols-3 rounded-lg bg-slate-200 p-1 text-sm font-semibold">{['student', 'admin', 'staff'].map((r) => <button type="button" key={r} onClick={() => setRole(r)} className={`rounded-md py-1.5 capitalize ${role === r ? 'bg-white text-blue-700 shadow' : 'text-slate-600'}`}>{r}</button>)}</div>}
          {reg && <><Field label="Full name"><input name="name" className={inp} required /></Field>
            <div className="grid grid-cols-2 gap-3"><Field label="Roll number"><input name="rollNo" className={inp} /></Field><Field label="Department"><input name="department" className={inp} /></Field></div></>}
          <Field label="Email"><input name="email" type="email" className={inp} required /></Field>
          <Field label="Password"><input name="password" type="password" minLength={reg ? 8 : 1} className={inp} required /></Field>
          <button className={btn + ' w-full'} disabled={busy}>{busy ? 'Please wait…' : reg ? 'Create account' : 'Log in'}</button>
          {role === 'student' && <p className="text-sm text-center text-slate-600">{reg ? 'Already registered?' : 'New student?'} <button type="button" className="font-semibold text-blue-700" onClick={() => setReg(!reg)}>{reg ? 'Log in' : 'Create an account'}</button></p>}
        </form>
      </div>
    </div>
  );
}
