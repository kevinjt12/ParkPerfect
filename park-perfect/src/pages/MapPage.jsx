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
import { useAuth } from '../AuthContext';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [40.7982, -77.8599];
const WS_URL = 'ws://localhost:8000/ws/map/';

function getApiError(error, fallbackMessage) {
  const responseData = error.response?.data;

  if (responseData?.error) {
    return responseData.error;
  }

  if (typeof responseData?.detail === 'string') {
    return responseData.detail;
  }

  if (responseData && typeof responseData === 'object') {
    const [, value] = Object.entries(responseData)[0] ?? [];

    if (Array.isArray(value) && value[0]) {
      return value[0];
    }

    if (typeof value === 'string') {
      return value;
    }
  }

  return fallbackMessage;
}

function toNumber(value, fallback = 0) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function normalizeLot(lot, index) {
  const totalSpaces = toNumber(lot.totalSpaces ?? lot.total_spaces, 0);
  const availableSpaces = toNumber(lot.availableSpaces ?? lot.available_spaces, 0);
  const occupancyRate =
    lot.occupancyRate ?? lot.occupancy_rate ?? (totalSpaces > 0
      ? ((totalSpaces - availableSpaces) / totalSpaces) * 100
      : 0);

  return {
    availableSpaces,
    id: lot.lotID ?? lot.id ?? index,
    latitude: toNumber(lot.latitude ?? lot.lat, DEFAULT_CENTER[0]),
    longitude: toNumber(lot.longitude ?? lot.lng ?? lot.lon, DEFAULT_CENTER[1]),
    name: lot.name ?? `Lot ${index + 1}`,
    occupancyRate: toNumber(occupancyRate, 0),
    totalSpaces,
  };
}

function normalizeLots(payload) {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map(normalizeLot).sort((firstLot, secondLot) =>
    firstLot.name.localeCompare(secondLot.name)
  );
}

