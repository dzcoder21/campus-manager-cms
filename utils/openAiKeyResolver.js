const crypto = require('crypto');

const PLACEHOLDER_VALUES = ['YOUR_OPENAI_API_KEY_HERE', ''];

function isPlaceholder(value) {
  const raw = String(value || '').trim();
  if (!raw) return true;
  if (PLACEHOLDER_VALUES.includes(raw)) return true;
  return raw.toUpperCase().includes('YOUR_OPENAI_API_KEY');
}

function decryptApiKey(encValue, secret) {
  const payload = String(encValue || '').trim();
  const passphrase = String(secret || '').trim();
  if (!payload || !passphrase) return '';

  const parts = payload.split('.');
  if (parts.length !== 3) return '';

  try {
    const iv = Buffer.from(parts[0], 'base64');
    const tag = Buffer.from(parts[1], 'base64');
    const encrypted = Buffer.from(parts[2], 'base64');
    const key = crypto.createHash('sha256').update(passphrase).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8').trim();
    return plain;
  } catch (err) {
    return '';
  }
}

function resolveOpenAiApiKey() {
  const plainKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!isPlaceholder(plainKey)) {
    return plainKey;
  }

  const encValue = String(process.env.OPENAI_API_KEY_ENC || '').trim();
  const secret = String(process.env.OPENAI_KEY_ENC_SECRET || '').trim();
  const decrypted = decryptApiKey(encValue, secret);
  if (!isPlaceholder(decrypted)) {
    return decrypted;
  }

  return '';
}

module.exports = {
  resolveOpenAiApiKey,
  decryptApiKey,
  isPlaceholder,
};