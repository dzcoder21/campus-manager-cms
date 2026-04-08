const buckets = new Map();

const WINDOW_MS = Number(process.env.ASSISTANT_RATE_LIMIT_WINDOW_MS || 60_000);
const MAX_REQUESTS = Number(process.env.ASSISTANT_RATE_LIMIT_MAX || 8);

function getClientId(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || 'unknown-client';
}

function pruneBucket(now) {
  for (const [key, value] of buckets.entries()) {
    if (now >= value.resetAt) {
      buckets.delete(key);
    }
  }
}

function assistantRateLimit(req, res, next) {
  const now = Date.now();
  pruneBucket(now);

  const clientId = getClientId(req);
  let bucket = buckets.get(clientId);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(clientId, bucket);
  }

  bucket.count += 1;
  const remaining = Math.max(0, MAX_REQUESTS - bucket.count);

  res.setHeader('X-RateLimit-Limit', String(MAX_REQUESTS));
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

  if (bucket.count > MAX_REQUESTS) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({
      answer: 'Too many assistant requests. Please wait a moment and try again.',
    });
  }

  return next();
}

module.exports = assistantRateLimit;