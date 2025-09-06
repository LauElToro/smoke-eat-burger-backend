'use client';
import { useState } from 'react';

export default function LoginPage(){
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  async function onSubmit(e){
    e.preventDefault();
    setErr('');
    const res = await fetch('/api/auth/login', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ email, password }) });
    if(res.ok){ window.location.href = '/admin'; } else { const j = await res.json(); setErr(j.error||'Error'); }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4" style={{border:'1px solid #E5E7EB', borderRadius:16, padding:24}}>
        <h1 style={{fontSize:24, fontWeight:'bold'}}>Ingresar</h1>
        <input style={{width:'100%', border:'1px solid #E5E7EB', borderRadius:8, padding:8}} placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input style={{width:'100%', border:'1px solid #E5E7EB', borderRadius:8, padding:8}} placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        {err && <p style={{color:'#DC2626', fontSize:12}}>{err}</p>}
        <button style={{width:'100%', borderRadius:12, padding:10, border:'1px solid #E5E7EB'}}>Entrar</button>
      </form>
    </main>
  );
}
