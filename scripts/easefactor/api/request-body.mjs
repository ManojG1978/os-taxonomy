import {sendError} from './http-response.mjs';

export const readJsonBody = async (req, {maxBytes = 1048576} = {}) => {
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > maxBytes) {
      const error = new Error('request_body_too_large');
      error.code = 'request_body_too_large';
      throw error;
    }
    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return {};

  try {
    return JSON.parse(raw);
  } catch (error) {
    error.code = 'invalid_json';
    throw error;
  }
};

export const readJsonRequest = async (req, res) => {
  try {
    return await readJsonBody(req);
  } catch (error) {
    if (error.code === 'invalid_json') {
      sendError(res, 400, 'invalid_json', 'Request body must be valid JSON.');
      return null;
    }
    if (error.code === 'request_body_too_large') {
      sendError(res, 413, 'request_body_too_large', 'Request body exceeds 1 MB.');
      return null;
    }
    throw error;
  }
};
