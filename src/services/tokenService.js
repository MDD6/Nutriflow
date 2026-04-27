const jwt = require('jsonwebtoken');

class TokenService {
  constructor(secret) {
    this.secret = secret;
  }

  create(user) {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        profile: user.profile,
      },
      this.secret,
      {
        expiresIn: '1d',
      }
    );
  }

  verify(token) {
    try {
      return jwt.verify(token, this.secret);
    } catch (error) {
      return null;
    }
  }
}

module.exports = {
  TokenService,
};