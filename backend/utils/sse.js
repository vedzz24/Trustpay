let clients = [];

function sseHandler(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Send initial signal
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  clients.push(res);
  console.log(`📡 SSE client connected. Active connections: ${clients.length}`);

  req.on('close', () => {
    clients = clients.filter(c => c !== res);
    console.log(`📡 SSE client disconnected. Active connections: ${clients.length}`);
  });
}

function broadcast(type, data) {
  const payload = JSON.stringify({ type, data });
  console.log(`📢 Broadcasting SSE event: ${type}`);
  clients.forEach(client => {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch (err) {
      console.error('Error sending SSE data to client:', err.message);
    }
  });
}

module.exports = { sseHandler, broadcast };
