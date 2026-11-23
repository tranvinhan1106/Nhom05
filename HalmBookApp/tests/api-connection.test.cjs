const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const http = require('node:http');
const { once } = require('node:events');
const { test } = require('node:test');
const ts = require('typescript');
const { apiOrigin, probeBackend } = require('../scripts/start-connected.cjs');

function load(name, mocks, extra = {}) {
  const source = fs.readFileSync(__dirname + '/../src/ux-ui/' + name + '.ts', 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { exports: {}, URL, console, process: { env: {} }, require: key => {
    assert.ok(key in mocks, 'Unexpected dependency: ' + key); return mocks[key];
  }, ...extra };
  vm.runInNewContext(code, context);
  return context.exports;
}
function connection({ env = {}, host = '192.168.1.20:8081', handler = async () => ({ data: [] }) } = {}) {
  return load('apiService', {
    'expo-constants': { __esModule: true, default: { expoConfig: { hostUri: host } } },
    'react-native': { Platform: { OS: 'android' } }, axios: { __esModule: true, default: handler },
  }, { process: { env } });
}

test('Expo tunnel requires an explicit backend and never becomes an API host', () => {
  assert.throws(() => connection({ host: 'demo.on.expo.app' }), /EXPO_PUBLIC_API_URL/);
  const api = connection({ host: 'demo.on.expo.app', env: { EXPO_PUBLIC_API_URL: ' https://api.example.com/ ' } });
  assert.equal(api.API_BASE_URL, 'https://api.example.com');
  assert.equal(api.CANDIDATE_API_URLS.join(','), 'https://api.example.com');
  assert.equal(connection({ host: 'localhost:8081' }).API_BASE_URL, 'http://10.0.2.2:8082');
});

test('backend configuration rejects screen paths, credentials and Expo URLs', () => {
  const api = connection();
  for (const url of ['https://api.example.com/api', 'https://api.example.com/uudai', 'exp://demo.on.expo.app', 'https://demo.on.expo.app', 'https://user:secret@api.example.com', 'https://api.example.com?token=secret']) {
    assert.throws(() => api.normalizeApiOrigin(url)); assert.throws(() => apiOrigin(url));
  }
  assert.equal(apiOrigin(' https://api.example.com/ '), 'https://api.example.com');
});

test('stale local and Quick Tunnel assets rebase to the active backend, signed external URLs stay intact', () => {
  const api = connection({ env: { EXPO_PUBLIC_API_URL: 'https://current.example.com' } });
  for (const url of ['http://192.168.10.190:8082/uploads/a.jpg', 'http://10.0.2.2:8082/uploads/a.jpg', 'https://old.trycloudflare.com/uploads/a.jpg', '/uploads/a.jpg', 'uploads/a.jpg']) {
    assert.equal(api.normalizeAssetUrl(url), 'https://current.example.com/uploads/a.jpg');
  }
  for (const url of ['https://res.cloudinary.com/demo/a.jpg?signature=abc', 'file:///cover.jpg', 'content://media/cover', 'data:image/png;base64,AA==']) assert.equal(api.normalizeAssetUrl(url), url);
  assert.equal(api.normalizeAssetUrl('javascript:alert(1)'), '');
  const covers = load('bookCovers', { './apiService': api });
  assert.equal(covers.getBookCoverSource('B0001'), null);
  assert.equal(covers.getBookCoverSource('B0001', 'content://media/cover').uri, 'content://media/cover');
});

test('404s retain HTTP status with an actionable path; wrong-host HTML is not treated as data', async () => {
  const error = Object.assign(new Error('Request failed with status code 404'), { response: { status: 404 } });
  let calls = 0;
  const api = connection({ handler: async () => { calls++; throw error; } });
  await assert.rejects(api.fetchApiWithFallback('/api/home/offers'), value => value === error && value.response.status === 404 && value.message.includes('/api/home/offers'));
  await assert.rejects(api.fetchApiWithFallback('/uudai'));
  assert.equal(calls, 1);
  const html = connection({ handler: async () => ({ data: '<!DOCTYPE html><html>frontend</html>' }) });
  await assert.rejects(html.fetchApiWithFallback('/api/home/books'), /trang web thay vì dữ liệu API/);
});

test('search follows the real paginated catalogue and propagates failures instead of probing a missing search endpoint', async () => {
  const calls = [];
  const service = load('searchCatalog', { './apiService': { fetchApiWithFallback: async (path, config) => {
    calls.push({ path, config }); return { data: { content: [{ book_id: 'book-' + config.params.page }], totalPages: 2 } };
  } } });
  const signal = new AbortController().signal;
  assert.equal((await service.loadSearchCatalog(signal)).map(book => book.book_id).join(','), 'book-0,book-1');
  assert.ok(calls.every(call => call.path === '/api/home/books' && call.config.signal === signal));
  assert.equal(calls.map(call => call.config.params.page).join(','), '0,1');
  const unavailable = load('searchCatalog', { './apiService': { fetchApiWithFallback: async () => { throw new Error('offline'); } } });
  await assert.rejects(unavailable.loadSearchCatalog(), /offline/);
});

test('upload categories use the public category endpoint', async () => {
  let called;
  const service = load('uploadBookService', {
    './apiService': { API_BASE_URL: 'https://api.example.com' },
    axios: { __esModule: true, default: { get: async url => { called = url; return { data: [{ category_id: 13, category_name: 'Thật' }] }; } } },
  });
  assert.equal((await service.fetchBookCategories())[0].category_id, 13);
  assert.equal(called, 'https://api.example.com/api/home/categories');
});

test('launch preflight distinguishes a healthy backend from frontend HTML and missing API routes', async () => {
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/html/')) { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<html>web</html>'); return; }
    if (req.url.startsWith('/missing/')) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"content":[]}');
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    await probeBackend(base);
    await assert.rejects(probeBackend(base + '/html'), /trang web thay vì JSON/);
    await assert.rejects(probeBackend(base + '/missing'), /HTTP 404/);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
