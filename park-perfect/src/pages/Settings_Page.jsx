import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { use_auth } from '../Auth_Context';
// gets error messages from API
function get_error_message(error, fallback_message) {
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

  return fallback_message;
}
// Main settings page component. Allows users to update their name, email, password, and vehicle information. Handles form state, validation, API calls, and displays success/error messages.
export default function settings_page() {
  const { logout, update_user, user } = use_auth();
  const navigate = useNavigate();
  // local form state used to control all inputs on the page.
  const [form_state, set_form_state] = useState({
    current_password: '',
    email: '',
    first_name: '',
    last_name: '',
    new_password: '',
    plate_number: '',
    plate_state: '',
  });
  //UI feedback for error/success messages and loading state for when the form is being submitted.
  const [error_message, set_error_message] = useState('');
  const [is_saving, set_is_saving] = useState(false);
  const [success_message, set_success_message] = useState('');
// populate the form when the authenticated user changes. Pulls the first registered vehicle to user
  useEffect(() => {
    const vehicle = user?.vehicles?.[0];

    set_form_state((current_state) => ({
      ...current_state,
      email: user?.email ?? '',
      first_name: user?.first_name ?? '',
      last_name: user?.last_name ?? '',
      plate_number: vehicle?.license_plate_number ?? '',
      plate_state: vehicle?.license_plate_state ?? '',
    }));
  }, [user]);
// input handler for all form fields.
  const handle_change = (event) => {
    const { name, value } = event.target;

    set_form_state((current_state) => ({
      ...current_state,
      [name]: value,
    }));
  };
// logs the user out
  const handle_logout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };
