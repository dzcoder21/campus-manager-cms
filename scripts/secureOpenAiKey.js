const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const envPath = path.join(__dirname, '..', '.env');

function parseEnvLines(lines) {
  const map = new Map();
  lines.forEach((line, index) => {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) return;
    const sep = line.indexOf('=');
    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 1);
    map.set(key, { index, value });
  });
  return map;
}

function encryptKey(plainKey, secret) {
  const iv = crypto.randomBytes(12);
  const key = crypto.createHash('sha256').update(secret).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainKey, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

function setUserEnvVar(name, value) {
  if (process.platform === 'win32') {
    // Persist secret in Windows user environment so it is outside project files.
    execSync(`setx ${name} "${value}"`, { stdio: 'ignore' });
  }
}

function main() {
  if (!fs.existsSync(envPath)) {
    console.error('.env file not found');
    process.exit(1);
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split(/\r?\n/);
  const env = parseEnvLines(lines);

  const keyEntry = env.get('OPENAI_API_KEY');
  const plainKey = keyEntry ? String(keyEntry.value || '').trim() : '';

  if (!plainKey || plainKey === 'YOUR_OPENAI_API_KEY_HERE') {
    console.error('OPENAI_API_KEY is not set to a real key. Put a real key first, then run this script.');
    process.exit(1);
  }

  const secret = crypto.randomBytes(32).toString('base64');
  const encryptedValue = encryptKey(plainKey, secret);

  setUserEnvVar('OPENAI_KEY_ENC_SECRET', secret);

  const updateLine = (name, value) => {
    const current = env.get(name);
    const line = `${name}=${value}`;
    if (current) {
      lines[current.index] = line;
    } else {
      lines.push(line);
    }
  };

  updateLine('OPENAI_API_KEY', 'YOUR_OPENAI_API_KEY_HERE');
  updateLine('OPENAI_API_KEY_ENC', encryptedValue);

  fs.writeFileSync(envPath, lines.join('\n'));

  console.log('OpenAI key encrypted successfully.');
  console.log('Stored encrypted key in .env as OPENAI_API_KEY_ENC.');
  console.log('Stored decryption secret in Windows user env var OPENAI_KEY_ENC_SECRET.');
  console.log('Restart terminal/server to load new user environment variable.');
}

main();
