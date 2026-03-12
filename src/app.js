// Configuração principal da aplicação

const express = require('express');
const path = require('path');
const app = express();

// Middlewares
app.use(express.json());
app.use(express.static('public'));

// Rota raiz - Home (servir página inicial)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/home/index.html'));
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
