export function resolveApiBaseUrl({ apiBaseUrl = '', fallbackUrl = '' } = {}) {
  const configuredServer = String(apiBaseUrl).trim().replace(/\/+$/, '');
  if (configuredServer) return configuredServer.endsWith('/api') ? configuredServer : `${configuredServer}/api`;

  const fallbackServer = String(fallbackUrl).trim().replace(/\/+$/, '');
  if (fallbackServer) return fallbackServer.endsWith('/api') ? fallbackServer : `${fallbackServer}/api`;
  throw new Error('GuardX API URL is not configured.');
}

export function normalizeLoginResponse(response) {
  if (response.networkError) return response;
  if (response.httpStatus === 401) return { ...response, message: 'Invalid email or password.' };
  if (response.httpStatus === 403 || response.code === 'WRONG_ROLE') return { ...response, message: 'This account belongs to a different TrustPay account type.' };
  if (response.httpStatus >= 500) return { ...response, message: 'TrustPay encountered a server error.' };
  return response;
}
