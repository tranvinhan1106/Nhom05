import Constants from 'expo-constants';
import { Platform } from 'react-native';
import axios, { AxiosRequestConfig } from 'axios';

export function normalizeApiOrigin(value: string): string {
  let url: URL;
  try { url = new URL(value.trim()); } catch {
    throw new Error('EXPO_PUBLIC_API_URL phải là URL HTTP(S) đầy đủ của backend.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash
    || url.pathname.replace(/\/+$/, '') !== '') {
    throw new Error('EXPO_PUBLIC_API_URL chỉ chứa origin backend, không thêm /api, đường dẫn, query hoặc thông tin đăng nhập.');
  }
  if (isExpoHost(url.hostname)) throw new Error('URL Expo dùng để mở app. EXPO_PUBLIC_API_URL phải trỏ tới backend.');
  return url.origin;
}

function isExpoHost(host: string): boolean {
  return /(?:^|\.)(?:exp\.direct|on\.expo\.app|expo\.dev)$/i.test(host);
}

function isLocalHost(host: string): boolean {
  return host === 'localhost' || host.endsWith('.localhost') || host === '[::1]'
    || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
}

// A Metro tunnel is not an API server. Never probe unrelated LAN hosts with a user's JWT.
export const resolveApiBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL?.trim()) {
    return normalizeApiOrigin(process.env.EXPO_PUBLIC_API_URL);
  }
  const debuggerHost = Constants.expoConfig?.hostUri;
  let host = debuggerHost ? new URL(`http://${debuggerHost}`).hostname : 'localhost';
  if (isExpoHost(host)) {
    throw new Error('Đang chạy Expo qua tunnel. Hãy đặt EXPO_PUBLIC_API_URL bằng URL backend trước khi mở app.');
  }
  if (Platform.OS === 'android' && ['localhost', '127.0.0.1'].includes(host)) host = '10.0.2.2';
  return `http://${host}:8082`;
};

export const API_BASE_URL = resolveApiBaseUrl();

export const CANDIDATE_API_URLS: string[] = [API_BASE_URL];

export const normalizeAssetUrl = (value: string, baseUrl = API_BASE_URL): string => {
  if (!value?.trim()) return '';
  const clean = value.trim();
  if (/^(file:|content:|blob:|data:)/i.test(clean)) return clean;
  let url: URL;
  try { url = new URL(clean, baseUrl + '/'); } catch { return ''; }
  if (!['http:', 'https:'].includes(url.protocol)) return '';
  const backendAsset = /^\/(?:uploads\/|api\/home\/covers\/)/.test(url.pathname);
  if (backendAsset && (isLocalHost(url.hostname) || url.hostname.endsWith('.trycloudflare.com'))) {
    return baseUrl + url.pathname + url.search + url.hash;
  }
  return url.href;
};

/**
 * Compatibility name retained for callers. One request to the configured backend;
 * mutations are never retried automatically, including after a timeout.
 */
export async function fetchApiWithFallback<T = any>(
  endpoint: string,
  config: AxiosRequestConfig = {}
): Promise<{ data: T; baseUrl: string }> {
  if (!endpoint.startsWith('/api/') || endpoint.includes('://') || endpoint.startsWith('/api/api/')) {
    throw new Error('Đường dẫn API không hợp lệ; chỉ dùng endpoint /api/ của backend.');
  }
  try {
    const response = await axios({ ...config, url: API_BASE_URL + endpoint, timeout: config.timeout ?? 10000 });
    if (typeof response.data === 'string' && /^\s*(?:<!doctype html|<html)/i.test(response.data)) {
      throw new Error('Máy chủ trả về trang web thay vì dữ liệu API. Kiểm tra EXPO_PUBLIC_API_URL đang trỏ tới backend.');
    }
    return { data: response.data, baseUrl: API_BASE_URL };
  } catch (error: any) {
    if (error?.response?.status === 404) {
      error.message = `Không tìm thấy API ${endpoint.split('?')[0]} trên backend. Kiểm tra URL backend và phiên bản API.`;
    }
    throw error;
  }
}
