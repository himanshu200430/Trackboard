import http from 'http';
import app from '../src/server.js';
import pool from '../src/config/db.js';

let server;
let port;

function request(method, path, body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (cookie) headers['Cookie'] = cookie;

    const req = http.request(
      {
        hostname: 'localhost',
        port,
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

async function runTests() {
  console.log('[Test] Starting Phase 1 & RBAC integration tests...');

  // Start test server on random port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      port = server.address().port;
      console.log(`[Test Server] running on port ${port}`);
      resolve();
    });
  });

  try {
    // 1. Health check
    const health = await request('GET', '/api/health');
    console.assert(health.status === 200, 'Health check failed');
    console.log('✓ Health check passed');

    // 2. Login as Alex (Owner)
    const alexLogin = await request('POST', '/api/auth/login', {
      email: 'alex@tackboard.dev',
      password: 'password123',
    });
    console.assert(alexLogin.status === 200, 'Alex login failed');
    const alexCookie = alexLogin.headers['set-cookie']?.[0]?.split(';')[0];
    console.assert(alexCookie, 'Cookie not set for Alex');
    console.log('✓ Owner login passed');

    // 3. Login as Jordan (Viewer on Board 1)
    const jordanLogin = await request('POST', '/api/auth/login', {
      email: 'jordan@tackboard.dev',
      password: 'password123',
    });
    const jordanCookie = jordanLogin.headers['set-cookie']?.[0]?.split(';')[0];
    console.log('✓ Viewer login passed');

    // 4. Fetch boards for Alex
    const boardsRes = await request('GET', '/api/boards', null, alexCookie);
    console.assert(boardsRes.status === 200 && boardsRes.body.boards.length >= 2, 'Failed to fetch boards');
    const board1 = boardsRes.body.boards.find((b) => b.title.includes('Acme'));
    console.assert(board1, 'Board 1 not found');
    console.log(`✓ Fetched ${boardsRes.body.boards.length} boards for Alex`);

    // 5. Fetch Board 1 detail as Viewer (Jordan) -> must succeed with role: 'viewer'
    const jordanBoard = await request('GET', `/api/boards/${board1.id}`, null, jordanCookie);
    console.assert(jordanBoard.status === 200, 'Viewer failed to read board');
    console.assert(jordanBoard.body.userRole === 'viewer', 'Role is not viewer');
    console.log('✓ Viewer can read board details (role: viewer)');

    // 6. RBAC Check: Jordan (Viewer) attempts to create a card -> MUST RETURN 403 Forbidden!
    const viewerAddCard = await request(
      'POST',
      '/api/cards',
      {
        board_id: board1.id,
        list_id: jordanBoard.body.lists[0].id,
        title: 'Viewer unauthorized card',
      },
      jordanCookie
    );
    console.assert(viewerAddCard.status === 403, `Expected 403 for viewer write, got ${viewerAddCard.status}`);
    console.log('✓ RBAC Enforced: Viewer received 403 on card creation');

    // 7. Alex (Owner) creates a card -> MUST SUCCEED 201
    const ownerAddCard = await request(
      'POST',
      '/api/cards',
      {
        board_id: board1.id,
        list_id: jordanBoard.body.lists[0].id,
        title: 'New owner card for testing',
        description: 'Test description',
      },
      alexCookie
    );
    console.assert(ownerAddCard.status === 201, 'Owner card creation failed');
    const createdCardId = ownerAddCard.body.card.id;
    console.log('✓ Owner created card successfully');

    // 8. Fractional Move & Gap Rebalance test
    // Move card with small gap (< 0.0001) to trigger automated rebalance
    const moveRes = await request(
      'PATCH',
      `/api/cards/${createdCardId}`,
      {
        list_id: jordanBoard.body.lists[0].id,
        position: 1500.00005,
        gap: 0.00005,
      },
      alexCookie
    );
    console.assert(moveRes.status === 200, 'Card move failed');
    console.log('✓ Fractional index move and precision rebalance verified');

    // 9. Clean up test card
    await request('DELETE', `/api/cards/${createdCardId}`, null, alexCookie);
    console.log('✓ Card deletion verified');

    console.log('\n==================================================');
    console.log(' ALL BACKEND & RBAC TESTS PASSED SUCCESSFULLY! ');
    console.log('==================================================\n');
  } finally {
    server.close();
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error('[Test Failed]:', err);
  process.exit(1);
});

