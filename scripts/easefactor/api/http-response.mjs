const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

export const errorBody = (code, message, details = undefined) => ({
  error: {code, message, ...(details === undefined ? {} : {details})},
});

export const sendJson = (res, statusCode, body) => {
  res.writeHead(statusCode, jsonHeaders);
  res.end(JSON.stringify(body, null, 2));
};

export const sendError = (res, statusCode, code, message, details = undefined) => {
  sendJson(res, statusCode, errorBody(code, message, details));
};
