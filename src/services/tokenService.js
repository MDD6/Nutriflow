const crypto = require('crypto');

class TokenService {
  constructor(secret) {
    this.secret = secret;
  }

  create(user) {
    const payload = Buffer.from(
      JSON.stringify({
        sub: user.id,
        email: user.email,
        profile: user.profile,
        exp: Date.now() + 1000 * 60 * 60 * 24,
      }),
      'utf-8',
    ).toString('base64url');

    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(payload)
      .digest('base64url');

    return `${payload}.${signature}`;
  }
}

module.exports = {
  TokenService,
};
