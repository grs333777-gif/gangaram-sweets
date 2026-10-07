import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  const login = useAuthStore((state) => state.login);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(form);
      navigate(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 pt-32 pb-20">
      <h1 className="font-heading text-3xl font-bold text-navy-900">Sign in</h1>
      <p className="mt-2 text-sm text-muted">Use the same account for orders and online payment.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <input
          required
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full rounded-xl border border-cream-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
        />
        <input
          required
          type="password"
          minLength={8}
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full rounded-xl border border-cream-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
        />
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="btn-gold-shimmer w-full text-white font-semibold py-3 rounded-xl disabled:opacity-60">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-6 text-sm text-muted">
        New here? <Link to={`/signup?next=${encodeURIComponent(next)}`} className="text-navy underline">Create an account</Link>
      </p>
    </main>
  );
}
