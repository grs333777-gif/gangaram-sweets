import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function SignupPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  const signup = useAuthStore((state) => state.signup);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signup(form);
      navigate(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 pt-32 pb-20">
      <h1 className="font-heading text-3xl font-bold text-navy-900">Create account</h1>
      <p className="mt-2 text-sm text-muted">Password needs 8+ characters, with uppercase, lowercase, and a number. Phone is a 10-digit Indian mobile.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {['name', 'email', 'phone', 'password'].map((field) => (
          <input
            key={field}
            required
            type={field === 'password' ? 'password' : field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
            minLength={field === 'password' ? 8 : undefined}
            placeholder={field === 'phone' ? 'Phone (10 digits)' : field[0].toUpperCase() + field.slice(1)}
            value={form[field]}
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            className="w-full rounded-xl border border-cream-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
          />
        ))}
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="btn-gold-shimmer w-full text-white font-semibold py-3 rounded-xl disabled:opacity-60">
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-sm text-muted">
        Already have an account? <Link to={`/login?next=${encodeURIComponent(next)}`} className="text-navy underline">Sign in</Link>
      </p>
    </main>
  );
}
