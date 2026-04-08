const asyncHandler = require('express-async-handler');
const { resolveOpenAiApiKey } = require('../utils/openAiKeyResolver');

const extractResponseText = (payload) => {
  if (payload && typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  if (!payload || !Array.isArray(payload.output)) return '';

  const parts = [];
  payload.output.forEach((item) => {
    if (!item || !Array.isArray(item.content)) return;
    item.content.forEach((chunk) => {
      if (!chunk) return;
      if (typeof chunk.text === 'string' && chunk.text.trim()) {
        parts.push(chunk.text.trim());
      }
    });
  });

  return parts.join('\n').trim();
};

const askAssistant = asyncHandler(async (req, res) => {
  const question = String(req.body && req.body.question ? req.body.question : '').trim();

  if (!question) {
    return res.status(400).json({ message: 'Question is required' });
  }

  if (question.length > 500) {
    return res.status(400).json({ message: 'Question is too long. Keep it under 500 characters.' });
  }

  const apiKey = resolveOpenAiApiKey();

  if (!apiKey) {
    return res.status(503).json({
      answer:
        'Assistant API key is not configured yet. Set OPENAI_API_KEY or use OPENAI_API_KEY_ENC with OPENAI_KEY_ENC_SECRET.',
    });
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const upstream = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text:
                'You are a University CMS assistant. Respond only in English. Answer in plain text only. Be short, practical, and focused on this CMS: departments, courses, modules, students, enrollment, certificates, login, and portal.',
            },
          ],
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: question }],
        },
      ],
      temperature: 0.4,
      max_output_tokens: 250,
    }),
  });

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const errMsg =
      (data && data.error && data.error.message) || 'Assistant service is temporarily unavailable. Please try again.';
    return res.status(502).json({ answer: errMsg });
  }

  const answer = extractResponseText(data);
  return res.json({
    answer:
      answer ||
      'I could not generate a response this time. Please ask again with a clearer question about the CMS.',
  });
});

module.exports = { askAssistant };