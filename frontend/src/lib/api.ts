import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token automatically
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  },
);

export default api;

// ---- API Helper Functions ----

export const campaignApi = {
  getActive: () => api.get('/campaigns/active'),
  getById: (id: string) => api.get(`/campaigns/${id}`),
  list: () => api.get('/campaigns'),
  create: (data: object) => api.post('/campaigns', data),
  update: (id: string, data: object) => api.put(`/campaigns/${id}`, data),
  activate: (id: string) => api.patch(`/campaigns/${id}/activate`),
  deactivate: (id: string) => api.patch(`/campaigns/${id}/deactivate`),
  delete: (id: string) => api.delete(`/campaigns/${id}`),
  getParticipants: (id: string, params?: object) =>
    api.get(`/campaigns/${id}/participants`, { params }),
};

export const userApi = {
  register: (data: object) => api.post('/users/register', data),
  scratch: (data: object) => api.post('/users/scratch', data),
};

export const couponApi = {
  generate: (data: object) => api.post('/coupons/generate', data),
  verify: (couponNo: string) => api.get(`/coupons/verify/${couponNo}`),
  redeem: (data: object) => api.post('/coupons/redeem', data),
  dashboard: (campaignId: string) => api.get(`/coupons/campaign/${campaignId}/dashboard`),
  list: (campaignId: string, params?: object) =>
    api.get(`/coupons/campaign/${campaignId}`, { params }),
  update: (id: string, data: object) => api.put(`/coupons/${id}`, data),
  delete: (id: string) => api.delete(`/coupons/${id}`),
};

export const authApi = {
  login: (data: object) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};
