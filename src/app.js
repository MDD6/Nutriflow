// Configuração principal da aplicação

const express = require('express');
const app = express();

// Middlewares
app.use(express.json());
app.use(express.static('public'));

// Rota raiz - Home
app.get('/', (req, res) => {
  res.json({
    message: 'Bem-vindo ao NutriFlow!',
    version: '1.0.0',
    description: 'Plataforma digital de acompanhamento nutricional'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Tratamento de erros 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

module.exports = app;
