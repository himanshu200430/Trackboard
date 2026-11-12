import express from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

//Helper to call Groq API with automatic model fallback

async function callGroqChat(messages, apiKey) {
  const models = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];
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
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        lastError = new Error(errData.error?.message || `HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        return { content, modelUsed: model };
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('All Groq model attempts failed.');
}

// Safely parse JSON even if surrounded by markdown code blocks//
function extractJSON(rawText) {
  if (!rawText) return null;
  let text = rawText.trim();
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match) {
    text = match[1].trim();
  }
  return JSON.parse(text);
}

// POST /api/ai/summarize - Card Level AI Summary, Milestones & Progress
router.post('/summarize', async (req, res) => {
  try {
    const { card, boardTitle, listTitle } = req.body;
    const apiKey =
      process.env.GROQ_API_KEY ||
      (process.env.GEMINI_API_KEY?.startsWith('gsk_') ? process.env.GEMINI_API_KEY : null);

    if (!card || !card.title) {
      return res.status(400).json({ error: 'Card data is required for summarization.' });
    }

    if (apiKey) {
      try {
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

        const { content, modelUsed } = await callGroqChat(
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

        const structured = extractJSON(content);
        if (structured) {
          return res.json({
            ...structured,
            summary: structured.executiveSummary,
            source: 'groq-live',
            model: modelUsed,
          });
        }
      } catch (groqErr) {
        console.warn('[Groq Card Analysis Failed, using structured fallback]:', groqErr.message);
      }
    }

    // Deterministic fallback if API fails or offline
    const isDone = (listTitle || '').toLowerCase().includes('done') || (listTitle || '').toLowerCase().includes('shipped');
    const isProgress = (listTitle || '').toLowerCase().includes('progress') || (listTitle || '').toLowerCase().includes('dev');
    const isReview = (listTitle || '').toLowerCase().includes('review');
    const defaultProgress = isDone ? 100 : isReview ? 80 : isProgress ? 50 : 15;

    return res.json({
      executiveSummary: `Task "${card.title}" is currently tracked in stage "${listTitle || 'Backlog'}". Key focus is fulfilling core specifications and verifying quality standards before deployment.`,
      summary: `Task "${card.title}" is currently tracked in stage "${listTitle || 'Backlog'}". Key focus is fulfilling core specifications and verifying quality standards before deployment.`,
      estimatedProgress: defaultProgress,
      complexity: card.labels?.some((l) => l.name.toLowerCase().includes('urgent') || l.name.toLowerCase().includes('bug')) ? 'High' : 'Medium',
      estimatedHours: 8,
      milestones: [
        { name: 'Requirements & Scope', percent: 100, status: 'Completed' },
        { name: 'Core Implementation', percent: defaultProgress > 30 ? 70 : 0, status: defaultProgress > 30 ? 'In Progress' : 'Pending' },
        { name: 'QA & Regression Testing', percent: isReview || isDone ? 90 : 0, status: isReview ? 'In Progress' : isDone ? 'Completed' : 'Pending' },
        { name: 'Code Review & Release', percent: isDone ? 100 : 0, status: isDone ? 'Completed' : 'Pending' },
      ],
      actionItems: [
        'Review acceptance criteria and confirm dependency readiness',
        'Execute core implementation updates according to architecture standards',
        'Run test passes and resolve edge cases',
        'Move to In Review once verified',
      ],
      keyRisks: [
        'Ensure regression coverage across dependent components',
        'Confirm environment configurations match production requirements',
      ],
      source: 'deterministic-fallback',
      apiKeyConfigured: Boolean(apiKey),
    });
  } catch (err) {
    console.error('[AI Summary Error]:', err);
    return res.status(500).json({ error: 'Failed to generate task summary.' });
  }
});

// POST /api/ai/board-summary - Full Board Progress Analytics & AI Charts

router.post('/board-summary', async (req, res) => {
  try {
    const { boardTitle, lists = [], cards = [], labels = [] } = req.body;
    const apiKey =
      process.env.GROQ_API_KEY ||
      (process.env.GEMINI_API_KEY?.startsWith('gsk_') ? process.env.GEMINI_API_KEY : null);

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
    const labelDistribution = labels.map((lbl) => {
      const count = cards.filter((c) =>
        c.labels?.some((cl) => cl.id === lbl.id || cl.name === lbl.name)
      ).length;
      return {
        id: lbl.id,
        name: lbl.name,
        color: lbl.color,
        count,
      };
    }).filter((l) => l.count > 0);

    // Overdue Cards
    const now = new Date();
    const overdueCards = cards.filter(
      (c) => c.due_date && new Date(c.due_date) < now && !doneListIds.has(c.list_id)
    );

    // 2. Call Groq for Strategic Project Insights
    let aiInsights = null;
    let modelUsed = null;

    if (apiKey) {
      try {
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

        const { content, modelUsed: model } = await callGroqChat(
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

        aiInsights = extractJSON(content);
        modelUsed = model;
      } catch (groqErr) {
        console.warn('[Groq Board Summary Warning]:', groqErr.message);
      }
    }

    if (!aiInsights) {
      aiInsights = {
        projectHealth: progressPercent >= 50 ? 'Strong Velocity' : progressPercent >= 25 ? 'On Track' : 'Attention Needed',
        healthScore: Math.min(100, Math.max(20, progressPercent + 20)),
        executiveSummary: `The "${boardTitle}" board currently has ${totalCards} total work items with ${completedCards} delivered (${progressPercent}% sprint completion). Work is actively advancing through review and development pipelines.`,
        velocityStatus: `${completedCards} of ${totalCards} cards shipped. Healthy flow across active lists.`,
        bottlenecks: overdueCards.length > 0
          ? [`${overdueCards.length} item(s) are past their due dates and should be re-prioritized.`]
          : ['Ensure cards in Review are validated to maintain steady delivery.'],
        strategicRecommendations: [
          'Prioritize items currently in progress to avoid multitasking delays',
          'Conduct testing on items in review before taking on new backlog items',
          'Review upcoming deadlines for active sprint deliverables',
        ],
      };
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
      source: apiKey ? 'groq-live' : 'local-stats',
      model: modelUsed,
    });
  } catch (err) {
    console.error('[AI Board Summary Error]:', err);
    return res.status(500).json({ error: 'Failed to generate board analytics.' });
  }
});

export default router;
