import axios from 'axios';

const client = axios.create({
    baseURL: 'http://localhost:8000/api/',
});

// Attach JWT token to every request
client.interceptors.request.use((config) => {
    const token = localStorage.getItem('access');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// If token is expired, clear storage and redirect to login
client.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('access');
            localStorage.removeItem('refresh');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default client;