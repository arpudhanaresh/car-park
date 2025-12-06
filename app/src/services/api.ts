import axios from 'axios';

const API_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const auth = {
  login: (data: any) => {
    const formData = new FormData();
    formData.append('username', data.username);
    formData.append('password', data.password);
    return api.post('/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  },
  signup: (data: any) => api.post('/signup', data),
};

export const parking = {
  getLayout: () => api.get('/layout'),
  updateLayout: (data: any) => api.post('/admin/layout', data),
  bookSpot: (data: any) => api.post('/book', data),
  createBooking: (data: any) => api.post('/bookings', data),
  getUserBookings: () => api.get('/bookings'),
  getAllBookings: () => api.get('/admin/bookings'),
  cancelBooking: (id: number, reason: string) => api.delete(`/bookings/${id}`, { data: { cancellation_reason: reason } }),
};

export const vehicles = {
  getByLicense: (plate: string) => api.get(`/vehicles/${plate}`),
};

export default api;
