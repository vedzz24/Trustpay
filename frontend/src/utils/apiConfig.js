export function resolveApiBaseUrl({ apiUrl = '', legacyApiBaseUrl = '', protocol = 'http:', hostname = 'localhost' } = {}) {
  const configuredServer = String(apiUrl).trim().replace(/\/+$/, '');
  if (configuredServer) return configuredServer.endsWith('/api') ? configuredServer : `${configuredServer}/api`;

  const legacyBase = String(legacyApiBaseUrl).trim().replace(/\/+$/, '');
  if (legacyBase) return legacyBase;

  return `${protocol}//${hostname || 'localhost'}:5000/api`;
}

export function normalizeLoginResponse(response) {
  if (response.networkError) return response;
  if (response.httpStatus === 401) return { ...response, message: 'Invalid email or password.' };
  if (response.httpStatus === 403 || response.code === 'WRONG_ROLE') return { ...response, message: 'This account belongs to a different TrustPay account type.' };
  if (response.httpStatus >= 500) return { ...response, message: 'TrustPay encountered a server error.' };
  return response;
}
