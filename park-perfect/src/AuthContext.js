import { createContext, createElement, useContext, useEffect, useState } from 'react';
import api, { setAccessTokenGetter, setUnauthorizedHandler } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState({
    accessToken: null,
    currentParkingLotId: null,
    refreshToken: null,
    user: null,
  });

  useEffect(() => {
    setAccessTokenGetter(() => authState.accessToken);
  }, [authState.accessToken]);

  useEffect(() => {
    const clearAuth = () => {
      setAuthState({
        accessToken: null,
        currentParkingLotId: null,
        refreshToken: null,
        user: null,
      });
    };

    setUnauthorizedHandler(clearAuth);

    return () => {
      setUnauthorizedHandler(null);
    };
  }, []);

  const login = async (email, password) => {
    const response = await api.post(
      '/auth/login/',
      { email, password },
      { skipAuthRedirect: true }
    );

    setAuthState({
      accessToken: response.data.access ?? null,
      currentParkingLotId: null,
      refreshToken: response.data.refresh ?? null,
      user: response.data.user ?? null,
    });

    return response.data;
  };

  const logout = async () => {
    const refreshToken = authState.refreshToken;

    try {
      if (refreshToken) {
        await api.post('/auth/logout/', { refresh: refreshToken }, { skipAuthRedirect: true });
      }
    } catch {
      // Clear client auth even if the server logout request fails.
    } finally {
      setAuthState({
        accessToken: null,
        currentParkingLotId: null,
        refreshToken: null,
        user: null,
      });
    }
  };

  const updateUser = (updater) => {
    setAuthState((currentState) => ({
      ...currentState,
      user: typeof updater === 'function' ? updater(currentState.user) : updater,
    }));
  };

  const setCurrentParkingLotId = (lotId) => {
    setAuthState((currentState) => ({
      ...currentState,
      currentParkingLotId: lotId,
    }));
  };

  return createElement(
    AuthContext.Provider,
    {
      value: {
        accessToken: authState.accessToken,
        currentParkingLotId: authState.currentParkingLotId,
        isAuthenticated: Boolean(authState.accessToken),
        login,
        logout,
        refreshToken: authState.refreshToken,
        setCurrentParkingLotId,
        updateUser,
        user: authState.user,
      },
    },
    children
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }

  return context;
}
