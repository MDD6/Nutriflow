const express = require('express');
const { asyncHandler } = require('../middlewares/asyncHandler');

function createPatientRoutes(patientDashboardController) {
  const router = express.Router();

  router.get('/dashboard', asyncHandler(patientDashboardController.getDashboard.bind(patientDashboardController)));
  router.get('/chat', asyncHandler(patientDashboardController.getChat.bind(patientDashboardController)));
  router.post('/meals', asyncHandler(patientDashboardController.createMealEntry.bind(patientDashboardController)));
  router.post('/link-nutritionist', asyncHandler(patientDashboardController.linkNutritionist.bind(patientDashboardController)));
  router.post('/messages', asyncHandler(patientDashboardController.sendMessage.bind(patientDashboardController)));

  return router;
}

module.exports = {
  createPatientRoutes,
};
