import axios from 'axios';
import { API_BASE_URL } from '../config/api.js';

// Authentication must finish or return a recoverable error; never retry mutations.
export const AUTH_TIMEOUT_MS = 20000;
export default axios.create({ baseURL: API_BASE_URL, timeout: AUTH_TIMEOUT_MS });

export function getAuthErrorMessage(error, fallback = 'Không thể xác thực. Vui lòng thử lại.') {
  if (['ECONNABORTED', 'ETIMEDOUT'].includes(error?.code)) {
    return 'Máy chủ phản hồi quá lâu. Vui lòng kiểm tra kết nối rồi thử lại.';
  }
  if (!error?.response) return 'Không kết nối được máy chủ. Vui lòng thử lại sau.';
  const data = error.response.data;
  if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  if (typeof data === 'string' && data.trim()) return data;
  return fallback;
}
