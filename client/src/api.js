import axios from 'axios';
const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || '/api' });
api.interceptors.request.use((c) => { const t = localStorage.getItem('token'); if (t) c.headers.Authorization = 'Bearer ' + t; return c; });
api.interceptors.response.use((r) => r, (e) => {
  if (e.response?.status === 401 && !location.pathname.startsWith('/login')) { localStorage.clear(); location.href = '/login'; }
  return Promise.reject(e);
});
export const errMsg = (e) => e.response?.data?.message || 'Could not reach the server. Check your connection and try again.';
export default api;
