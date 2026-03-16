// NutriFlow - Sistema de acompanhamento nutricional
// Arquivo principal da aplicação

const app = require('./app');
const config = require('../config/config');

const PORT = config.port || 3000;

app.listen(PORT, () => {
  console.log(`🚀 NutriFlow rodando em: http://localhost:${PORT}`);
  console.log(`📝 Ambiente: ${config.nodeEnv}`);
});
