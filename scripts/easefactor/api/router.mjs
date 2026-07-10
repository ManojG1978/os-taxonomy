import {sendError} from './http-response.mjs';

export const createRouter = ({routes}) => async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      sendError(res, 405, 'method_not_allowed', 'Method not allowed.');
      return;
    }

    const url = new URL(req.url, 'http://127.0.0.1');
    const pathParts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);

    for (const route of routes) {
      if (route.method !== req.method) continue;
      const params = route.match(pathParts);
      if (params === false) continue;

      await route.handle({req, res, url, pathParts, params});
      return;
    }

    sendError(res, 404, 'not_found', 'Endpoint not found.');
  } catch (error) {
    sendError(res, 500, 'internal_error', error.message);
  }
};
