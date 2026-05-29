const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { listarOS, buscarOS, buscarOSByNumero, criarOS, atualizarOS, atualizarStatus, faturarOS, excluirOS, listarParcelas, salvarParcelas } = require('../controllers/osController');

router.get('/', auth, listarOS);
router.get('/numero/:numero', auth, buscarOSByNumero);
router.get('/:id/parcelas', auth, listarParcelas);
router.post('/:id/parcelas', auth, salvarParcelas);
router.get('/:id', auth, buscarOS);
router.post('/', auth, criarOS);
router.put('/:id', auth, atualizarOS);
router.patch('/:id/status', auth, atualizarStatus);
router.post('/:id/faturar', auth, faturarOS);
router.delete('/:id', auth, excluirOS);

module.exports = router;
