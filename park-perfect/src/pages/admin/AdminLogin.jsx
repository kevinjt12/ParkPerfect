import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';


const styles = {
  // Full-screen dark page with a faint red-tinted grid texture
  page: {
    minHeight: '100vh',
    backgroundColor: '#0f0f0f',
    backgroundImage: `
      linear-gradient(rgba(215,43,43,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(215,43,43,0.04) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'DM Sans', sans-serif",
  },

  // Card: red top-border accent, soft red glow shadow
  card: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#1a1a1a',
    border: '1px solid rgba(255,255,255,0.07)',
    borderTop: '3px solid #D72B2B',
    borderRadius: '16px',
    padding: '48px 40px',
    boxShadow: '0 0 80px rgba(215,43,43,0.1), 0 24px 48px rgba(0,0,0,0.6)',
    position: 'relative',
    overflow: 'hidden',
  },

  // Top-right red radial glow — echoes the logo pin
  glowRed: {
    position: 'absolute',
    top: '-80px',
    right: '-80px',
    width: '220px',
    height: '220px',
    background: 'radial-gradient(circle, rgba(215,43,43,0.13) 0%, transparent 70%)',
    pointerEvents: 'none',
  },

  // Bottom-left gold glow — echoes the crown
  glowGold: {
    position: 'absolute',
    bottom: '-60px',
    left: '-60px',
    width: '180px',
    height: '180px',
    background: 'radial-gradient(circle, rgba(245,166,35,0.07) 0%, transparent 70%)',
    pointerEvents: 'none',
  },

  // Logo image + "ParkPerfect" wordmark row
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '28px',
  },

  logo: {
    width: '44px',
    height: '44px',
    objectFit: 'contain',
  },

  logoText: {
    fontSize: '20px',
    fontWeight: '800',
    letterSpacing: '-0.5px',
    lineHeight: 1,
  },

  // "Park" in brand red
  logoRed: { color: '#D72B2B' },

  // "Perfect" in off-white
  logoWhite: { color: '#f1f1f1' },

  // Gold crown badge — mirrors the logo crown colour
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(245,166,35,0.1)',
    border: '1px solid rgba(245,166,35,0.25)',
    color: '#F5A623',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    padding: '4px 10px',
    borderRadius: '999px',
    marginBottom: '16px',
  },

  heading: {
    color: '#f1f1f1',
    fontSize: '26px',
    fontWeight: '700',
    margin: '0 0 6px 0',
    letterSpacing: '-0.5px',
  },

  subheading: {
    color: '#555',
    fontSize: '14px',
    margin: '0 0 32px 0',
  },

  fieldGroup: { marginBottom: '20px' },

  label: {
    display: 'block',
    color: '#888',
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '8px',
    letterSpacing: '0.02em',
  },

  // Base input — overridden per-field for focus state
  input: {
    width: '100%',
    padding: '11px 14px',
    backgroundColor: '#111',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '8px',
    color: '#f1f1f1',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },

  // Error message — red-tinted box
  error: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(215,43,43,0.08)',
    border: '1px solid rgba(215,43,43,0.25)',
    color: '#f87171',
    fontSize: '13px',
    padding: '10px 14px',
    borderRadius: '8px',
    marginBottom: '20px',
  },

  // Active submit button in brand red
  button: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#D72B2B',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    letterSpacing: '0.03em',
    transition: 'background-color 0.2s, transform 0.1s',
    marginTop: '4px',
  },

  // Disabled/loading button — dimmed red
  buttonDisabled: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#7a1a1a',
    color: 'rgba(255,255,255,0.4)',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'not-allowed',
    letterSpacing: '0.03em',
    marginTop: '4px',
  },

  divider: {
    borderColor: 'rgba(255,255,255,0.05)',
    margin: '24px 0 16px',
  },

  footer: {
    color: '#333',
    fontSize: '12px',
    textAlign: 'center',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminLogin() {
  const navigate = useNavigate();

  // Form field values
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // UI feedback state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Which input is currently focused (drives the red ring)
  const [focused, setFocused] = useState('');

  // ── Login handler ──────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await client.post('admin/login/', { email, password });

      // Persist JWT tokens so authenticated API calls include them
      localStorage.setItem('access', response.data.access);
      localStorage.setItem('refresh', response.data.refresh);

      // Success — send admin to the dashboard
      navigate('/admin/dashboard');

    } catch (err) {
      // Map common HTTP error codes to readable messages
      if (err.response?.status === 401) {
        setError('Invalid email or password.');
      } else if (err.response?.status === 403) {
        setError('You do not have admin privileges.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Input style — adds red focus ring when active ─────────────────────────
  const inputStyle = (name) => ({
    ...styles.input,
    borderColor: focused === name ? 'rgba(215,43,43,0.6)' : 'rgba(255,255,255,0.07)',
    boxShadow:   focused === name ? '0 0 0 3px rgba(215,43,43,0.12)' : 'none',
  });

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Load DM Sans + keep autofill dark on Chrome */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #0f0f0f; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0px 1000px #111 inset !important;
          -webkit-text-fill-color: #f1f1f1 !important;
        }
      `}</style>

      <div style={styles.page}>
        <div style={styles.card}>

          {/* Decorative background glows */}
          <div style={styles.glowRed} />
          <div style={styles.glowGold} />

          {/* Logo + brand name */}
          <div style={styles.logoRow}>
            <img src="/Park Perfect Logo.png" alt="ParkPerfect" style={styles.logo} />
            <div style={styles.logoText}>
              <span style={styles.logoRed}>Park</span>
              <span style={styles.logoWhite}>Perfect</span>
            </div>
          </div>

          {/* Gold badge — crown icon echoes the logo */}
          <div style={styles.badge}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 16L3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5zm2 2h10v2H7v-2z"/>
            </svg>
            Admin Portal
          </div>

          <h1 style={styles.heading}>Welcome back</h1>
          <p style={styles.subheading}>Sign in to manage your parking platform.</p>

          {/* ── Login form ─────────────────────────────────────────────────── */}
          <form onSubmit={handleLogin}>

            {/* Email */}
            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused('')}
                placeholder="admin@parkperfect.com"
                required
                style={inputStyle('email')}
              />
            </div>

            {/* Password */}
            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused('')}
                placeholder="••••••••"
                required
                style={inputStyle('password')}
              />
            </div>

            {/* Error message — conditionally rendered */}
            {error && (
              <div style={styles.error}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                  <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                {error}
              </div>
            )}

            {/* Submit — hover darkens red, click scales down slightly */}
            <button
              type="submit"
              disabled={loading}
              style={loading ? styles.buttonDisabled : styles.button}
              onMouseEnter={(e) => { if (!loading) e.target.style.backgroundColor = '#b52222'; }}
              onMouseLeave={(e) => { if (!loading) e.target.style.backgroundColor = '#D72B2B'; }}
              onMouseDown={(e)  => { if (!loading) e.target.style.transform = 'scale(0.98)'; }}
              onMouseUp={(e)    => { e.target.style.transform = 'scale(1)'; }}
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <hr style={styles.divider} />
          <p style={styles.footer}>Restricted access — authorised personnel only.</p>
        </div>
      </div>
    </>
  );
}