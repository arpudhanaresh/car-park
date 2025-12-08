import axios from 'axios';

const API_URL = 'http://localhost:8000';
//const API_URL = 'https://car-api.arpudhacheck.me';

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
  getProfile: () => api.get('/users/me'),
};

export const parking = {
  getLayout: (start?: string, end?: string) => {
    let url = `/layout`;
    if (start && end) {
        url += `?start_time=${encodeURIComponent(start)}&end_time=${encodeURIComponent(end)}`;
    }
    return api.get(url);
  },
  updateLayout: (data: any) => api.post('/admin/layout', data),
  bookSpot: (data: any) => api.post('/book', data),
  createBooking: (data: any) => api.post('/bookings', data),
  getUserBookings: () => api.get('/bookings'),
  getAllBookings: () => api.get('/admin/bookings'),
  cancelBooking: (id: number, reason: string) => api.delete(`/bookings/${id}`, { data: { cancellation_reason: reason } }),
  closeBooking: (id: number) => api.post(`/admin/bookings/${id}/close`),
  checkPromo: (code: string) => api.post(`/promos/check?code=${code}`),
  getPublicConfig: () => api.get('/config/public'),
  initiatePayment: (bookingId: number) => api.post(`/payment/initiate/${bookingId}`),
};

export const vehicles = {
  getByLicense: (plate: string) => api.get(`/vehicles/${plate}`),
  getMyVehicles: () => api.get('/my-vehicles'),
  createOrUpdate: (data: any) => api.post('/vehicles', data),
};

export const admin = {
    getConfig: () => api.get('/admin/config'),
    updateConfig: (data: any) => api.post('/admin/config', data),
    getPromos: () => api.get('/admin/promos'),
    createPromo: (data: any) => api.post('/admin/promos', data),
    togglePromo: (id: number) => api.put(`/admin/promos/${id}/toggle`),
    deletePromo: (id: number) => api.delete(`/admin/promos/${id}`),
    updatePromo: (id: number, data: any) => api.put(`/admin/promos/${id}/update`, data),
    updateSpot: (id: number, data: any) => api.put(`/admin/spots/${id}`, data),
    getAnalytics: () => api.get('/admin/analytics'),
};

export default api;
