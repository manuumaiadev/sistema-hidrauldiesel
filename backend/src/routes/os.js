const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { listarOS, buscarOS, criarOS, atualizarOS, atualizarStatus, faturarOS, excluirOS } = require('../controllers/osController');

router.get('/', auth, listarOS);
router.get('/:id', auth, buscarOS);
router.post('/', auth, criarOS);
router.put('/:id', auth, atualizarOS);
router.patch('/:id/status', auth, atualizarStatus);
router.post('/:id/faturar', auth, faturarOS);
router.delete('/:id', auth, excluirOS);

module.exports = router;
