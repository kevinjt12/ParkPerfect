import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { use_auth } from '../Auth_Context';

function get_error_message(error) {
// Extracts user-friendly error messages from API responses, handling various formats and providing a default message if no specific information is available.
  const response_data = error.response?.data;
  // Backend error
  if (response_data?.error) {
    return response_data.error;
  }
  //Django validation errors like invalid email
  if (response_data && typeof response_data === 'object') {
    const [field, value] = Object.entries(response_data)[0] ?? [];

    if (Array.isArray(value) && value[0]) {
      return `${field}: ${value[0]}`;
    }

    if (typeof value === 'string') {
      return `${field}: ${value}`;
    }
  }
  //fallback error message
  return 'Unable to sign in right now. Please try again.';
}

export default function login_page() {
  //login page component for authentication
  // handles login, displays errors, and redirects after succesgul login
  const { is_authenticated, login } = use_auth();
  const navigate = useNavigate();
  const location = useLocation();

  // Form
  const [email, set_email] = useState('');
  const [password, set_password] = useState('');

  // UI state
  const [error_message, set_error_message] = useState('');
  const [is_submitting, set_is_submitting] = useState(false);
// redirect after login
  const destination = location.state?.from?.pathname || '/map';
// if already authenticated, redirect right away. 
  if (is_authenticated) {
    return <Navigate replace to={destination} />;
  }
  // handles submission for login. Calls authentication API
  const handle_submit = async (event) => {
    event.preventDefault();
    //Reset UI state
    set_error_message('');
    set_is_submitting(true);

    try {
      //attempting login with provided credentials. If successful, navigate to map page. If error occurs, display error message.
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
        {/* Branding Section */}
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
        {/* Page description */}

        <div className="auth-card__copy">
          <p className="auth-card__headline">Sign in to view live lot availability.</p>
          {/*<p className="auth-card__subhead">
            Perfect Parking is on the way.
          </p>*/}
        </div>
        {/* Login form */}
        <form className="auth-form" onSubmit={handle_submit}>

        {/* Email input */}
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
          {/* Password input */}
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
          {/*Display error message  */}
          {error_message ? <p className="form-message form-message--error">{error_message}</p> : null}
          {/* Submit button with loading state */}
          <button className="primary-button" disabled={is_submitting} type="submit">
            {is_submitting ? 'Signing in...' : 'Enter live map'}
          </button>
        </form>
      </section>
    </main>
  );
}