function getAvailabilityTone(lot) {
  const ratio = lot.totalSpaces > 0 ? lot.availableSpaces / lot.totalSpaces : 0;

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

function createLotMarker(lot) {
  const tone = getAvailabilityTone(lot);

  return L.divIcon({
    className: 'lot-pin__wrapper',
    html: `
      <div class="lot-pin" style="--lot-marker:${tone.marker}">
        <span>${lot.availableSpaces}</span>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

function MapBoundsController({ lots }) {
  const map = useMap();
  const previousSignatureRef = useRef('');

  useEffect(() => {
    if (!lots.length) {
      map.setView(DEFAULT_CENTER, 15);
      previousSignatureRef.current = '';
      return;
    }

    const signature = lots
      .map((lot) => `${lot.id}:${lot.latitude}:${lot.longitude}`)
      .join('|');

    if (signature === previousSignatureRef.current) {
      return;
    }

    previousSignatureRef.current = signature;

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

function RequestedCenterController({ request }) {
  const map = useMap();

  useEffect(() => {
    if (!request) {
      return;
    }

    map.flyTo(request.coordinates, 16, { duration: 0.9 });
  }, [map, request]);

  return null;
}

async function fetchLotsFromApi() {
  const response = await api.get('/parking/map/');
  return normalizeLots(response.data);
}

export default function MapPage() {
  const { currentParkingLotId, logout, setCurrentParkingLotId, user } = useAuth();
  const navigate = useNavigate();
  const [lots, setLots] = useState([]);
  const [fetchError, setFetchError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [locationRequest, setLocationRequest] = useState(null);
  const [pendingActions, setPendingActions] = useState({});
  const [pageNotice, setPageNotice] = useState('');
  const [subscribedLots, setSubscribedLots] = useState({});
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const manualCloseRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const loadLotsRef = useRef(async () => {});
  const renderedLots = useDeferredValue(lots);

  const firstName = user?.firstName || 'Driver';

  loadLotsRef.current = async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      const nextLots = await fetchLotsFromApi();
      startTransition(() => {
        setLots(nextLots);
      });
      setFetchError('');
    } catch (error) {
      setFetchError(getApiError(error, 'Unable to load parking lots right now.'));
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadLotsRef.current(true);
  }, []);

  useEffect(() => {
    manualCloseRef.current = false;

    const connect = () => {
      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttemptRef.current = 0;
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload?.type === 'lot_update' && Array.isArray(payload.lots)) {
            startTransition(() => {
              setLots(normalizeLots(payload.lots));
            });
            setFetchError('');
            return;
          }

          const notificationMessage =
            payload?.message ??
            payload?.notification?.message ??
            payload?.notification ??
            '';

          if (notificationMessage) {
            setPageNotice(notificationMessage);
          }
        } catch {
          setPageNotice('A live update could not be parsed.');
        }
      };

      socket.onerror = () => {
      };

      socket.onclose = () => {
        if (manualCloseRef.current) {
          return;
        }

        reconnectAttemptRef.current += 1;

        const waitTime = Math.min(5000, reconnectAttemptRef.current * 1200);
        reconnectTimerRef.current = window.setTimeout(() => {
          loadLotsRef.current(false);
          connect();
        }, waitTime);
      };
    };

    connect();

    return () => {
      manualCloseRef.current = true;

      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }

      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!pageNotice) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setPageNotice('');
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [pageNotice]);

  const setActionPending = (key, isPending) => {
    setPendingActions((currentState) => ({
      ...currentState,
      [key]: isPending,
    }));
  };

  const handleParkingAction = async (lotId, action) => {
    if (action === 'park' && currentParkingLotId && currentParkingLotId !== lotId) {
      setPageNotice('Leave your current lot before parking somewhere else.');
      return;
    }

    if (action === 'park' && currentParkingLotId === lotId) {
      setPageNotice('You are already parked in this lot.');
      return;
    }

    if (action === 'leave' && currentParkingLotId && currentParkingLotId !== lotId) {
      setPageNotice('You can only leave the lot where you are currently parked.');
      return;
    }

    const actionKey = `${action}-${lotId}`;
    setActionPending(actionKey, true);
    setPageNotice('');

    try {
      await api.post(`/parking/${action}/`, { lot_id: lotId });
      if (action === 'park') {
        setCurrentParkingLotId(lotId);
        setPageNotice('Parking recorded. Leave this lot before parking again.');
      } else {
        setCurrentParkingLotId(null);
        setPageNotice('Departure recorded.');
      }
      await loadLotsRef.current(false);
    } catch (error) {
      setPageNotice(
        getApiError(
          error,
          action === 'park' ? 'Unable to mark this car as parked.' : 'Unable to mark this car as left.'
        )
      );
    } finally {
      setActionPending(actionKey, false);
    }
  };

  const handleSubscribe = async (lotId, lotName) => {
    const actionKey = `subscribe-${lotId}`;
    setActionPending(actionKey, true);
    setPageNotice('');

    try {
      await api.post(`/notifications/subscribe/?lot_id=${lotId}`);
      setSubscribedLots((currentState) => ({
        ...currentState,
        [lotId]: true,
      }));
      setPageNotice(`Subscribed to alerts for ${lotName}.`);
    } catch (error) {
      setPageNotice(
        error.response?.status === 404
          ? 'The notification subscribe endpoint is not available in this backend yet.'
          : getApiError(error, 'Unable to subscribe to lot alerts.')
      );
    } finally {
      setActionPending(actionKey, false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setPageNotice('This browser does not support live location.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationRequest({
          coordinates: [position.coords.latitude, position.coords.longitude],
          timestamp: Date.now(),
        });
      },
      () => {
        setPageNotice('Location permission was denied.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <main className="user-app">
      <section className="phone-shell map-shell">
        <header className="top-bar">
          <div>
            <p className="top-bar__eyebrow">Live parking</p>
            <h1 className="top-bar__title">Hi, {firstName}</h1>
          </div>

          <button
            aria-expanded={isMenuOpen}
            aria-label="Open menu"
            className="icon-button icon-button--menu"
            onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
            type="button"
          >
            <span />
            <span />
            <span />
          </button>
        </header>

        {isMenuOpen ? (
          <div className="menu-sheet">
            <Link className="menu-sheet__link" onClick={() => setIsMenuOpen(false)} to="/settings">
              Settings
            </Link>
            <button className="menu-sheet__link menu-sheet__link--button" onClick={handleLogout} type="button">
              Log out
            </button>
          </div>
        ) : null}

        <section className="map-panel">
          <button className="location-chip" onClick={handleUseMyLocation} type="button">
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
            <MapBoundsController lots={renderedLots} />
            <RequestedCenterController request={locationRequest} />

            {renderedLots.map((lot) => (
              <Marker
                icon={createLotMarker(lot)}
                key={lot.id}
                position={[lot.latitude, lot.longitude]}
              >
                <Popup>
                  <strong>{lot.name}</strong>
                  <br />
                  {lot.availableSpaces} of {lot.totalSpaces} spaces available
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

          {currentParkingLotId ? (
            <p className="form-message form-message--info">
              You already have an active parked lot. Leave that lot before parking anywhere else.
            </p>
          ) : null}
          {pageNotice ? <p className="form-message form-message--info">{pageNotice}</p> : null}
          {fetchError ? <p className="form-message form-message--error">{fetchError}</p> : null}
          {isLoading ? <p className="empty-state">Loading lot availability...</p> : null}
          {!isLoading && !renderedLots.length ? (
            <p className="empty-state">No parking lots are available from the API right now.</p>
          ) : null}

          <div className="lot-list">
            {renderedLots.map((lot) => {
              const tone = getAvailabilityTone(lot);
              const parkKey = `park-${lot.id}`;
              const leaveKey = `leave-${lot.id}`;
              const subscribeKey = `subscribe-${lot.id}`;
              const isCurrentLot = currentParkingLotId === lot.id;
              const parkDisabled =
                Boolean(pendingActions[parkKey]) ||
                lot.availableSpaces <= 0 ||
                Boolean(currentParkingLotId);
              const leaveDisabled =
                Boolean(pendingActions[leaveKey]) ||
                (Boolean(currentParkingLotId) && !isCurrentLot);

              return (
                <article className="lot-row" key={lot.id}>
                  <div className="lot-row__summary">
                    <div className="lot-row__title-wrap">
                      <h3>{lot.name}</h3>
                      <span className="availability-badge" style={{ '--availability-color': tone.accent }}>
                        {tone.badge}
                      </span>
                      {isCurrentLot ? (
                        <span className="availability-badge availability-badge--active">
                          Your current lot
                        </span>
                      ) : null}
                    </div>

                    <div className="lot-row__metrics">
                      <p>
                        <strong>{lot.availableSpaces}</strong> spots left
                      </p>
                      <p>{lot.totalSpaces} total</p>
                    </div>
                  </div>

                  <div className="lot-row__actions">
                    <button
                      className="lot-action"
                      disabled={parkDisabled}
                      onClick={() => handleParkingAction(lot.id, 'park')}
                      type="button"
                    >
                      {pendingActions[parkKey]
                        ? 'Parking...'
                        : currentParkingLotId
                          ? 'Parked'
                          : lot.availableSpaces <= 0
                            ? 'Full'
                            : 'Park'}
                    </button>

                    <button
                      className="lot-action lot-action--secondary"
                      disabled={leaveDisabled}
                      onClick={() => handleParkingAction(lot.id, 'leave')}
                      type="button"
                    >
                      {pendingActions[leaveKey] ? 'Leaving...' : 'Leave'}
                    </button>

                    <button
                      className={`lot-action lot-action--icon ${
                        subscribedLots[lot.id] ? 'lot-action--active' : ''
                      }`}
                      disabled={Boolean(pendingActions[subscribeKey]) || Boolean(subscribedLots[lot.id])}
                      onClick={() => handleSubscribe(lot.id, lot.name)}
                      type="button"
                    >
                      {pendingActions[subscribeKey] ? '...' : subscribedLots[lot.id] ? 'Bell on' : 'Alert'}
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
