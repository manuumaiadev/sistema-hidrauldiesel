const express = require('express');
const router  = express.Router();
const auth    = require('../middlewares/auth');
const { gerarValeAlimentacao, listarValesAlimentacao, buscarValeAlimentacao, excluirValeAlimentacao } = require('../controllers/valeTransporteController');

router.post('/gerar',             auth, gerarValeAlimentacao);
router.get('/',                   auth, listarValesAlimentacao);
router.get('/:data_pagamento',    auth, buscarValeAlimentacao);
router.delete('/:data_pagamento', auth, excluirValeAlimentacao);

module.exports = router;
