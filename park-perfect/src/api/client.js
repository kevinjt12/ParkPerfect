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
        const request_url = error.config?.url ?? '';
        const is_login_request = request_url.includes('login/');
        const is_admin_request = request_url.includes('admin/') || request_url.includes('panel/');

        if (error.response?.status === 401 && !is_login_request) {
            localStorage.removeItem('access');
            localStorage.removeItem('refresh');
            window.location.href = is_admin_request ? '/admin/login' : '/login';
        }
        return Promise.reject(error);
    }
);

export default client;


