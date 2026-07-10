import {createEaseFactorApiServer} from '../../easefactor-api.mjs';

export const withServer = async (run) => {
  const server = createEaseFactorApiServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const {port} = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
};

export const getJson = async (baseUrl, path) => {
  const response = await fetch(`${baseUrl}${path}`);
  return {status: response.status, body: await response.json()};
};
