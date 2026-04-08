function wantsJson(req) {
  const acceptHeader = (req.get('accept') || '').toLowerCase();
  const contentType = (req.get('content-type') || '').toLowerCase();
  const isApiRoute = req.originalUrl && req.originalUrl.startsWith('/api/');

  if (isApiRoute) {
    return true;
  }

  if (acceptHeader.includes('text/html')) {
    return false;
  }

  return acceptHeader.includes('application/json') || contentType.includes('application/json');
}

module.exports = wantsJson;