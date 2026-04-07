import { createContext, createElement, useContext, useEffect, useState } from 'react';
import api, { set_access_token_getter, set_unauthorized_handler } from './api';

const Auth_Context = createContext(null);

function auth_provider({ children }) {
  const [auth_state, set_auth_state] = useState({
    access_token: null,
    current_parking_lot_id: null,
    refresh_token: null,
    user: null,
  });

  useEffect(() => {
    set_access_token_getter(() => auth_state.access_token);
  }, [auth_state.access_token]);

  useEffect(() => {
    const clear_auth = () => {
      set_auth_state({
        access_token: null,
        current_parking_lot_id: null,
        refresh_token: null,
        user: null,
      });
    };

    set_unauthorized_handler(clear_auth);

    return () => {
      set_unauthorized_handler(null);
    };
  }, []);

  const login = async (email, password) => {
    const response = await api.post(
      '/auth/login/',
      { email, password },
      { skip_auth_redirect: true }
    );

    set_auth_state({
      access_token: response.data.access ?? null,
      current_parking_lot_id: null,
      refresh_token: response.data.refresh ?? null,
      user: response.data.user ?? null,
    });

    return response.data;
  };

  const logout = async () => {
    const refresh_token = auth_state.refresh_token;

    try {
      if (refresh_token) {
        await api.post('/auth/logout/', { refresh: refresh_token }, { skip_auth_redirect: true });
      }
    } catch {
      // Clear client auth even if the server logout request fails.
    } finally {
      set_auth_state({
        access_token: null,
        current_parking_lot_id: null,
        refresh_token: null,
        user: null,
      });
    }
  };

  const update_user = (updater) => {
    set_auth_state((current_state) => ({
      ...current_state,
      user: typeof updater === 'function' ? updater(current_state.user) : updater,
    }));
  };

  const set_current_parking_lot_id = (lot_id) => {
    set_auth_state((current_state) => ({
      ...current_state,
      current_parking_lot_id: lot_id,
    }));
  };

  return createElement(
    Auth_Context.Provider,
    {
      value: {
        access_token: auth_state.access_token,
        current_parking_lot_id: auth_state.current_parking_lot_id,
        is_authenticated: Boolean(auth_state.access_token),
        login,
        logout,
        refresh_token: auth_state.refresh_token,
        set_current_parking_lot_id,
        update_user,
        user: auth_state.user,
      },
    },
    children
  );
}

export function use_auth() {
  const context = useContext(Auth_Context);

  if (!context) {
    throw new Error('use_auth must be used inside an Auth_Provider.');
  }

  return context;
}

export { auth_provider as Auth_Provider };


