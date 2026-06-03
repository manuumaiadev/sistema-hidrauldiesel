const express = require('express');
const router  = express.Router();
const auth    = require('../middlewares/auth');
const { listarContasReceber, marcarPago, marcarPendente } = require('../controllers/contasReceberController');

router.get('/',             auth, listarContasReceber);
router.patch('/:id/pagar',  auth, marcarPago);
router.patch('/:id/reverter', auth, marcarPendente);

module.exports = router;
