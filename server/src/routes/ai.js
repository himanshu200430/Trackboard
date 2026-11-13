import express from 'express';
import pool from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

/**
 * Helper to call LLM chat completion API with prioritized active models
 */
async function callLLMChat(messages, apiKey) {
  // Ordered by speed, quality, and capability
  const models = [
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'qwen/qwen3.8-27b',
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'llama-3.2-3b-preview',
    'llama-3.2-1b-preview',
    'allam-2-7b',
  ];

  let lastError = null;

  for (const model of models) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
          max_tokens: 1800,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const msg = errData.error?.message || `HTTP ${response.status}`;
        lastError = new Error(`Model ${model}: ${msg}`);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content && content.trim().length > 0) {
        return { content, modelUsed: model };
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('All configured AI models failed to respond.');
}

/**
 * Safely parse JSON even if surrounded by markdown code fences or reasoning blocks
 */
function extractJSON(rawText) {
  if (!rawText) return null;
  let text = rawText.trim();

  // Strip reasoning blocks (<think>...</think>)
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Check for markdown code fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  } else {
    // Locate first '{' and last '}'
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      text = text.substring(start, end + 1);
    }
  }

  return JSON.parse(text);
}

/**
 * Helper to retrieve and sanitize AI API key from environment
 */
function getAIKey() {
  const raw =
    process.env.AI_API_KEY ||
    process.env.GROQ_API_KEY ||
    (process.env.GEMINI_API_KEY?.startsWith('gsk_') ? process.env.GEMINI_API_KEY : null);

  if (!raw) return null;

  // Clean key: extract first valid token and strip any accidental newlines or whitespace
  const match = raw.match(/gsk_[a-zA-Z0-9_-]+/);
  if (match) {
    return match[0].trim();
  }

  return raw.trim();
}

// ============================================================================
// POST /api/ai/summarize - Live LLM Card Summary, Milestones & Progress
// ============================================================================
router.post('/summarize', async (req, res) => {
  try {
    const { card, boardTitle, listTitle } = req.body;
    const apiKey = getAIKey();

    if (!card || !card.title) {
      return res.status(400).json({ error: 'Card data is required for summarization.' });
    }

    if (!apiKey) {
      return res.status(400).json({
        error: 'AI service key is not configured in backend environment variables. Please check your project settings.',
      });
    }

    const prompt = `Analyze this agile task in Tackboard and provide an actionable breakdown:
Board: ${boardTitle || 'Project'}
Current List Stage: ${listTitle || 'In Progress'}
Task Title: ${card.title}
Description: ${card.description || 'No description provided.'}
Due Date: ${card.due_date ? new Date(card.due_date).toLocaleDateString() : 'Not set'}
Labels: ${card.labels?.map((l) => l.name).join(', ') || 'None'}

Provide an assessment formatted strictly as valid JSON with these fields:
{
  "executiveSummary": "2-3 crisp sentences summarizing context, core objective, and technical goals",
  "estimatedProgress": number between 0 and 100 representing current stage completion,
  "complexity": "Low" | "Medium" | "High" | "Critical",
  "estimatedHours": number of estimated total hours for this task,
  "milestones": [
    { "name": "Milestone title", "percent": number 0-100, "status": "Completed" | "In Progress" | "Pending" }
  ],
  "actionItems": ["Immediate action 1", "Action 2", "Action 3"],
  "keyRisks": ["Risk or dependency 1", "Risk 2"]
}`;

    const { content, modelUsed } = await callLLMChat(
      [
        {
          role: 'system',
          content:
            'You are an expert Technical Lead and Agile Coach. Respond ONLY with valid, parseable JSON matching the requested schema. No conversational filler or introductory text.',
        },
        { role: 'user', content: prompt },
      ],
      apiKey
    );

    let structured = null;
    try {
      structured = extractJSON(content);
    } catch (parseErr) {
      console.error('[AI Parse Error]:', parseErr.message, 'Raw content:', content);
      return res.status(502).json({
        error: `Failed to parse AI response into JSON: ${parseErr.message}. Output was: ${content.slice(0, 150)}...`,
      });
    }

    if (!structured) {
      return res.status(502).json({ error: 'LLM returned an empty or unparseable response.' });
    }

    return res.json({
      ...structured,
      summary: structured.executiveSummary,
      source: 'live',
      model: modelUsed,
    });
  } catch (err) {
    console.error('[AI Summary Error]:', err);
    return res.status(502).json({
      error: `AI Generation Failed: ${err.message || 'Unknown error'}`,
    });
  }
});

