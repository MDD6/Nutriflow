const fs = require('fs');
const path = require('path');
const { sendJson } = require('./response');

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

class StaticFileHandler {
  constructor(frontendDir) {
    this.frontendDir = frontendDir;
  }

  handle(request, response) {
    const requestPath = request.url === '/' ? '/index.html' : request.url;
    const safePath = path.normalize(decodeURIComponent(requestPath)).replace(/^(\.\.[/\\])+/, '');
    const filePath = path.join(this.frontendDir, safePath);

    if (!filePath.startsWith(this.frontendDir)) {
      sendJson(response, 403, { message: 'Acesso negado.' });
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        sendJson(response, 404, { message: 'Arquivo nao encontrado.' });
        return;
      }

      const extension = path.extname(filePath).toLowerCase();
      response.writeHead(200, {
        'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
      });
      response.end(data);
    });
  }
}

module.exports = {
  StaticFileHandler,
};