// handles form submission. Validates input, makes API calls to update user information, and provides feedback on the success or failure of the updates.
  const handle_submit = async (event) => {
    event.preventDefault();
    set_error_message('');
    set_success_message('');
    set_is_saving(true);
//normalize user input before sending to backend
    const trimmed_first_name = form_state.first_name.trim();
    const trimmed_last_name = form_state.last_name.trim();
    const trimmed_email = form_state.email.trim();
    const trimmed_plate_number = form_state.plate_number.trim().toUpperCase();
    const trimmed_plate_state = form_state.plate_state.trim().toUpperCase();
    //tracks which sections are succesfully updated.
    const updates = [];
    //local copy of current user so frontend authentication state can be refreshed after.
    const next_user = user ? { ...user } : null;
    // basic validation of name fields.
    if (!trimmed_first_name || !trimmed_last_name) {
      set_error_message('First and last name are required.');
      set_is_saving(false);
      return;
    }
    // basic validation for password updates. Requires both current and new password to be entered to proceed with update.
    if ((form_state.new_password && !form_state.current_password) || (!form_state.new_password && form_state.current_password)) {
      set_error_message('Enter both current and new passwords to update your password.');
      set_is_saving(false);
      return;
    }

    try {
      //update name only if it changed
      if (trimmed_first_name !== user?.first_name || trimmed_last_name !== user?.last_name) {
        const response = await api.patch('/user/name/', {
          first_name: trimmed_first_name,
          last_name: trimmed_last_name,
        });

        if (next_user) {
          next_user.first_name = response.data.user?.first_name ?? trimmed_first_name;
          next_user.last_name = response.data.user?.last_name ?? trimmed_last_name;
        }

        updates.push('Name saved');
      }
      // update email only if it changed

      if (trimmed_email !== user?.email) {
        const response = await api.patch('/user/email/', { email: trimmed_email });

        if (next_user) {
          next_user.email = response.data.user?.email ?? trimmed_email;
        }

        updates.push('Email saved');
      }
      //update passwor donly when a new password was entered
      if (form_state.new_password) {
        await api.patch('/user/password/', {
          current_password: form_state.current_password,
          new_password: form_state.new_password,
        });

        updates.push('Password saved');
      }
      //compare current vehicle plate infor to dtect changes. Uses first vehicle on the user profile
      const existing_vehicle = user?.vehicles?.[0];
      const plate_changed =
        trimmed_plate_number !== (existing_vehicle?.license_plate_number ?? '') ||
        trimmed_plate_state !== (existing_vehicle?.license_plate_state ?? '');
      // update plate info only if it changed. 
      if (plate_changed) {
        const response = await api.patch('/user/plate/', {
          license_plate_number: trimmed_plate_number,
          license_plate_state: trimmed_plate_state,
        });

        if (next_user) {
          next_user.vehicles = [
            {
              vehicle_id: existing_vehicle?.vehicle_id ?? next_user.vehicles?.[0]?.vehicle_id,
              license_plate_number:
                response.data.vehicle?.license_plate_number ?? trimmed_plate_number,
              license_plate_state:
                response.data.vehicle?.license_plate_state ?? trimmed_plate_state,
            },
          ];
        }

        updates.push('Plate saved');
      }
      // if nothing changed. tell user.
      if (!updates.length) {
        set_success_message('No changes were needed.');
      } else {
        if (next_user) {
          update_user(next_user);
        }

        set_success_message(updates.join(' | '));
      }
// clear password fields after submission for security.
      set_form_state((current_state) => ({
        ...current_state,
        current_password: '',
        new_password: '',
        plate_number: trimmed_plate_number,
        plate_state: trimmed_plate_state,
      }));
    } catch (error) {
      set_error_message(get_error_message(error, 'Unable to update your settings right now.'));
    } finally {
      set_is_saving(false);
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
            <button className="text-link text-link--button" onClick={handle_logout} type="button">
              Log out
            </button>
          </div>
        </header>
 {/* Profile information section */}
        <form className="settings-form" onSubmit={handle_submit}>
          <section className="settings-group">
            <div className="settings-group__header">
              <p className="section-kicker">Name</p>
              <h2>Keep your driver profile current.</h2>
            </div>

            <div className="settings-grid">
              <label className="field">
                <span>First name</span>
                <input name="first_name" onChange={handle_change} required type="text" value={form_state.first_name} />
              </label>

              <label className="field">
                <span>Last name</span>
                <input name="last_name" onChange={handle_change} required type="text" value={form_state.last_name} />
              </label>

              <label className="field field--full">
                <span>Email</span>
                <input name="email" onChange={handle_change} required type="email" value={form_state.email} />
              </label>
            </div>
          </section>
          {/* Password update section */}

          <section className="settings-group">
            <div className="settings-group__header">
              <p className="section-kicker">Password</p>
              <h2>Need to Change?</h2>
            </div>

            <div className="settings-grid">
              <label className="field field--full">
                <span>Current password</span>
                <input
                  name="current_password"
                  onChange={handle_change}
                  placeholder="Required to confirm a password change"
                  type="password"
                  value={form_state.current_password}
                />
              </label>

              <label className="field field--full">
                <span>New password</span>
                <input
                  name="new_password"
                  onChange={handle_change}
                  placeholder="Minimum 8 characters"
                  type="password"
                  value={form_state.new_password}
                />
              </label>
            </div>
          </section>
          {/* Vehicle registration section */}

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
                  name="plate_number"
                  onChange={handle_change}
                  placeholder="ABC1234"
                  type="text"
                  value={form_state.plate_number}
                />
              </label>

              <label className="field">
                <span>State</span>
                <input
                  maxLength="2"
                  name="plate_state"
                  onChange={handle_change}
                  placeholder="PA"
                  type="text"
                  value={form_state.plate_state}
                />
              </label>
            </div>
          </section>
          {/* Feedback messages for save operations */}

          {error_message ? <p className="form-message form-message--error">{error_message}</p> : null}
          {success_message ? <p className="form-message form-message--success">{success_message}</p> : null}
          {/* Submit button shows loading state while save requests are in progress */}

          <button className="primary-button" disabled={is_saving} type="submit">
            {is_saving ? 'Saving...' : 'Save settings'}
          </button>
        </form>
      </section>
    </main>
  );
}


