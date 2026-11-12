import bcrypt from 'bcryptjs';
import pool, { withTransaction } from '../src/config/db.js';

async function seed() {
  console.log('[Seed] Starting Tackboard realistic database seed...');

  try {
    await withTransaction(async (client) => {
      // 1. Clean existing tables (in order due to foreign keys)
      console.log('[Seed] Clearing existing records...');
      await client.query('TRUNCATE TABLE card_attachments, notifications, card_comments, card_labels, cards, labels, lists, board_members, boards, users CASCADE');

      // 2. Insert 3 demo users
      console.log('[Seed] Creating demo users...');
      const passwordHash = await bcrypt.hash('password123', 10);

      const u1 = await client.query(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, name, email`,
        ['Alex Rivera', 'alex@tackboard.dev', passwordHash]
      );
      const alex = u1.rows[0];

      const u2 = await client.query(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, name, email`,
        ['Sam Chen', 'sam@tackboard.dev', passwordHash]
      );
      const sam = u2.rows[0];

      const u3 = await client.query(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, name, email`,
        ['Jordan Taylor', 'jordan@tackboard.dev', passwordHash]
      );
      const jordan = u3.rows[0];

      console.log(`[Seed] Demo users created:
  - Owner:  alex@tackboard.dev   (password: password123)
  - Member: sam@tackboard.dev    (password: password123)
  - Viewer: jordan@tackboard.dev (password: password123)`);

      // ----------------------------------------------------------------------
      // BOARD 1: Acme Mobile App Redesign (Terracotta)
      // ----------------------------------------------------------------------
      console.log('[Seed] Creating Board 1: Acme Mobile App Redesign...');
      const b1 = await client.query(
        `INSERT INTO boards (title, color, owner_id)
         VALUES ($1, $2, $3)
         RETURNING id, title, color`,
        ['Acme Mobile App Redesign', '#C85A32', alex.id]
      );
      const board1 = b1.rows[0];

      // Board 1 Members: Alex (owner), Sam (member), Jordan (viewer)
      await client.query(
        `INSERT INTO board_members (board_id, user_id, role)
         VALUES 
          ($1, $2, 'owner'),
          ($1, $3, 'member'),
          ($1, $4, 'viewer')`,
        [board1.id, alex.id, sam.id, jordan.id]
      );

      // Board 1 Labels
      const lblDesign = (await client.query(
        `INSERT INTO labels (board_id, name, color) VALUES ($1, 'Design System', '#B87B28') RETURNING id`,
        [board1.id]
      )).rows[0].id;

      const lblBug = (await client.query(
        `INSERT INTO labels (board_id, name, color) VALUES ($1, 'Bug Fix', '#B2433D') RETURNING id`,
        [board1.id]
      )).rows[0].id;

      const lblMobile = (await client.query(
        `INSERT INTO labels (board_id, name, color) VALUES ($1, 'iOS / Android', '#3F627D') RETURNING id`,
        [board1.id]
      )).rows[0].id;

      const lblUrgent = (await client.query(
        `INSERT INTO labels (board_id, name, color) VALUES ($1, 'Urgent', '#9E3B4E') RETURNING id`,
        [board1.id]
      )).rows[0].id;

      // Board 1 Lists
      const listBacklog = (await client.query(
        `INSERT INTO lists (board_id, title, position) VALUES ($1, 'Backlog', 1000.0) RETURNING id`,
        [board1.id]
      )).rows[0].id;

      const listProgress = (await client.query(
        `INSERT INTO lists (board_id, title, position) VALUES ($1, 'In Progress', 2000.0) RETURNING id`,
        [board1.id]
      )).rows[0].id;

      const listReview = (await client.query(
        `INSERT INTO lists (board_id, title, position) VALUES ($1, 'In Review', 3000.0) RETURNING id`,
        [board1.id]
      )).rows[0].id;

      const listDone = (await client.query(
        `INSERT INTO lists (board_id, title, position) VALUES ($1, 'Done', 4000.0) RETURNING id`,
        [board1.id]
      )).rows[0].id;

      // Board 1 Cards
      const c1 = await client.query(
        `INSERT INTO cards (list_id, board_id, title, description, due_date, position)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          listBacklog,
          board1.id,
          'Fix login redirect on Safari iOS',
          'Users on Safari iOS 17.4 report an endless spinner when redirected from Google OAuth popup. Need to handle third-party cookie restrictions gracefully.',
          new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          1000.0,
        ]
      );
      await client.query(`INSERT INTO card_labels (card_id, label_id) VALUES ($1, $2), ($1, $3)`, [c1.rows[0].id, lblBug, lblMobile]);

      const c2 = await client.query(
        `INSERT INTO cards (list_id, board_id, title, description, due_date, position)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          listBacklog,
          board1.id,
          'Audit tactile haptic feedback on card swipe',
          'Ensure subtle tactile feedback fires when cards are dragged past the list drop boundary.',
          new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
          2000.0,
        ]
      );
      await client.query(`INSERT INTO card_labels (card_id, label_id) VALUES ($1, $2)`, [c2.rows[0].id, lblDesign]);

      const c3 = await client.query(
        `INSERT INTO cards (list_id, board_id, title, description, due_date, position)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          listProgress,
          board1.id,
          'Implement Fraunces display serif for header typography',
          'Configure Google Fonts loader and ensure fallback rendering avoids layout shifts (FOUT). Update CSS variables.',
          new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          1000.0,
        ]
      );
      await client.query(`INSERT INTO card_labels (card_id, label_id) VALUES ($1, $2)`, [c3.rows[0].id, lblDesign]);

      const c4 = await client.query(
        `INSERT INTO cards (list_id, board_id, title, description, due_date, position)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          listProgress,
          board1.id,
          'Dark-ink high-contrast mode toggle',
          'Add accessible color contrast tokens adhering to WCAG AAA standards for low-vision users.',
          new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
          2000.0,
        ]
      );
      await client.query(`INSERT INTO card_labels (card_id, label_id) VALUES ($1, $2)`, [c4.rows[0].id, lblDesign]);

      const c5 = await client.query(
        `INSERT INTO cards (list_id, board_id, title, description, due_date, position)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          listReview,
          board1.id,
          'Verify optimistic drag rollback on 500 error',
          'Simulate network drops and ensure the UI springs the card back to its original slot with a friendly toast.',
          new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          1000.0,
        ]
      );
      await client.query(`INSERT INTO card_labels (card_id, label_id) VALUES ($1, $2)`, [c5.rows[0].id, lblUrgent]);

      const c6 = await client.query(
        `INSERT INTO cards (list_id, board_id, title, description, due_date, position)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          listReview,
          board1.id,
          'Deep linking for card detail modal (/b/:boardId/c/:cardId)',
          'Ensure refreshing the browser on a card modal keeps the board loaded in background and opens the card smoothly.',
          new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          2000.0,
        ]
      );
      await client.query(`INSERT INTO card_labels (card_id, label_id) VALUES ($1, $2)`, [c6.rows[0].id, lblMobile]);

      const c7 = await client.query(
        `INSERT INTO cards (list_id, board_id, title, description, due_date, position)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          listDone,
          board1.id,
          'Setup node-pg-migrate and database pool',
          'Configured pg connection pool with parameterized SQL queries and auto-rollback transactions.',
          new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          1000.0,
        ]
      );
      await client.query(`INSERT INTO card_labels (card_id, label_id) VALUES ($1, $2)`, [c7.rows[0].id, lblUrgent]);

      const c8 = await client.query(
        `INSERT INTO cards (list_id, board_id, title, description, due_date, position)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          listDone,
          board1.id,
          'Draft indie studio color palette and typography scale',
          'Established warm muted off-white paper canvas (#F4F1EA), near-black ink text, and hairline 1px borders.',
          new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          2000.0,
        ]
      );
      await client.query(`INSERT INTO card_labels (card_id, label_id) VALUES ($1, $2)`, [c8.rows[0].id, lblDesign]);

      // ----------------------------------------------------------------------
      // BOARD 2: Core API & Infra Hardening (Forest Green)
      // ----------------------------------------------------------------------
      console.log('[Seed] Creating Board 2: Core API & Infra Hardening...');
      const b2 = await client.query(
        `INSERT INTO boards (title, color, owner_id)
         VALUES ($1, $2, $3)
         RETURNING id, title, color`,
        ['Core API & Infra Hardening', '#2D5A4C', alex.id]
      );
      const board2 = b2.rows[0];

      // Board 2 Members: Alex (owner), Jordan (member), Sam (viewer)
      await client.query(
        `INSERT INTO board_members (board_id, user_id, role)
         VALUES 
          ($1, $2, 'owner'),
          ($1, $3, 'member'),
          ($1, $4, 'viewer')`,
        [board2.id, alex.id, jordan.id, sam.id]
      );

      // Board 2 Labels
      const lblInfra = (await client.query(
        `INSERT INTO labels (board_id, name, color) VALUES ($1, 'Infrastructure', '#2D5A4C') RETURNING id`,
        [board2.id]
      )).rows[0].id;

      const lblSecurity = (await client.query(
        `INSERT INTO labels (board_id, name, color) VALUES ($1, 'Security', '#B2433D') RETURNING id`,
        [board2.id]
      )).rows[0].id;

      const lblPerf = (await client.query(
        `INSERT INTO labels (board_id, name, color) VALUES ($1, 'Performance', '#5C4033') RETURNING id`,
        [board2.id]
      )).rows[0].id;

      // Board 2 Lists
      const listDiscovery = (await client.query(
        `INSERT INTO lists (board_id, title, position) VALUES ($1, 'Discovery', 1000.0) RETURNING id`,
        [board2.id]
      )).rows[0].id;

      const listSprintBacklog = (await client.query(
        `INSERT INTO lists (board_id, title, position) VALUES ($1, 'Sprint Backlog', 2000.0) RETURNING id`,
        [board2.id]
      )).rows[0].id;

      const listActiveDev = (await client.query(
        `INSERT INTO lists (board_id, title, position) VALUES ($1, 'Active Dev', 3000.0) RETURNING id`,
        [board2.id]
      )).rows[0].id;

      const listShipped = (await client.query(
        `INSERT INTO lists (board_id, title, position) VALUES ($1, 'Shipped', 4000.0) RETURNING id`,
        [board2.id]
      )).rows[0].id;

      // Board 2 Cards
      const c21 = await client.query(
        `INSERT INTO cards (list_id, board_id, title, description, due_date, position)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          listDiscovery,
          board2.id,
          'Write ER diagram for orders and payments service',
          'Document entity relationships, cascade deletions, and index strategies for high-frequency queries.',
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          1000.0,
        ]
      );
      await client.query(`INSERT INTO card_labels (card_id, label_id) VALUES ($1, $2)`, [c21.rows[0].id, lblInfra]);

      const c22 = await client.query(
        `INSERT INTO cards (list_id, board_id, title, description, due_date, position)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          listSprintBacklog,
          board2.id,
          'Fractional indexing rebalancing stress test',
          'Simulate 10,000 midpoint card moves in a tight slot to verify automated renumbering (1000, 2000, 3000) when gap < 0.0001.',
          new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          1000.0,
        ]
      );
      await client.query(`INSERT INTO card_labels (card_id, label_id) VALUES ($1, $2)`, [c22.rows[0].id, lblPerf]);

      const c23 = await client.query(
        `INSERT INTO cards (list_id, board_id, title, description, due_date, position)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          listActiveDev,
          board2.id,
          'Enforce httpOnly SameSite=Lax JWT cookies',
          'Mitigate XSS risks by isolating session tokens from JavaScript document.cookie access.',
          new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          1000.0,
        ]
      );
      await client.query(`INSERT INTO card_labels (card_id, label_id) VALUES ($1, $2)`, [c23.rows[0].id, lblSecurity]);

      const c24 = await client.query(
        `INSERT INTO cards (list_id, board_id, title, description, due_date, position)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          listActiveDev,
          board2.id,
          'Rate limit auth registration and login endpoints',
          'Apply IP and email token bucket rate limiting to prevent brute force password attempts.',
          new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          2000.0,
        ]
      );
      await client.query(`INSERT INTO card_labels (card_id, label_id) VALUES ($1, $2)`, [c24.rows[0].id, lblSecurity]);

      const c25 = await client.query(
        `INSERT INTO cards (list_id, board_id, title, description, due_date, position)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          listShipped,
          board2.id,
          'PostgreSQL connection pool error listener',
          'Added idle timeout reaping and pool error diagnostics to prevent unhandled rejection crashes.',
          new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          1000.0,
        ]
      );
      await client.query(`INSERT INTO card_labels (card_id, label_id) VALUES ($1, $2)`, [c25.rows[0].id, lblInfra]);

      const c26 = await client.query(
        `INSERT INTO cards (list_id, board_id, title, description, due_date, position)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          listShipped,
          board2.id,
          'RBAC route protection with 404 ID masking',
          'Verified viewer/member/owner hierarchy and masked unpermitted boards as 404 to avoid enumeration.',
          new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          2000.0,
        ]
      );
      await client.query(`INSERT INTO card_labels (card_id, label_id) VALUES ($1, $2)`, [c26.rows[0].id, lblSecurity]);

      // ----------------------------------------------------------------------
      // SEED COMMENTS & SUGGESTIONS
      // ----------------------------------------------------------------------
      console.log('[Seed] Seeding team comments & suggestions...');
      await client.query(
        `INSERT INTO card_comments (card_id, user_id, content, type, created_at)
         VALUES 
          ($1, $2, 'Tested on iPhone 15 simulator with iOS 17.4; reproduce rate is 100%. I suggest checking cookie partition headers or storage access API.', 'suggestion', now() - interval '4 hours'),
          ($1, $3, 'Agreed! We should avoid full page redirects and use postMessage callback from the popup window instead.', 'comment', now() - interval '2 hours'),
          ($4, $5, 'Added tactile vibration pattern specs: 15ms light pulse on drag release.', 'feedback', now() - interval '1 day'),
          ($6, $2, 'Fraunces looks stunning on high-DPI retina displays! Fallback serif font configured with font-display: swap.', 'comment', now() - interval '5 hours')`,
        [c1.rows[0].id, sam.id, alex.id, c2.rows[0].id, jordan.id, c3.rows[0].id]
      );

      // ----------------------------------------------------------------------
      // SEED REALTIME NOTIFICATIONS
      // ----------------------------------------------------------------------
      console.log('[Seed] Seeding realtime notifications...');
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, link, read, created_at)
         VALUES 
          ($1, 'New suggestion from Sam Chen', 'Sam suggested: \"Check cookie partition headers or storage access API\" on Fix login redirect on Safari iOS', 'suggestion', $2, false, now() - interval '10 minutes'),
          ($1, 'Upcoming Due Date', 'Card \"Verify optimistic drag rollback on 500 error\" is due tomorrow', 'due_soon', $3, false, now() - interval '1 hour'),
          ($1, 'Sprint Progress Milestone', 'Sprint completed 2 out of 8 tasks (25% progress rate)', 'info', $4, true, now() - interval '1 day'),
          ($5, 'Card Assigned to You', 'You were mentioned in \"Audit tactile haptic feedback on card swipe\"', 'comment', $2, false, now() - interval '30 minutes')`,
        [
          alex.id,
          `/b/${board1.id}/c/${c1.rows[0].id}`,
          `/b/${board1.id}/c/${c5.rows[0].id}`,
          `/b/${board1.id}`,
          jordan.id,
        ]
      );

      // ----------------------------------------------------------------------
      // SEED FILES / ATTACHMENTS
      // ----------------------------------------------------------------------
      await client.query(
        `INSERT INTO card_attachments (card_id, board_id, name, url, size, file_type, uploaded_by, created_at)
         VALUES 
          ($1, $2, 'safari-redirect-debug-trace.json', '#', '240 KB', 'code', $3, now() - interval '3 hours'),
          ($4, $2, 'haptic-vibration-curves.png', '#', '1.8 MB', 'image', $5, now() - interval '1 day'),
          ($6, $7, 'database-er-diagram-v2.pdf', '#', '3.4 MB', 'pdf', $3, now() - interval '2 days')`,
        [c1.rows[0].id, board1.id, sam.id, c2.rows[0].id, jordan.id, c21.rows[0].id, board2.id]
      );

      console.log('[Seed] Database seeded with realistic boards, lists, cards, comments, notifications, and files!');
    });
  } catch (err) {
    console.error('[Seed Error]:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();

