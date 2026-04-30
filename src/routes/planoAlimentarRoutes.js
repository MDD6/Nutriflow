const express = require('express');
const { asyncHandler } = require('../middlewares/asyncHandler');

function createPlanoAlimentarRoutes(planoAlimentarController) {
  const router = express.Router();

  router.get('/:id', asyncHandler(planoAlimentarController.getPlanoAlimentarById.bind(planoAlimentarController)));

  return router;
}

module.exports = {
  createPlanoAlimentarRoutes,
};
