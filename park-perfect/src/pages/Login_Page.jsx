import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { use_auth } from '../Auth_Context';

function get_error_message(error) {
  const response_data = error.response?.data;

  if (response_data?.error) {
    return response_data.error;
  }

  if (response_data && typeof response_data === 'object') {
    const [field, value] = Object.entries(response_data)[0] ?? [];

    if (Array.isArray(value) && value[0]) {
      return `${field}: ${value[0]}`;
    }

    if (typeof value === 'string') {
      return `${field}: ${value}`;
    }
  }

  return 'Unable to sign in right now. Please try again.';
}

export default function login_page() {
  const { is_authenticated, login } = use_auth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, set_email] = useState('');
  const [password, set_password] = useState('');
  const [error_message, set_error_message] = useState('');
  const [is_submitting, set_is_submitting] = useState(false);

  const destination = location.state?.from?.pathname || '/map';

  if (is_authenticated) {
    return <Navigate replace to={destination} />;
  }

  const handle_submit = async (event) => {
    event.preventDefault();
    set_error_message('');
    set_is_submitting(true);

    try {
      await login(email, password);
      navigate('/map', { replace: true });
    } catch (error) {
      set_error_message(get_error_message(error));
    } finally {
      set_is_submitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-label="Park Perfect login">
        <div className="auth-card__brand">
          <img
            alt="Park Perfect"
            className="auth-card__logo"
            src="/Park Perfect Logo.png"
          />
          <div className="auth-card__brand-copy">
            <p className="auth-card__eyebrow">Fairfield University</p>
            <h1>ParkPerfect</h1>
          </div>
        </div>

        <div className="auth-card__copy">
          <p className="auth-card__headline">Sign in to view live lot availability.</p>
          {/*<p className="auth-card__subhead">
            Perfect Parking is on the way.
          </p>*/}
        </div>

        <form className="auth-form" onSubmit={handle_submit}>
          <label className="field">
            <span>Email</span>
            <input
              autoComplete="email"
              name="email"
              onChange={(event) => set_email(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              name="password"
              onChange={(event) => set_password(event.target.value)}
              placeholder="Enter your password"
              required
              type="password"
              value={password}
            />
          </label>

          {error_message ? <p className="form-message form-message--error">{error_message}</p> : null}

          <button className="primary-button" disabled={is_submitting} type="submit">
            {is_submitting ? 'Signing in...' : 'Enter live map'}
          </button>
        </form>
      </section>
    </main>
  );
}


