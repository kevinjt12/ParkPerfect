import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

function getErrorMessage(error) {
  const responseData = error.response?.data;

  if (responseData?.error) {
    return responseData.error;
  }

  if (responseData && typeof responseData === 'object') {
    const [field, value] = Object.entries(responseData)[0] ?? [];

    if (Array.isArray(value) && value[0]) {
      return `${field}: ${value[0]}`;
    }

    if (typeof value === 'string') {
      return `${field}: ${value}`;
    }
  }

  return 'Unable to sign in right now. Please try again.';
}

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const destination = location.state?.from?.pathname || '/map';

  if (isAuthenticated) {
    return <Navigate replace to={destination} />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/map', { replace: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
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

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              autoComplete="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
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
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              type="password"
              value={password}
            />
          </label>

          {errorMessage ? <p className="form-message form-message--error">{errorMessage}</p> : null}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Signing in...' : 'Enter live map'}
          </button>
        </form>
      </section>
    </main>
  );
}
