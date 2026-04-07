import {
  startTransition,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from 'react';
import L from 'leaflet';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { use_auth } from '../Auth_Context';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [40.7982, -77.8599];
const WS_URL = 'ws://localhost:8000/ws/map/';
// extracts readable error messages from API
function get_api_error(error, fallback_message) {
  const response_data = error.response?.data;

  if (response_data?.error) {
    return response_data.error;
  }

  if (typeof response_data?.detail === 'string') {
    return response_data.detail;
  }

  if (response_data && typeof response_data === 'object') {
    const [, value] = Object.entries(response_data)[0] ?? [];

    if (Array.isArray(value) && value[0]) {
      return value[0];
    }

    if (typeof value === 'string') {
      return value;
    }
  }

  return fallback_message;
}
// converts value to number. Used for total spaces as a safeguard, and especially used for lat and long of lots. 
function to_number(value, fallback = 0) {
  const parsed_value = Number(value);
  return Number.isFinite(parsed_value) ? parsed_value : fallback;
}
// normalizes a parking lot object from backend to be used for the map. 
function normalize_lot(lot, index) {
  const total_spaces = to_number(lot.total_spaces ?? lot.total_spaces, 0);
  const available_spaces = to_number(lot.available_spaces ?? lot.available_spaces, 0);
  const occupancy_rate =
    lot.occupancy_rate ?? lot.occupancy_rate ?? (total_spaces > 0
      ? ((total_spaces - available_spaces) / total_spaces) * 100
      : 0);

  return {
    available_spaces,
    id: lot.lot_id ?? lot.id ?? index,
    latitude: to_number(lot.latitude ?? lot.lat, DEFAULT_CENTER[0]),
    longitude: to_number(lot.longitude ?? lot.lng ?? lot.lon, DEFAULT_CENTER[1]),
    name: lot.name ?? `Lot ${index + 1}`,
    occupancy_rate: to_number(occupancy_rate, 0),
    total_spaces,
  };
}
//normalizes and sorts parking lots for the UI
function normalize_lots(payload) {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map(normalize_lot).sort((first_lot, second_lot) =>
    first_lot.name.localeCompare(second_lot.name)
  );
}
//Determines the UI styling based on lot availability
function get_availability_tone(lot) {
  const ratio = lot.total_spaces > 0 ? lot.available_spaces / lot.total_spaces : 0;

  if (ratio <= 0.1) {
    return {
      accent: '#ff5151',
      badge: 'Nearly full',
      marker: '#ff4141',
    };
  }

  if (ratio <= 0.35) {
    return {
      accent: '#ffb703',
      badge: 'Limited spots',
      marker: '#ff8f00',
    };
  }

  return {
    accent: '#49d17d',
    badge: 'Easy parking',
    marker: '#2bd06c',
  };
}
// Creates lot markers on the map. 
function create_lot_marker(lot) {
  const tone = get_availability_tone(lot);

  return L.divIcon({
    className: 'lot-pin__wrapper',
    html: `
      <div class="lot-pin" style="--lot-marker:${tone.marker}">
        <span>${lot.available_spaces}</span>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}
// adjust map bounds dynamially to encompass the lots. 
function map_bounds_controller({ lots }) {
  const map = useMap();
  const previous_signature_ref = useRef('');
//WebSocket connection for real-time updates. Includes automatic reconnection. 
  useEffect(() => {
    if (!lots.length) {
      map.setView(DEFAULT_CENTER, 15);
      previous_signature_ref.current = '';
      return;
    }

    const signature = lots
      .map((lot) => `${lot.id}:${lot.latitude}:${lot.longitude}`)
      .join('|');

    if (signature === previous_signature_ref.current) {
      return;
    }

    previous_signature_ref.current = signature;

    const bounds = lots.map((lot) => [lot.latitude, lot.longitude]);

    if (bounds.length === 1) {
      map.setView(bounds[0], 16);
      return;
    }

    map.fitBounds(bounds, {
      padding: [28, 28],
    });
  }, [lots, map]);

  return null;
}

const Map_Bounds_Controller = map_bounds_controller;
//Moves map to a user requested location.
function requested_center_controller({ request }) {
  const map = useMap();

  useEffect(() => {
    if (!request) {
      return;
    }

    map.flyTo(request.coordinates, 16, { duration: 0.9 });
  }, [map, request]);

  return null;
}

const Requested_Center_Controller = requested_center_controller;
// gets parking lot data from the backend API.
async function fetch_lots_from_api() {
  const response = await api.get('/parking/map/');
  return normalize_lots(response.data);
}
/**
 * 
 * Main map page component.
 * Handles real time updates using web socket
 * Handles user interactions for parking, leaving, subscribing to notifications, and using live location.
 * Displays parking lots on a map and in a list with availability and actions.
 */
export default function map_page() {
  const { current_parking_lot_id, logout, set_current_parking_lot_id, user } = use_auth();
  const navigate = useNavigate();
  const [lots, set_lots] = useState([]);
  const [fetch_error, set_fetch_error] = useState('');
  const [is_loading, set_is_loading] = useState(true);
  const [is_menu_open, set_is_menu_open] = useState(false);
  const [location_request, set_location_request] = useState(null);
  const [pending_actions, set_pending_actions] = useState({});
  const [page_notice, set_page_notice] = useState('');
  const [subscribed_lots, set_subscribed_lots] = useState({});
  const socket_ref = useRef(null);
  const reconnect_timer_ref = useRef(null);
  const manual_close_ref = useRef(false);
  const reconnect_attempt_ref = useRef(0);
  const load_lots_ref = useRef(async () => {});
  const rendered_lots = useDeferredValue(lots);

  const first_name = user?.first_name || 'Driver';

  load_lots_ref.current = async (show_loader = false) => {
    if (show_loader) {
      set_is_loading(true);
    }

    try {
      const next_lots = await fetch_lots_from_api();
      startTransition(() => {
        set_lots(next_lots);
      });
      set_fetch_error('');
    } catch (error) {
      set_fetch_error(get_api_error(error, 'Unable to load parking lots right now.'));
    } finally {
      if (show_loader) {
        set_is_loading(false);
      }
    }
  };

  useEffect(() => {
    load_lots_ref.current(true);
  }, []);

  useEffect(() => {
    manual_close_ref.current = false;

    const connect = () => {
      const socket = new WebSocket(WS_URL);
      socket_ref.current = socket;

      socket.onopen = () => {
        reconnect_attempt_ref.current = 0;
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload?.type === 'lot_update' && Array.isArray(payload.lots)) {
            startTransition(() => {
              set_lots(normalize_lots(payload.lots));
            });
            set_fetch_error('');
            return;
          }

          const notification_message =
            payload?.message ??
            payload?.notification?.message ??
            payload?.notification ??
            '';

          if (notification_message) {
            set_page_notice(notification_message);
          }
        } catch {
          set_page_notice('A live update could not be parsed.');
        }
      };

      socket.onerror = () => {
      };

      socket.onclose = () => {
        if (manual_close_ref.current) {
          return;
        }

        reconnect_attempt_ref.current += 1;

        const wait_time = Math.min(5000, reconnect_attempt_ref.current * 1200);
        reconnect_timer_ref.current = window.setTimeout(() => {
          load_lots_ref.current(false);
          connect();
        }, wait_time);
      };
    };

    connect();

    return () => {
      manual_close_ref.current = true;

      if (reconnect_timer_ref.current) {
        window.clearTimeout(reconnect_timer_ref.current);
      }

      if (socket_ref.current) {
        socket_ref.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!page_notice) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      set_page_notice('');
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [page_notice]);

  const set_action_pending = (key, isPending) => {
    set_pending_actions((current_state) => ({
      ...current_state,
      [key]: isPending,
    }));
  };
 // Handles user actions for parking and leaving lots, with validation and API calls. Also triggers a refresh of parking lot data after the action is completed.
  const handle_parking_action = async (lot_id, action) => {
    if (action === 'park' && current_parking_lot_id && current_parking_lot_id !== lot_id) {
      set_page_notice('Leave your current lot before parking somewhere else.');
      return;
    }

    if (action === 'park' && current_parking_lot_id === lot_id) {
      set_page_notice('You are already parked in this lot.');
      return;
    }

    if (action === 'leave' && current_parking_lot_id && current_parking_lot_id !== lot_id) {
      set_page_notice('You can only leave the lot where you are currently parked.');
      return;
    }

    const action_key = `${action}-${lot_id}`;
    set_action_pending(action_key, true);
    set_page_notice('');

    try {
      await api.post(`/parking/${action}/`, { lot_id: lot_id });
      if (action === 'park') {
        set_current_parking_lot_id(lot_id);
        set_page_notice('Parking recorded. Leave this lot before parking again.');
      } else {
        set_current_parking_lot_id(null);
        set_page_notice('Departure recorded.');
      }
      // loads parking lots from API
      await load_lots_ref.current(false);
    } catch (error) {
      set_page_notice(
        get_api_error(
          error,
          action === 'park' ? 'Unable to mark this car as parked.' : 'Unable to mark this car as left.'
        )
      );
    } finally {
      set_action_pending(action_key, false);
    }
  };
// Handles user subscribing to notifications for a specific parking lot
  const handle_subscribe = async (lot_id, lot_name) => {
    const action_key = `subscribe-${lot_id}`;
    set_action_pending(action_key, true);
    set_page_notice('');

    try {
      await api.post(`/notifications/subscribe/?lot_id=${lot_id}`);
      set_subscribed_lots((current_state) => ({
        ...current_state,
        [lot_id]: true,
      }));
      set_page_notice(`Subscribed to alerts for ${lot_name}.`);
    } catch (error) {
      set_page_notice(
        error.response?.status === 404
          ? 'The notification subscribe endpoint is not available in this backend yet.'
          : get_api_error(error, 'Unable to subscribe to lot alerts.')
      );
    } finally {
      set_action_pending(action_key, false);
    }
  };
// Handles user clicking the "Find Me" button to use live location. Requests geolocation permission and updates the map center if granted.
  const handle_use_my_location = () => {
    if (!navigator.geolocation) {
      set_page_notice('This browser does not support live location.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        set_location_request({
          coordinates: [position.coords.latitude, position.coords.longitude],
          timestamp: Date.now(),
        });
      },
      () => {
        set_page_notice('Location permission was denied.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
//logs the user out.
  const handle_logout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <main className="user-app">
      <section className="phone-shell map-shell">
        <header className="top-bar">
          <div>
            <p className="top-bar__eyebrow">Live parking</p>
            <h1 className="top-bar__title">Hi, {first_name}</h1>
          </div>

          <button
            aria-expanded={is_menu_open}
            aria-label="Open menu"
            className="icon-button icon-button--menu"
            onClick={() => set_is_menu_open((current_value) => !current_value)}
            type="button"
          >
            <span />
            <span />
            <span />
          </button>
        </header>

        {is_menu_open ? (
          <div className="menu-sheet">
            <Link className="menu-sheet__link" onClick={() => set_is_menu_open(false)} to="/settings">
              Settings
            </Link>
            <button className="menu-sheet__link menu-sheet__link--button" onClick={handle_logout} type="button">
              Log out
            </button>
          </div>
        ) : null}

        <section className="map-panel">
          <button className="location-chip" onClick={handle_use_my_location} type="button">
            Find Me
          </button>

          <MapContainer
            center={DEFAULT_CENTER}
            className="parking-map"
            scrollWheelZoom
            zoom={15}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Map_Bounds_Controller lots={rendered_lots} />
            <Requested_Center_Controller request={location_request} />

            {rendered_lots.map((lot) => (
              <Marker
                icon={create_lot_marker(lot)}
                key={lot.id}
                position={[lot.latitude, lot.longitude]}
              >
                <Popup>
                  <strong>{lot.name}</strong>
                  <br />
                  {lot.available_spaces} of {lot.total_spaces} spaces available
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </section>

        <section className="lots-panel">
          <div className="lots-panel__header">
            <div>
              <p className="section-kicker">Campus lots</p>
              <h2>Pick a spot and move fast.</h2>
            </div>
          </div>

          {current_parking_lot_id ? (
            <p className="form-message form-message--info">
              You already have an active parked lot. Leave that lot before parking anywhere else.
            </p>
          ) : null}
          {page_notice ? <p className="form-message form-message--info">{page_notice}</p> : null}
          {fetch_error ? <p className="form-message form-message--error">{fetch_error}</p> : null}
          {is_loading ? <p className="empty-state">Loading lot availability...</p> : null}
          {!is_loading && !rendered_lots.length ? (
            <p className="empty-state">No parking lots are available from the API right now.</p>
          ) : null}

          <div className="lot-list">
            {rendered_lots.map((lot) => {
              const tone = get_availability_tone(lot);
              const park_key = `park-${lot.id}`;
              const leave_key = `leave-${lot.id}`;
              const subscribe_key = `subscribe-${lot.id}`;
              const is_current_lot = current_parking_lot_id === lot.id;
              const park_disabled =
                Boolean(pending_actions[park_key]) ||
                lot.available_spaces <= 0 ||
                Boolean(current_parking_lot_id);
              const leave_disabled =
                Boolean(pending_actions[leave_key]) ||
                (Boolean(current_parking_lot_id) && !is_current_lot);

              return (
                <article className="lot-row" key={lot.id}>
                  <div className="lot-row__summary">
                    <div className="lot-row__title-wrap">
                      <h3>{lot.name}</h3>
                      <span className="availability-badge" style={{ '--availability-color': tone.accent }}>
                        {tone.badge}
                      </span>
                      {is_current_lot ? (
                        <span className="availability-badge availability-badge--active">
                          Your current lot
                        </span>
                      ) : null}
                    </div>

                    <div className="lot-row__metrics">
                      <p>
                        <strong>{lot.available_spaces}</strong> spots left
                      </p>
                      <p>{lot.total_spaces} total</p>
                    </div>
                  </div>

                  <div className="lot-row__actions">
                    <button
                      className="lot-action"
                      disabled={park_disabled}
                      onClick={() => handle_parking_action(lot.id, 'park')}
                      type="button"
                    >
                      {pending_actions[park_key]
                        ? 'Parking...'
                        : current_parking_lot_id
                          ? 'Parked'
                          : lot.available_spaces <= 0
                            ? 'Full'
                            : 'Park'}
                    </button>

                    <button
                      className="lot-action lot-action--secondary"
                      disabled={leave_disabled}
                      onClick={() => handle_parking_action(lot.id, 'leave')}
                      type="button"
                    >
                      {pending_actions[leave_key] ? 'Leaving...' : 'Leave'}
                    </button>

                    <button
                      className={`lot-action lot-action--icon ${
                        subscribed_lots[lot.id] ? 'lot-action--active' : ''
                      }`}
                      disabled={Boolean(pending_actions[subscribe_key]) || Boolean(subscribed_lots[lot.id])}
                      onClick={() => handle_subscribe(lot.id, lot.name)}
                      type="button"
                    >
                      {pending_actions[subscribe_key] ? '...' : subscribed_lots[lot.id] ? 'Bell on' : 'Alert'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}



