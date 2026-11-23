const { parseArgs } = require('node:util');
const { spawn } = require('node:child_process');
const path = require('node:path');

function apiOrigin(value) {
  if (!value?.trim()) throw new Error('Cần --api <URL backend> hoặc EXPO_PUBLIC_API_URL. Không dùng URL mở app hay URL frontend.');
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error('URL backend phải có http:// hoặc https://.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname.replace(/\/+$/, '')
    || /(?:^|\.)(?:exp\.direct|on\.expo\.app|expo\.dev)$/i.test(url.hostname)) {
    throw new Error('Chỉ dùng origin của backend, không thêm /api hoặc đường dẫn màn hình.');
  }
  return url.origin;
}

async function probeBackend(origin) {
  const response = await fetch(origin + '/api/home/books?size=1', { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Backend trả HTTP ${response.status}. Kiểm tra backend và Cloudflare Tunnel trước khi mở Expo.`);
  const type = response.headers.get('content-type') || '';
  if (!type.includes('json')) throw new Error('Địa chỉ trả về trang web thay vì JSON. Hãy dùng URL backend, không dùng link Vercel hoặc Expo.');
  const data = await response.json();
  if (!Array.isArray(data) && !Array.isArray(data?.content)) throw new Error('Backend không trả danh mục sách hợp lệ.');
}

async function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({ args, options: {
    api: { type: 'string' }, port: { type: 'string', default: '8083' },
    lan: { type: 'boolean' }, clear: { type: 'boolean' }, check: { type: 'boolean' },
  } });
  const origin = apiOrigin(values.api || process.env.EXPO_PUBLIC_API_URL);
  const port = Number(values.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535 || port === 8082) throw new Error('Chọn cổng Metro hợp lệ khác cổng backend 8082.');
  await probeBackend(origin);
  console.log('Backend OK: ' + origin);
  if (values.check) return;
  const cliArgs = ['start', '--go', values.lan ? '--lan' : '--tunnel', '--port', String(port), '--max-workers', '2'];
  if (values.clear) cliArgs.push('--clear');
  const child = spawn(process.execPath, [require.resolve('expo/bin/cli'), ...cliArgs], {
    cwd: path.resolve(__dirname, '..'), stdio: 'inherit', windowsHide: true,
    env: { ...process.env, EXPO_PUBLIC_API_URL: origin },
  });
  child.on('error', error => { console.error(error.message); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code || 0; });
  process.on('SIGINT', () => child.kill('SIGINT'));
}

module.exports = { apiOrigin, probeBackend, main };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
