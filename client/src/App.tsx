import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { login, getMe } from './api';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setStatus('Logging in…');
    try {
      await login(username, password);
      const who = await getMe();
      console.log('User:', who);
      setStatus('Login success!');
      navigate('/dashboard');
    } catch (err: any) {
      setStatus(err.message || 'Login failed');
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '48px auto', fontFamily: 'Inter, system-ui, Arial' }}>
      <h1>Cultivasia CRM (dev)</h1>

      <form onSubmit={handleLogin} style={{ display: 'grid', gap: 10 }}>
        <input
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="username"
          style={{ padding: 8 }}
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="password"
          style={{ padding: 8 }}
        />
        <button type="submit" style={{ padding: '8px 12px' }}>Log in</button>
      </form>

      <div style={{ marginTop: 10 }}>{status}</div>
    </div>
  );
}

function Dashboard() {
  return (
    <div style={{ maxWidth: 600, margin: '48px auto', fontFamily: 'Inter, system-ui, Arial' }}>
      <h1>Dashboard</h1>
      <p>Welcome! You are logged in 🎉</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
