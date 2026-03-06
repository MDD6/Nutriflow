const express = require('express');
const { asyncHandler } = require('../middlewares/asyncHandler');

function createNutritionistRoutes(nutritionistDashboardController) {
  const router = express.Router();

  router.get('/dashboard', asyncHandler(nutritionistDashboardController.getDashboard.bind(nutritionistDashboardController)));
  router.get('/conversation', asyncHandler(nutritionistDashboardController.getConversation.bind(nutritionistDashboardController)));
  router.post('/meal-plans', asyncHandler(nutritionistDashboardController.createMealPlan.bind(nutritionistDashboardController)));
  router.post('/assessments', asyncHandler(nutritionistDashboardController.createAssessment.bind(nutritionistDashboardController)));
  router.post('/challenges', asyncHandler(nutritionistDashboardController.createChallenge.bind(nutritionistDashboardController)));
  router.post('/link-patient', asyncHandler(nutritionistDashboardController.linkPatient.bind(nutritionistDashboardController)));
  router.post('/messages', asyncHandler(nutritionistDashboardController.sendMessage.bind(nutritionistDashboardController)));

  return router;
}

module.exports = {
  createNutritionistRoutes,
};
