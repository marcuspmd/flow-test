#!/usr/bin/env node

const http = require('http');
const url = require('url');

const PORT = 3000;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const method = req.method;
  const path = parsedUrl.pathname;
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Config-ID');
  
  if (method === 'OPTIONS') {
    res.writeHead(200, {
      'Allow': 'GET, POST, PUT, DELETE, HEAD, OPTIONS',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Config-ID'
    });
    res.end();
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    // Parse body if JSON
    let parsedBody = null;
    try {
      if (body) parsedBody = JSON.parse(body);
    } catch (e) {
      // Not JSON, keep as string
      parsedBody = body;
    }

    const response = {
      args: parsedUrl.query,
      headers: req.headers,
      origin: req.connection.remoteAddress,
      url: `http://localhost:${PORT}${req.url}`,
      method: method,
      json: parsedBody,
      data: body,
      files: {},
      form: {}
    };

    // Handle specific endpoints
    switch (path) {
      case '/get':
        res.writeHead(200, { 'Content-Type': 'application/json' });
        if (method !== 'HEAD') {
          res.end(JSON.stringify(response));
        } else {
          res.end();
        }
        break;
        
      case '/post':
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
        break;
        
      case '/put':
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
        break;
        
      case '/delete':
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
        break;
        
      case '/patch':
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
        break;
        
      case '/headers':
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          headers: req.headers
        }));
        break;
        
      case '/ip':
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          origin: req.connection.remoteAddress
        }));
        break;
        
      case '/json':
        res.writeHead(200, { 'Content-Type': 'application/json' });
        if (method !== 'HEAD') {
          res.end(JSON.stringify({
            slideshow: {
              title: "Sample Slideshow"
            }
          }));
        } else {
          res.end();
        }
        break;
        
      case '/user-agent':
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          'user-agent': req.headers['user-agent'] || 'Unknown'
        }));
        break;
        
      case '/bearer':
        // Handle bearer token authentication test
        const bearerAuth = req.headers.authorization;
        if (bearerAuth && bearerAuth.startsWith('Bearer ')) {
          const token = bearerAuth.substring(7);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            authenticated: true,
            token: token,
            ...response
          }));
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'Unauthorized',
            message: 'Bearer token required'
          }));
        }
        break;
        
      case '/cache':
        // Echo back certain headers from the request
        const responseHeaders = {
          'Content-Type': 'application/json',
          'ETag': `"${Date.now()}"`,
          'Cache-Control': 'max-age=60'
        };
        
        // Echo back X-* headers from the request
        for (const [key, value] of Object.entries(req.headers)) {
          if (key.toLowerCase().startsWith('x-')) {
            responseHeaders[key] = value;
          }
        }
        
        res.writeHead(200, responseHeaders);
        res.end(JSON.stringify({
          cached: true,
          timestamp: Date.now(),
          ...response
        }));
        break;
        
      default:
        if (path.startsWith('/basic-auth/')) {
          // Handle basic auth endpoints
          const authHeader = req.headers.authorization;
          if (authHeader && authHeader.startsWith('Basic ')) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              authenticated: true,
              user: 'secure_user',
              ...response
            }));
          } else {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              error: 'Unauthorized',
              message: 'Basic authentication required'
            }));
          }
        } else if (path.startsWith('/status/')) {
          const statusCode = parseInt(path.split('/')[2]) || 200;
          res.writeHead(statusCode, { 'Content-Type': 'application/json' });
          if (method !== 'HEAD') {
            res.end(JSON.stringify({
              status: statusCode,
              message: `Status ${statusCode}`
            }));
          } else {
            res.end();
          }
        } else if (path.startsWith('/delay/')) {
          const delay = parseInt(path.split('/')[2]) || 1;
          setTimeout(() => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              ...response,
              delayed: delay
            }));
          }, delay * 1000);
        } else if (path.startsWith('/cache/')) {
          const ttl = parseInt(path.split('/')[2]) || 60;
          res.writeHead(200, { 
            'Content-Type': 'application/json',
            'ETag': `"${Date.now()}"`,
            'Cache-Control': `max-age=${ttl}`
          });
          res.end(JSON.stringify({
            ...response,
            cache_ttl: ttl
          }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'Not Found',
            path: path,
            method: method
          }));
        }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Mock HTTP server running on http://localhost:${PORT}`);
  console.log('Endpoints available:');
  console.log('  GET, POST, PUT, DELETE - /get, /post, /put, /delete');
  console.log('  GET /headers - Returns request headers');
  console.log('  GET /ip - Returns client IP');
  console.log('  GET /json - Returns sample JSON');
  console.log('  GET /user-agent - Returns user agent');
  console.log('  GET /status/{code} - Returns specific status code');
  console.log('  GET /delay/{seconds} - Returns response after delay');
  console.log('  GET /cache/{ttl} - Returns response with cache headers');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down mock server...');
  server.close(() => {
    console.log('Mock server closed.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nShutting down mock server...');
  server.close(() => {
    console.log('Mock server closed.');
    process.exit(0);
  });
});