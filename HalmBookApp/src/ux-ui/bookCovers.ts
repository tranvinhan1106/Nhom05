import { API_BASE_URL, normalizeAssetUrl } from './apiService';

export { API_BASE_URL };

export const getBookCoverSource = (_bookId?: string, remoteUrl?: string): any => {
  // Covers must come from catalog metadata; book IDs are not image filenames.
  const uri = typeof remoteUrl === 'string' ? normalizeAssetUrl(remoteUrl) : '';
  return uri ? { uri } : null;
};
