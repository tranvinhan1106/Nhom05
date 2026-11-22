import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

test('guest tier page and initial offer page render honest states without fabricated member data', async () => {
  const server = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    appType: 'custom',
    resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
    plugins: [{
      name: 'isolate-page-from-global-header-chat',
      enforce: 'pre',
      transform(_source, id) {
        if (id.replaceAll('\\', '/').endsWith('/layout/UserLayout.jsx')) {
          return 'export default function TestLayout({children}) { return children; }';
        }
      },
    }],
  });
  const render = async (path) => {
    const { default: Component } = await server.ssrLoadModule(path);
    return renderToStaticMarkup(React.createElement(MemoryRouter, {}, React.createElement(Component)));
  };
  try {
    const tiers = await render('/src/components/user/HangTv.jsx');
    assert.match(tiers, /Bạn đang xem quyền lợi các hạng/);
    assert.match(tiers, /Đăng nhập để xem hạng/);
    assert.doesNotMatch(tiers, /Reader Pass|id#C00007|alex99|Đã Đạt Chuẩn|Chỉ còn 0 cuốn/);
    const offers = await render('/src/components/user/UuDai.jsx');
    assert.equal((offers.match(/Đang tải ưu đãi/g) || []).length, 4);
    const footer = await render('/src/components/user/layout/UserFooter.jsx');
    assert.doesNotMatch(footer, /data=HALMBookApp/);
    assert.match(footer, /Liên kết mở ứng dụng sẽ được cập nhật/);
  } finally { await server.close(); }
});
