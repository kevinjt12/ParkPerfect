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
  glow_red: {
    position: 'absolute',
    top: '-80px',
    right: '-80px',
    width: '220px',
    height: '220px',
    background: 'radial-gradient(circle, rgba(215,43,43,0.13) 0%, transparent 70%)',
    pointerEvents: 'none',
  },

  // Bottom-left gold glow — echoes the crown
  glow_gold: {
    position: 'absolute',
    bottom: '-60px',
    left: '-60px',
    width: '180px',
    height: '180px',
    background: 'radial-gradient(circle, rgba(245,166,35,0.07) 0%, transparent 70%)',
    pointerEvents: 'none',
  },

  // Logo image + "ParkPerfect" wordmark row
  logo_row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '14px',
    marginBottom: '24px',
  },

  logo: {
    width: '88px',
    height: '88px',
    objectFit: 'contain',
  },

  brand_copy: {
    display: 'grid',
    gap: '4px',
  },

  eyebrow: {
    margin: 0,
    color: '#ff7a7a',
    textTransform: 'uppercase',
    letterSpacing: '0.16em',
    fontSize: '0.68rem',
    fontWeight: '700',
  },

  logo_text: {
    margin: 0,
    color: '#f8f7f4',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 'clamp(1.8rem, 4vw, 2.3rem)',
    fontWeight: '700',
    lineHeight: 1.05,
  },

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

  field_group: { marginBottom: '20px' },

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
  button_disabled: {
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

export default function admin_login() {
  const navigate = useNavigate();

  // Form field values
  const [email, set_email] = useState('');
  const [password, set_password] = useState('');

  // UI feedback state
  const [error, set_error] = useState('');
  const [loading, set_loading] = useState(false);

  // Which input is currently focused (drives the red ring)
  const [focused, set_focused] = useState('');

  // ── Login handler ──────────────────────────────────────────────────────────
  const handle_login = async (e) => {
    e.preventDefault();
    set_loading(true);
    set_error('');

    try {
      const response = await client.post('panel/login/', { email, password });

      // Persist JWT tokens so authenticated API calls include them
      localStorage.setItem('access', response.data.access);
      localStorage.setItem('refresh', response.data.refresh);

      // Success — send admin to the dashboard
      navigate('/admin/dashboard');

    } catch (err) {
      // Map common HTTP error codes to readable messages
      if (err.response?.status === 401) {
        set_error('Invalid email or password.');
      } else if (err.response?.status === 403) {
        set_error('You do not have admin privileges.');
      } else {
        set_error('Something went wrong. Please try again.');
      }
    } finally {
      set_loading(false);
    }
  };

  // ── Input style — adds red focus ring when active ─────────────────────────
  const input_style = (name) => ({
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
          <div style={styles.glow_red} />
          <div style={styles.glow_gold} />

          {/* Logo + brand name */}
          <div style={styles.logo_row}>
            <img src="/Park Perfect Logo.png" alt="Park Perfect" style={styles.logo} />
            <div style={styles.brand_copy}>
              <p style={styles.eyebrow}>Fairfield University</p>
              <h1 style={styles.logo_text}>ParkPerfect</h1>
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
          <form onSubmit={handle_login}>

            {/* Email */}
            <div style={styles.field_group}>
              <label style={styles.label} htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => set_email(e.target.value)}
                onFocus={() => set_focused('email')}
                onBlur={() => set_focused('')}
                placeholder="admin@parkperfect.com"
                required
                style={input_style('email')}
              />
            </div>

            {/* Password */}
            <div style={styles.field_group}>
              <label style={styles.label} htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => set_password(e.target.value)}
                onFocus={() => set_focused('password')}
                onBlur={() => set_focused('')}
                placeholder="••••••••"
                required
                style={input_style('password')}
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
              style={loading ? styles.button_disabled : styles.button}
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



