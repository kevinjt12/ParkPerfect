import axios from 'axios';

let access_token_getter = () => null;
let unauthorized_handler = null;

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export function set_access_token_getter(getter) {
  access_token_getter = typeof getter === 'function' ? getter : () => null;
}

export function set_unauthorized_handler(handler) {
  unauthorized_handler = typeof handler === 'function' ? handler : null;
}

api.interceptors.request.use((config) => {
  const token = access_token_getter();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.skip_auth_redirect) {
      unauthorized_handler?.();
    }

    return Promise.reject(error);
  }
);

export default api;


