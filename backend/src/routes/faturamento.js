const express = require('express');
const router  = express.Router();
const auth    = require('../middlewares/auth');
const { listarFaturamentos, criarFaturamento, atualizarFaturamento, marcarVencimentoPago, atualizarStatus, atualizarStatusLote, deletarFaturamento, gerarOSRetroativo } = require('../controllers/faturamentoController');

router.get('/',                        auth, listarFaturamentos);
router.post('/',                       auth, criarFaturamento);
router.post('/gerar-os-retroativo',    auth, gerarOSRetroativo);
router.patch('/lote/status',           auth, atualizarStatusLote);
router.patch('/vencimento/:id/pagar',  auth, marcarVencimentoPago);
router.patch('/:id/status',            auth, atualizarStatus);
router.patch('/:id',                   auth, atualizarFaturamento);
router.delete('/:id',                  auth, deletarFaturamento);

module.exports = router;
