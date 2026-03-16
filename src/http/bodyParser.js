const { AppError } = require('../errors/appError');

function parseJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;

      if (body.length > 1e6) {
        request.destroy();
        reject(new AppError('Payload muito grande.', 413));
      }
    });

    request.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new AppError('JSON invalido.', 400));
      }
    });

    request.on('error', reject);
  });
}

module.exports = {
  parseJsonBody,
};
