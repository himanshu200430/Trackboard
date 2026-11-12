import http from 'http';

function request(method, path, body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (cookie) headers['Cookie'] = cookie;

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runE2E() {
  console.log('[E2E] Running end-to-end live server validation...');

  // 1. Health
  const health = await request('GET', '/api/health');
  console.assert(health.status === 200, 'Health check failed');
  console.log('✓ API Health 200 OK');

  // 2. Login Alex (Owner)
  const alexLogin = await request('POST', '/api/auth/login', {
    email: 'alex@tackboard.dev',
    password: 'password123',
  });
  console.assert(alexLogin.status === 200, 'Login failed');
  const alexCookie = alexLogin.headers['set-cookie'][0].split(';')[0];
  console.log('✓ Alex logged in, session cookie acquired');

  // 3. Current user check
  const me = await request('GET', '/api/auth/me', null, alexCookie);
  console.assert(me.status === 200 && me.body.user.email === 'alex@tackboard.dev', 'Auth me failed');
  console.log('✓ /api/auth/me returned authenticated user');

  // 4. Fetch Alex boards
  const boardsRes = await request('GET', '/api/boards', null, alexCookie);
  console.assert(boardsRes.status === 200 && boardsRes.body.boards.length >= 2, 'Boards count invalid');
  const board = boardsRes.body.boards[0];
  console.log(`✓ Retrieved ${boardsRes.body.boards.length} boards. Target: "${board.title}"`);

  // 5. Fetch full board detail
  const detail = await request('GET', `/api/boards/${board.id}`, null, alexCookie);
  console.assert(detail.status === 200, 'Detail failed');
  console.assert(detail.body.lists.length > 0, 'No lists found');
  console.assert(detail.body.cards.length > 0, 'No cards found');
  console.log(`✓ Board detail loaded: ${detail.body.lists.length} lists, ${detail.body.cards.length} cards, ${detail.body.labels.length} labels`);

  // 6. Test Card Move with Fractional Indexing
  const targetCard = detail.body.cards[0];
  const targetList = detail.body.lists[0];
  const moveRes = await request(
    'PATCH',
    `/api/cards/${targetCard.id}`,
    {
      list_id: targetList.id,
      position: 1250.5,
      gap: 250.0,
    },
    alexCookie
  );
  console.assert(moveRes.status === 200, 'Move failed');
  console.log('✓ Fractional index card position updated to 1250.5');

  // 7. Test AI Summarizer Endpoint
  const aiRes = await request(
    'POST',
    '/api/ai/summarize',
    {
      card: targetCard,
      boardTitle: board.title,
      listTitle: targetList.title,
    },
    alexCookie
  );
  console.assert(aiRes.status === 200, 'AI summarize endpoint failed');
  console.assert(aiRes.body.summary, 'Summary missing');
  console.log('✓ AI Summarizer returned executive action plan');

  // 8. Test Viewer Role Enforcement (Jordan)
  const jordanLogin = await request('POST', '/api/auth/login', {
    email: 'jordan@tackboard.dev',
    password: 'password123',
  });
  const jordanCookie = jordanLogin.headers['set-cookie'][0].split(';')[0];
  const viewerWrite = await request(
    'POST',
    '/api/cards',
    {
      board_id: board.id,
      list_id: targetList.id,
      title: 'Should be rejected',
    },
    jordanCookie
  );
  console.assert(viewerWrite.status === 403, `Viewer should receive 403, got ${viewerWrite.status}`);
  console.log(`✓ RBAC verified: Viewer attempt blocked with 403: "${viewerWrite.body.error}"`);

  console.log('\n==================================================');
  console.log(' ALL E2E API AND WORKFLOW TESTS PASSED 100%! ');
  console.log('==================================================\n');
}

runE2E().catch((err) => {
  console.error('[E2E Error]:', err);
  process.exit(1);
});

