import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

// Add a response interceptor to handle token expiration (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
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
  forgotPassword: (email: string) => api.post('/forgot-password', { email }),
  verifyOtp: (email: string, otp: string) => api.post('/verify-otp', { email, otp }),
  resetPassword: (data: any) => api.post('/reset-password', data),
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
  getUserBookings: (page = 1, limit = 10) => api.get(`/bookings?page=${page}&limit=${limit}`),
  getAllBookings: (page = 1, limit = 10) => api.get(`/admin/bookings?page=${page}&limit=${limit}`),
  cancelBooking: (id: number, reason: string) => api.delete(`/bookings/${id}`, { data: { cancellation_reason: reason } }),
  getVehicles: () => api.get<any[]>('/vehicles'),
  deleteVehicle: (id: number) => api.delete(`/vehicles/${id}`),
  closeBooking: (id: number) => api.post(`/admin/bookings/${id}/close`),
  checkPromo: (code: string) => api.post(`/promos/check?code=${code}`),
  getPublicConfig: () => api.get('/config/public'),
  initiatePayment: (bookingId: number) => api.post(`/payment/initiate/${bookingId}`),
  checkPaymentStatus: (bookingId: number, orderId: string) => api.post(`/payment/check-status/${bookingId}?order_id=${orderId}`),
  downloadReceipt: (bookingId: number) => api.get(`/bookings/${bookingId}/receipt`, { responseType: 'blob' }),
};

export const vehicles = {
  getByLicense: (plate: string) => api.get(`/vehicles/${plate}`),
  getMyVehicles: () => api.get<any[]>('/vehicles'),
  create: (data: any) => api.post('/vehicles', data),
  update: (id: number, data: any) => api.put(`/vehicles/${id}`, data),
  delete: (id: number) => api.delete(`/vehicles/${id}`),
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
    toggleSpotBlock: (id: number) => api.put(`/admin/spots/${id}/toggle-block`),
    getAnalytics: () => api.get('/admin/analytics'),
    calculateExitFee: (bookingId: number) => api.post(`/admin/bookings/${bookingId}/calculate-exit`),
    completeBooking: (bookingId: number, data: any) => api.post(`/admin/bookings/${bookingId}/complete`, data),
    notifyOverstay: (bookingId: number) => api.post(`/admin/bookings/${bookingId}/notify-overstay`),
    processRefund: (bookingId: number) => api.post(`/admin/bookings/${bookingId}/refund`),
};

export default api;
