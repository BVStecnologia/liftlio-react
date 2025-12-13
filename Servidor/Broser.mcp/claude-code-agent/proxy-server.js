/**
 * Local Proxy Server - Handles authentication for Chrome
 * Chrome doesn't support proxy authentication in --proxy-server flag
 * This server acts as intermediary: Chrome -> LocalProxy -> DataImpulse
 */

const http = require('http');
const net = require('net');
const url = require('url');

const LOCAL_PORT = 8888;
const PROXY_URL = process.env.PROXY_URL;

if (!PROXY_URL) {
  console.log('[PROXY-SERVER] No PROXY_URL configured, exiting');
  process.exit(0);
}

// Parse proxy URL: http://user:pass@host:port
const parsedProxy = new URL(PROXY_URL);
const UPSTREAM_HOST = parsedProxy.hostname;
const UPSTREAM_PORT = parseInt(parsedProxy.port) || 80;
const UPSTREAM_AUTH = parsedProxy.username && parsedProxy.password
  ? Buffer.from(`${decodeURIComponent(parsedProxy.username)}:${decodeURIComponent(parsedProxy.password)}`).toString('base64')
  : null;

console.log(`[PROXY-SERVER] Starting local proxy on port ${LOCAL_PORT}`);
console.log(`[PROXY-SERVER] Upstream: ${UPSTREAM_HOST}:${UPSTREAM_PORT}`);
console.log(`[PROXY-SERVER] Auth: ${UPSTREAM_AUTH ? 'Configured' : 'None'}`);

// Handle HTTP requests
function handleRequest(clientReq, clientRes) {
  const options = {
    hostname: UPSTREAM_HOST,
    port: UPSTREAM_PORT,
    path: clientReq.url,
    method: clientReq.method,
    headers: { ...clientReq.headers }
  };

  if (UPSTREAM_AUTH) {
    options.headers['Proxy-Authorization'] = `Basic ${UPSTREAM_AUTH}`;
  }

  const proxyReq = http.request(options, (proxyRes) => {
    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(clientRes);
  });

  proxyReq.on('error', (err) => {
    console.error(`[PROXY-SERVER] HTTP Error: ${err.message}`);
    clientRes.writeHead(502);
    clientRes.end('Bad Gateway');
  });

  clientReq.pipe(proxyReq);
}

// Handle HTTPS CONNECT requests (tunneling)
function handleConnect(clientReq, clientSocket, head) {
  const [targetHost, targetPort] = clientReq.url.split(':');

  // Connect to upstream proxy
  const proxySocket = net.connect(UPSTREAM_PORT, UPSTREAM_HOST, () => {
    // Send CONNECT request to upstream proxy with auth
    let connectReq = `CONNECT ${clientReq.url} HTTP/1.1\r\n`;
    connectReq += `Host: ${clientReq.url}\r\n`;
    if (UPSTREAM_AUTH) {
      connectReq += `Proxy-Authorization: Basic ${UPSTREAM_AUTH}\r\n`;
    }
    connectReq += '\r\n';

    proxySocket.write(connectReq);
  });

  proxySocket.once('data', (data) => {
    const response = data.toString();
    if (response.includes('200')) {
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      proxySocket.pipe(clientSocket);
      clientSocket.pipe(proxySocket);
    } else {
      console.error(`[PROXY-SERVER] CONNECT failed: ${response.split('\r\n')[0]}`);
      clientSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
      clientSocket.end();
      proxySocket.end();
    }
  });

  proxySocket.on('error', (err) => {
    console.error(`[PROXY-SERVER] CONNECT Error: ${err.message}`);
    clientSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
    clientSocket.end();
  });

  clientSocket.on('error', (err) => {
    console.error(`[PROXY-SERVER] Client Error: ${err.message}`);
    proxySocket.end();
  });
}

// Create server
const server = http.createServer(handleRequest);
server.on('connect', handleConnect);

server.listen(LOCAL_PORT, '127.0.0.1', () => {
  console.log(`[PROXY-SERVER] Listening on 127.0.0.1:${LOCAL_PORT}`);
  console.log(`[PROXY-SERVER] Chrome should use: --proxy-server=http://127.0.0.1:${LOCAL_PORT}`);
});

// Handle errors
server.on('error', (err) => {
  console.error(`[PROXY-SERVER] Server Error: ${err.message}`);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[PROXY-SERVER] Shutting down...');
  server.close();
  process.exit(0);
});