// ============================================================================
// POST /api/ai/board-summary - Live LLM Board Progress Analytics
// ============================================================================
router.post('/board-summary', async (req, res) => {
  try {
    const { boardTitle, lists = [], cards = [], labels = [] } = req.body;
    const apiKey = getAIKey();

    if (!apiKey) {
      return res.status(400).json({
        error: 'AI service key is not configured in backend environment variables. Please check your project settings.',
      });
    }

    // 1. Calculate Real Board Statistics
    const totalCards = cards.length;
    const doneLists = lists.filter((l) =>
      /done|shipped|closed|completed/i.test(l.title)
    );
    const doneListIds = new Set(doneLists.map((l) => l.id));

    const completedCards = cards.filter((c) => doneListIds.has(c.list_id)).length;
    const progressPercent = totalCards > 0 ? Math.round((completedCards / totalCards) * 100) : 0;

    // Stage Breakdown
    const stageBreakdown = lists.map((l) => {
      const count = cards.filter((c) => c.list_id === l.id).length;
      const percentage = totalCards > 0 ? Math.round((count / totalCards) * 100) : 0;
      return {
        id: l.id,
        title: l.title,
        count,
        percentage,
      };
    });

    // Label Breakdown
    const labelDistribution = labels
      .map((lbl) => {
        const count = cards.filter((c) =>
          c.labels?.some((cl) => cl.id === lbl.id || cl.name === lbl.name)
        ).length;
        return {
          id: lbl.id,
          name: lbl.name,
          color: lbl.color,
          count,
        };
      })
      .filter((l) => l.count > 0);

    // Overdue Cards
    const now = new Date();
    const overdueCards = cards.filter(
      (c) => c.due_date && new Date(c.due_date) < now && !doneListIds.has(c.list_id)
    );

    // 2. Call LLM for Live Strategic Insights
    const prompt = `Analyze this agile Kanban board and generate an executive health & velocity report:
Board Title: "${boardTitle || 'Project Board'}"
Total Cards: ${totalCards}
Completed Cards: ${completedCards} (${progressPercent}% complete)
Overdue Cards: ${overdueCards.length}

Lists / Pipeline Distribution:
${stageBreakdown.map((s) => `- ${s.title}: ${s.count} cards (${s.percentage}%)`).join('\n')}

Active Cards Overview:
${cards.slice(0, 15).map((c) => `- "${c.title}" [Stage: ${lists.find((l) => l.id === c.list_id)?.title || 'Active'}] ${c.due_date ? '(Due: ' + new Date(c.due_date).toLocaleDateString() + ')' : ''}`).join('\n')}

Format your response strictly as valid JSON:
{
  "projectHealth": "On Track" | "Strong Velocity" | "Attention Needed" | "At Risk",
  "healthScore": number 0-100,
  "executiveSummary": "2-3 sentence project status overview highlighting progress, velocity, and delivery cadence",
  "velocityStatus": "Short assessment of throughput and completion speed",
  "bottlenecks": [
    "Specific bottleneck or stage congestion observation"
  ],
  "strategicRecommendations": [
    "High-impact recommendation 1",
    "Recommendation 2",
    "Recommendation 3"
  ]
}`;

    const { content, modelUsed } = await callLLMChat(
      [
        {
          role: 'system',
          content:
            'You are an Agile Delivery Director. Respond strictly with valid, parseable JSON according to the schema.',
        },
        { role: 'user', content: prompt },
      ],
      apiKey
    );

    let aiInsights = null;
    try {
      aiInsights = extractJSON(content);
    } catch (parseErr) {
      console.error('[AI Parse Error]:', parseErr.message, 'Raw content:', content);
      return res.status(502).json({
        error: `Failed to parse AI insights JSON: ${parseErr.message}`,
      });
    }

    if (!aiInsights) {
      return res.status(502).json({ error: 'LLM returned an empty or invalid response.' });
    }

    return res.json({
      stats: {
        totalCards,
        completedCards,
        progressPercent,
        overdueCount: overdueCards.length,
        stageBreakdown,
        labelDistribution,
      },
      insights: aiInsights,
      source: 'live',
      model: modelUsed,
    });
  } catch (err) {
    console.error('[AI Board Summary Error]:', err);
    return res.status(502).json({
      error: `AI Board Analysis Failed: ${err.message || 'Unknown error'}`,
    });
  }
});

