import { useState } from 'react';
import { api } from '../lib/api';

export function AuthPanel({ onAuthed }) {
  const [form, setForm] = useState({ mode: 'login', username: '', email: '', password: '' });

  async function submit(e) {
    e.preventDefault();
    const path = form.mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
    const { data } = await api.post(path, form);
    localStorage.setItem('token', data.token);
    onAuthed(data.user);
  }

  return (
    <form onSubmit={submit} className="w-96 bg-slate-800 text-white p-6 rounded-2xl shadow-2xl space-y-3">
      <h1 className="text-2xl font-bold">ChatForge</h1>
      {form.mode === 'signup' && <input className="w-full p-2 rounded bg-slate-700" placeholder="Username" onChange={(e) => setForm({ ...form, username: e.target.value })} />}
      <input className="w-full p-2 rounded bg-slate-700" placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <input type="password" className="w-full p-2 rounded bg-slate-700" placeholder="Password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <button className="w-full bg-indigo-500 hover:bg-indigo-400 transition p-2 rounded">{form.mode === 'login' ? 'Log In' : 'Sign Up'}</button>
      <button type="button" className="text-sm text-slate-300" onClick={() => setForm({ ...form, mode: form.mode === 'login' ? 'signup' : 'login' })}>Switch to {form.mode === 'login' ? 'signup' : 'login'}</button>
    </form>
  );
}
