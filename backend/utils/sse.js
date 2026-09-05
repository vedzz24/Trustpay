let clients = [];

function sseHandler(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Send initial signal
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  clients.push({ res, merchantId: req.user?.merchantId || null });
  console.log(`📡 SSE client connected. Active connections: ${clients.length}`);

  req.on('close', () => {
    clients = clients.filter(client => client.res !== res);
    console.log(`📡 SSE client disconnected. Active connections: ${clients.length}`);
  });
}

function broadcastToMerchant(merchantId, type, data) {
  const payload = JSON.stringify({ type, data });
  clients.filter(client => client.merchantId === merchantId).forEach(client => {
    try {
      client.res.write(`data: ${payload}\n\n`);
    } catch (err) {
      console.error('Error sending merchant SSE data:', err.message);
    }
  });
}

function isMerchantStreamConnected(merchantId) {
  return clients.some(client => client.merchantId === merchantId);
}

module.exports = { sseHandler, broadcastToMerchant, isMerchantStreamConnected };
