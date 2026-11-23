import { fetchApiWithFallback } from './apiService';

/** The backend exposes a paginated catalogue, not /api/books/search. */
export async function loadSearchCatalog(signal?: AbortSignal): Promise<any[]> {
  const books: any[] = [];
  let page = 0;
  let totalPages = 1;
  do {
    const { data } = await fetchApiWithFallback('/api/home/books', {
      params: { page, size: 100 }, signal,
    });
    if (Array.isArray(data)) return data;
    if (!Array.isArray(data?.content) || !Number.isSafeInteger(data.totalPages) || data.totalPages < 0) {
      throw new Error('Dữ liệu danh mục tìm kiếm không hợp lệ.');
    }
    books.push(...data.content);
    totalPages = data.totalPages;
    page++;
  } while (page < totalPages);
  return books;
}
