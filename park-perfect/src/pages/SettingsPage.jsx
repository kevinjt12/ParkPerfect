import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';

function getErrorMessage(error, fallbackMessage) {
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

  return fallbackMessage;
}

export default function SettingsPage() {
  const { logout, updateUser, user } = useAuth();
  const navigate = useNavigate();
  const [formState, setFormState] = useState({
    currentPassword: '',
    email: '',
    firstName: '',
    lastName: '',
    newPassword: '',
    plateNumber: '',
    plateState: '',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const vehicle = user?.vehicles?.[0];

    setFormState((currentState) => ({
      ...currentState,
      email: user?.email ?? '',
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      plateNumber: vehicle?.licensePlateNumber ?? '',
      plateState: vehicle?.licensePlateState ?? '',
    }));
  }, [user]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormState((currentState) => ({
      ...currentState,
      [name]: value,
    }));
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSaving(true);

    const trimmedFirstName = formState.firstName.trim();
    const trimmedLastName = formState.lastName.trim();
    const trimmedEmail = formState.email.trim();
    const trimmedPlateNumber = formState.plateNumber.trim().toUpperCase();
    const trimmedPlateState = formState.plateState.trim().toUpperCase();
    const updates = [];
    const nextUser = user ? { ...user } : null;

    if (!trimmedFirstName || !trimmedLastName) {
      setErrorMessage('First and last name are required.');
      setIsSaving(false);
      return;
    }

    if ((formState.newPassword && !formState.currentPassword) || (!formState.newPassword && formState.currentPassword)) {
      setErrorMessage('Enter both current and new passwords to update your password.');
      setIsSaving(false);
      return;
    }

    try {
      if (trimmedFirstName !== user?.firstName || trimmedLastName !== user?.lastName) {
        const response = await api.patch('/user/name/', {
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
        });

        if (nextUser) {
          nextUser.firstName = response.data.user?.firstName ?? trimmedFirstName;
          nextUser.lastName = response.data.user?.lastName ?? trimmedLastName;
        }

        updates.push('Name saved');
      }

      if (trimmedEmail !== user?.email) {
        const response = await api.patch('/user/email/', { email: trimmedEmail });

        if (nextUser) {
          nextUser.email = response.data.user?.email ?? trimmedEmail;
        }

        updates.push('Email saved');
      }

      if (formState.newPassword) {
        await api.patch('/user/password/', {
          currentPassword: formState.currentPassword,
          newPassword: formState.newPassword,
        });

        updates.push('Password saved');
      }

      const existingVehicle = user?.vehicles?.[0];
      const plateChanged =
        trimmedPlateNumber !== (existingVehicle?.licensePlateNumber ?? '') ||
        trimmedPlateState !== (existingVehicle?.licensePlateState ?? '');

      if (plateChanged) {
        const response = await api.patch('/user/plate/', {
          licensePlateNumber: trimmedPlateNumber,
          licensePlateState: trimmedPlateState,
        });

        if (nextUser) {
          nextUser.vehicles = [
            {
              vehicleID: existingVehicle?.vehicleID ?? nextUser.vehicles?.[0]?.vehicleID,
              licensePlateNumber:
                response.data.vehicle?.licensePlateNumber ?? trimmedPlateNumber,
              licensePlateState:
                response.data.vehicle?.licensePlateState ?? trimmedPlateState,
            },
          ];
        }

        updates.push('Plate saved');
      }

      if (!updates.length) {
        setSuccessMessage('No changes were needed.');
      } else {
        if (nextUser) {
          updateUser(nextUser);
        }

        setSuccessMessage(updates.join(' | '));
      }

      setFormState((currentState) => ({
        ...currentState,
        currentPassword: '',
        newPassword: '',
        plateNumber: trimmedPlateNumber,
        plateState: trimmedPlateState,
      }));
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to update your settings right now.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="user-app">
      <section className="phone-shell settings-shell">
        <header className="settings-header">
          <div>
            <p className="top-bar__eyebrow">Account</p>
            <h1 className="top-bar__title">Settings</h1>
          </div>

          <div className="settings-header__actions">
            <Link className="text-link" to="/map">
              Back to map
            </Link>
            <button className="text-link text-link--button" onClick={handleLogout} type="button">
              Log out
            </button>
          </div>
        </header>

        <form className="settings-form" onSubmit={handleSubmit}>
          <section className="settings-group">
            <div className="settings-group__header">
              <p className="section-kicker">Name</p>
              <h2>Keep your driver profile current.</h2>
            </div>

            <div className="settings-grid">
              <label className="field">
                <span>First name</span>
                <input name="firstName" onChange={handleChange} required type="text" value={formState.firstName} />
              </label>

              <label className="field">
                <span>Last name</span>
                <input name="lastName" onChange={handleChange} required type="text" value={formState.lastName} />
              </label>

              <label className="field field--full">
                <span>Email</span>
                <input name="email" onChange={handleChange} required type="email" value={formState.email} />
              </label>
            </div>
          </section>

          <section className="settings-group">
            <div className="settings-group__header">
              <p className="section-kicker">Password</p>
              <h2>Need to Change?</h2>
            </div>

            <div className="settings-grid">
              <label className="field field--full">
                <span>Current password</span>
                <input
                  name="currentPassword"
                  onChange={handleChange}
                  placeholder="Required to confirm a password change"
                  type="password"
                  value={formState.currentPassword}
                />
              </label>

              <label className="field field--full">
                <span>New password</span>
                <input
                  name="newPassword"
                  onChange={handleChange}
                  placeholder="Minimum 8 characters"
                  type="password"
                  value={formState.newPassword}
                />
              </label>
            </div>
          </section>

          <section className="settings-group">
            <div className="settings-group__header">
              <p className="section-kicker">Plate</p>
              <h2>New Vehicle? Let us know.</h2>
            </div>

            <div className="settings-grid">
              <label className="field">
                <span>Plate number</span>
                <input
                  maxLength="20"
                  name="plateNumber"
                  onChange={handleChange}
                  placeholder="ABC1234"
                  type="text"
                  value={formState.plateNumber}
                />
              </label>

              <label className="field">
                <span>State</span>
                <input
                  maxLength="2"
                  name="plateState"
                  onChange={handleChange}
                  placeholder="PA"
                  type="text"
                  value={formState.plateState}
                />
              </label>
            </div>
          </section>

          {errorMessage ? <p className="form-message form-message--error">{errorMessage}</p> : null}
          {successMessage ? <p className="form-message form-message--success">{successMessage}</p> : null}

          <button className="primary-button" disabled={isSaving} type="submit">
            {isSaving ? 'Saving...' : 'Save settings'}
          </button>
        </form>
      </section>
    </main>
  );
}
