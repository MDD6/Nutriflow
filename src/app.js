// Configuração principal da aplicação

const express = require('express');
const path = require('path');
const app = express();

// Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public'), { 
  setHeaders: (res, filePath) => {
    // Permitir acesso aos arquivos estáticos
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Rota raiz - Home (servir página inicial)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/home/index.html'));
});

// API Routes
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Validação básica
  if (!email || !password) {
    return res.status(400).json({ message: 'Email e senha são obrigatórios' });
  }
  
  // Simulação de autenticação (substituir com banco de dados)
  if (email === 'test@nutriflow.com' && password === 'password123') {
    return res.json({ 
      token: 'token_' + Date.now(),
      user: { id: 1, email, name: 'Usuário Teste' }
    });
  }
  
  res.status(401).json({ message: 'Email ou senha incorretos' });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password, profile } = req.body;
  
  if (!name || !email || !password || !profile) {
    return res.status(400).json({ message: 'Dados incompletos' });
  }
  
  // Simulação de registro (substituir com banco de dados)
  res.json({ 
    token: 'token_' + Date.now(),
    user: { id: Date.now(), name, email, profile }
  });
});

app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body;
  
  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Dados incompletos' });
  }
  
  // Simulação de contato
  console.log('📧 Novo contato:', { name, email, message });
  res.json({ message: 'Mensagem recebida com sucesso' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', environment: process.env.NODE_ENV || 'development' });
});

// Tratamento de erros 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

module.exports = app;
