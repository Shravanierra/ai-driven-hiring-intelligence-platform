import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import logo from '../assets/logo.svg';
import loginBg from '../assets/login-bg.svg';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post(`/auth/${mode}`, { email, password });
      if (data.error) {
        setError(data.error);
        return;
      }
      localStorage.setItem('token', data.access_token);
      navigate('/jobs');
    } catch (err: any) {
      setError(err.response?.data?.message?.[0] ?? err.response?.data?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      {/* Glassmorphism card */}
      <div className="w-full max-w-sm mx-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-8 space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <img src={logo} alt="HireIQ" className="h-12 brightness-0 invert" />
        </div>

        <div className="text-center">
          <p className="text-sm text-indigo-200">
            {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-indigo-200 mb-1 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              placeholder="recruiter@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-indigo-200 mb-1 uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              placeholder={mode === 'register' ? 'Min. 6 characters' : '••••••••'}
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-indigo-900/40"
          >
            {loading ? '…' : mode === 'login' ? 'Sign In' : 'Register'}
          </button>
        </form>

        <p className="text-center text-sm text-indigo-300">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            className="text-indigo-400 font-medium hover:text-white transition-colors"
          >
            {mode === 'login' ? 'Register' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
}
