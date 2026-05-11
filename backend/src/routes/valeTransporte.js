const express = require('express');
const router  = express.Router();
const auth    = require('../middlewares/auth');
const { gerarValeTransporte, listarVales, buscarVale, excluirVale } = require('../controllers/valeTransporteController');

router.post('/gerar',             auth, gerarValeTransporte);
router.get('/',                   auth, listarVales);
router.get('/:data_pagamento',    auth, buscarVale);
router.delete('/:data_pagamento', auth, excluirVale);

module.exports = router;
