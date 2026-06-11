const express = require('express');
const router  = express.Router();
const auth    = require('../middlewares/auth');
const { gerarValeTransporte, listarVales, buscarVale, excluirVale, resumoMensalVales } = require('../controllers/valeTransporteController');

router.post('/gerar',             auth, gerarValeTransporte);
router.get('/resumo-mensal',      auth, resumoMensalVales);
router.get('/',                   auth, listarVales);
router.get('/:data_pagamento',    auth, buscarVale);
router.delete('/:data_pagamento', auth, excluirVale);

module.exports = router;
