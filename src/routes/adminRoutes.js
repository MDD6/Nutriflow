const express = require('express');
const { asyncHandler } = require('../middlewares/asyncHandler');

function createAdminRoutes(adminController) {
  const router = express.Router();

  router.get('/summary', asyncHandler(adminController.getSummary.bind(adminController)));
  router.get('/users', asyncHandler(adminController.getUsers.bind(adminController)));
  router.patch('/users/:userId/status', asyncHandler(adminController.updateUserStatus.bind(adminController)));
  router.delete('/users/:userId', asyncHandler(adminController.deleteUser.bind(adminController)));
  router.get('/foods', asyncHandler(adminController.getFoods.bind(adminController)));
  router.post('/foods', asyncHandler(adminController.createFood.bind(adminController)));

  return router;
}

module.exports = {
  createAdminRoutes,
};
