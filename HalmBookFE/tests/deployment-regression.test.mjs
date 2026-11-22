import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { validateBuildApiUrl } from '../src/config/deployment.js';
import { getAppDownloadUrl } from '../src/config/appLinks.js';
import { membershipProgress } from '../src/utils/membershipProgress.js';
import authRequest, { getAuthErrorMessage } from '../src/services/authRequest.js';

test('public builds reject missing, local, insecure and malformed backend configuration', () => {
  for (const value of [undefined, '', 'localhost:8082', 'https://localhost', 'https://127.0.0.1', 'https://[::1]', 'https://192.168.1.4', 'http://api.example.com', 'https://api.example.com/api', 'https://user:secret@api.example.com', 'https://api.example.com?key=secret']) {
    assert.throws(() => validateBuildApiUrl(value, { publicDeployment: true }));
  }
  assert.equal(validateBuildApiUrl(' https://api.example.com/ ', { publicDeployment: true }), 'https://api.example.com');
  assert.equal(validateBuildApiUrl('http://localhost:8082'), 'http://localhost:8082');
});

test('QR links require a real supported URL and preserve the Expo deep link', () => {
  for (const appDownloadUrl of ['', 'HALMBookApp', 'javascript:alert(1)', 'http://example.com', 'https://user:secret@example.com']) {
    assert.equal(getAppDownloadUrl({ appDownloadUrl }), null);
  }
  assert.equal(getAppDownloadUrl({ appDownloadUrl: 'exp://example.exp.direct' }), 'exp://example.exp.direct');
  assert.equal(getAppDownloadUrl({ appDownloadUrl: 'https://expo.dev/@demo/app' }), 'https://expo.dev/@demo/app');
});

test('unknown membership is distinct from zero progress and remaining values match targets', () => {
  assert.equal(membershipProgress(null), null);
  assert.deepEqual(membershipProgress({ booksReadCount: 3, totalPoints: 100 }), {
    booksRequired: 10, booksRemaining: 7, pointsRemaining: 400, percent: 30,
  });
  assert.equal(membershipProgress({ booksReadCount: 0, totalPoints: 0 }).percent, 0);
  assert.equal(membershipProgress({ booksReadCount: 4, totalPoints: 300, booksRequiredForNext: 20, pointsRequiredForNext: 600 }).booksRemaining, 16);
  assert.equal(membershipProgress({ booksRemainingForNext: 0 }).booksRemaining, 0);
  assert.equal(membershipProgress({ booksReadCount: 999 }, 4).percent, 100);
  assert.equal(membershipProgress({ overallProgressPercent: 120 }).percent, 100);
});

test('authentication times out, preserves HTTP errors and recovers on a subsequent request', async () => {
  const server = http.createServer((req, res) => {
    if (req.url === '/slow') return;
    if (req.url === '/denied') { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ message: 'Sai mật khẩu' })); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":true}');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseURL = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.ok(authRequest.defaults.timeout > 0 && authRequest.defaults.timeout <= 20000);
    await assert.rejects(authRequest.post('/slow', {}, { baseURL, timeout: 50, proxy: false }), error => {
      assert.match(getAuthErrorMessage(error), /phản hồi quá lâu/); return true;
    });
    await assert.rejects(authRequest.post('/denied', {}, { baseURL, proxy: false }), error => {
      assert.equal(getAuthErrorMessage(error), 'Sai mật khẩu'); return true;
    });
    assert.equal((await authRequest.post('/ok', {}, { baseURL, proxy: false })).data.ok, true);
    assert.match(getAuthErrorMessage({ code: 'ERR_NETWORK' }), /Không kết nối/);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