// ============================================================================
// GET /api/ai/board-summary - Live LLM Executive Sprint Assessment for Reports
// ============================================================================
router.get('/board-summary', async (req, res) => {
  try {
    const { boardId } = req.query;
    if (!boardId) {
      return res.status(400).json({ error: 'boardId query parameter is required.' });
    }

    const apiKey = getAIKey();
    if (!apiKey) {
      return res.status(400).json({
        error: 'AI service key is not configured in backend environment variables. Please check your project settings.',
      });
    }

    // Fetch board info, lists, and cards from DB
    const boardRes = await pool.query('SELECT * FROM boards WHERE id = $1', [boardId]);
    if (boardRes.rows.length === 0) {
      return res.status(404).json({ error: 'Board not found.' });
    }
    const board = boardRes.rows[0];

    const listsRes = await pool.query(
      'SELECT * FROM lists WHERE board_id = $1 ORDER BY position ASC',
      [boardId]
    );
    const lists = listsRes.rows;

    const cardsRes = await pool.query(
      `SELECT c.*, l.title as list_title
       FROM cards c
       JOIN lists l ON c.list_id = l.id
       WHERE l.board_id = $1
       ORDER BY c.position ASC`,
      [boardId]
    );
    const cards = cardsRes.rows;

    const totalCards = cards.length;
    const completedCards = cards.filter((c) =>
      /done|shipped|closed|completed/i.test(c.list_title)
    ).length;
    const progressPercent = totalCards > 0 ? Math.round((completedCards / totalCards) * 100) : 0;
    const now = new Date();
    const overdueCards = cards.filter(
      (c) =>
        c.due_date &&
        new Date(c.due_date) < now &&
        !/done|shipped|closed|completed/i.test(c.list_title)
    );

    const prompt = `Analyze this agile project board and generate an executive sprint assessment:
Board Title: "${board.title}"
Total Cards: ${totalCards}
Completed Cards: ${completedCards} (${progressPercent}% completed)
Overdue Items: ${overdueCards.length}
Stage Lists: ${lists.map((l) => l.title).join(', ')}
Key Work Items Sample:
${cards.slice(0, 10).map((c) => `- "${c.title}" [${c.list_title}]`).join('\n')}

Format your response strictly as valid JSON:
{
  "health": "Healthy" | "Attention Needed" | "At Risk",
  "narrative": "2-3 crisp sentences providing an executive summary of sprint delivery and velocity",
  "risks": [
    "Specific delivery risk 1",
    "Specific delivery risk 2"
  ]
}`;

    const { content, modelUsed } = await callLLMChat(
      [
        {
          role: 'system',
          content:
            'You are an Agile Delivery Executive. Respond strictly with valid, parseable JSON according to the schema.',
        },
        { role: 'user', content: prompt },
      ],
      apiKey
    );

    let structured = null;
    try {
      structured = extractJSON(content);
    } catch (parseErr) {
      console.error('[AI Parse Error]:', parseErr.message, 'Raw content:', content);
      return res.status(502).json({
        error: `Failed to parse AI assessment JSON: ${parseErr.message}`,
      });
    }

    if (!structured) {
      return res.status(502).json({ error: 'LLM returned an empty or invalid response.' });
    }

    return res.json({
      health: structured.health || (progressPercent >= 50 ? 'Healthy' : 'Attention Needed'),
      narrative:
        structured.narrative ||
        structured.executiveSummary ||
        'Board sprint is in progress.',
      risks: structured.risks || [],
      model: modelUsed,
      source: 'live',
    });
  } catch (err) {
    console.error('[AI GET Board Summary Error]:', err);
    return res.status(502).json({
      error: `AI Assessment Failed: ${err.message || 'Unknown error'}`,
    });
  }
});

export default router;
