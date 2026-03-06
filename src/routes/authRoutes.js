const express = require('express');
const { asyncHandler } = require('../middlewares/asyncHandler');

function createAuthRoutes(authController) {
  const router = express.Router();

  router.post('/register', asyncHandler(authController.register.bind(authController)));
  router.post('/login', asyncHandler(authController.login.bind(authController)));

  return router;
}

module.exports = {
  createAuthRoutes,
};
