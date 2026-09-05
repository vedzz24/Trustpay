function isDevelopmentOrigin(origin) {
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' || url.port !== '5173') return false;
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true;
    const parts = url.hostname.split('.').map(Number);
    if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false;
    return parts[0] === 10
      || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
      || (parts[0] === 192 && parts[1] === 168);
  } catch {
    return false;
  }
}

module.exports = { isDevelopmentOrigin };
