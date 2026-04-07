import axios from 'axios';

let accessTokenGetter = () => null;
let unauthorizedHandler = null;

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export function setAccessTokenGetter(getter) {
  accessTokenGetter = typeof getter === 'function' ? getter : () => null;
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === 'function' ? handler : null;
}

api.interceptors.request.use((config) => {
  const token = accessTokenGetter();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.skipAuthRedirect) {
      unauthorizedHandler?.();
    }

    return Promise.reject(error);
  }
);

export default api;
