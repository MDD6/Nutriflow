const express = require('express');
const { asyncHandler } = require('../middlewares/asyncHandler');

function createNutritionistRoutes(nutritionistDashboardController) {
  const router = express.Router();

  router.get('/dashboard', asyncHandler(nutritionistDashboardController.getDashboard.bind(nutritionistDashboardController)));
  router.get('/conversation', asyncHandler(nutritionistDashboardController.getConversation.bind(nutritionistDashboardController)));
  router.get('/conversation/stream', asyncHandler(nutritionistDashboardController.openConversationStream.bind(nutritionistDashboardController)));
  
  router.post('/meal-plans', asyncHandler(nutritionistDashboardController.createMealPlan.bind(nutritionistDashboardController)));
  router.post('/assessments', asyncHandler(nutritionistDashboardController.createAssessment.bind(nutritionistDashboardController)));
  router.post('/challenges', asyncHandler(nutritionistDashboardController.createChallenge.bind(nutritionistDashboardController)));
  router.post('/appointments', asyncHandler(nutritionistDashboardController.createAppointment.bind(nutritionistDashboardController))); // Nova Rota
  router.patch('/appointments/:id/status', asyncHandler(nutritionistDashboardController.updateAppointmentStatus.bind(nutritionistDashboardController)));
  router.patch('/appointments/:id/reschedule', asyncHandler(nutritionistDashboardController.rescheduleAppointment.bind(nutritionistDashboardController)));
  
  router.post('/link-patient', asyncHandler(nutritionistDashboardController.linkPatient.bind(nutritionistDashboardController)));
  router.post('/messages', asyncHandler(nutritionistDashboardController.sendMessage.bind(nutritionistDashboardController)));
  
  // Adicionar paciente a um desafio existente
  router.post('/challenges/:id/participants', asyncHandler(nutritionistDashboardController.addChallengeParticipant.bind(nutritionistDashboardController)));

  // Rota genérica para excluir qualquer recurso (Planos, Avaliações, Agenda, Desafios)
  router.delete('/:resource/:id', asyncHandler(nutritionistDashboardController.deleteResource.bind(nutritionistDashboardController)));

  return router;
}

module.exports = {
  createNutritionistRoutes,
};
