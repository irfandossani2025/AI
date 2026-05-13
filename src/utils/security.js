const { HttpError } = require('./httpError');

function sanitizeTextInput(value, maxLength = 5000) {
  const normalized = String(value || '')
    .replace(/\u0000/g, '')
    .trim();

  if (!normalized) {
    throw new HttpError(400, 'A required text field was empty.');
  }

  if (normalized.length > maxLength) {
    throw new HttpError(400, `Text input exceeded the ${maxLength} character limit.`);
  }

  return normalized;
}

function validateEmail(email) {
  const normalized = sanitizeTextInput(email, 200).toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(normalized)) {
    throw new HttpError(400, 'Please provide a valid email address.');
  }

  return normalized;
}

function validatePassword(password) {
  const normalized = String(password || '');
  if (normalized.length < 8) {
    throw new HttpError(400, 'Password must be at least 8 characters long.');
  }
  if (normalized.length > 128) {
    throw new HttpError(400, 'Password is too long.');
  }
  return normalized;
}

function validatePublicUrl(urlValue) {
  let url;
  try {
    url = new URL(sanitizeTextInput(urlValue, 2048));
  } catch (_error) {
    throw new HttpError(400, 'Please provide a valid public URL.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new HttpError(400, 'Only HTTP and HTTPS URLs are allowed.');
  }

  const hostname = url.hostname.toLowerCase();
  const privatePatterns = [
    /^localhost$/,
    /^127\./,
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2\d|3[0-1])\./,
    /^0\./,
    /^::1$/,
    /\.local$/
  ];

  if (privatePatterns.some((pattern) => pattern.test(hostname))) {
    throw new HttpError(400, 'Private or local network URLs are not allowed.');
  }

  return url.toString();
}

function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

function chunkText(text, maxChars = 1200, overlapChars = 180) {
  const normalized = String(text || '').replace(/\r/g, '').trim();
  if (!normalized) {
    return [];
  }

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  const chunks = [];
  let current = '';

  for (const paragraph of paragraphs) {
    if (!current) {
      current = paragraph;
      continue;
    }

    const candidate = `${current}\n\n${paragraph}`;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    chunks.push(current);

    const overlap = current.slice(Math.max(0, current.length - overlapChars));
    current = `${overlap}\n\n${paragraph}`.slice(0, maxChars);
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function cosineSimilarity(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length || left.length === 0) {
    return 0;
  }

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = Number(left[index]);
    const rightValue = Number(right[index]);
    dot += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

module.exports = {
  sanitizeTextInput,
  validateEmail,
  validatePassword,
  validatePublicUrl,
  estimateTokens,
  chunkText,
  cosineSimilarity
};
