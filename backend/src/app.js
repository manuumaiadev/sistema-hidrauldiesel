const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const app = express();

// Conectar ao banco
require('./config/database');

// Criar tabelas
require('./config/migrations');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Arquivos estáticos — uploads de fotos
app.use('/uploads/fotos', express.static(path.join(__dirname, '../uploads/fotos')));

// Rotas
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/os',      require('./routes/os'));
app.use('/api/mecanicos', require('./routes/mecanicos'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/comissoes', require('./routes/comissoes'));
app.use('/api/historico', require('./routes/historico'));
app.use('/api/bling',   require('./routes/bling'));
app.use('/api/detran',  require('./routes/detran'));
app.use('/api/anexos',           require('./routes/anexos'));
app.use('/api/funcionarios',     require('./routes/funcionarios'));
app.use('/api/folha',            require('./routes/folha'));
app.use('/api/vale-transporte',  require('./routes/valeTransporte'));
app.use('/api/vale-alimentacao', require('./routes/valeAlimentacao'));
app.use('/api/ponto',            require('./routes/ponto'));
app.use('/api/faturamento',      require('./routes/faturamento'));
app.use('/api/contas-receber',   require('./routes/contasReceber'));
app.use('/api/email',            require('./routes/email'));
app.use('/api/configuracoes',    require('./routes/configuracoes'));

// Rota de teste
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Hidrauldiesel API rodando!' });
});

module.exports = app;
