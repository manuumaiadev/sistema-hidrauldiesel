const express = require('express');
const router  = express.Router();
const auth    = require('../middlewares/auth');
const { buscarPontoMes, registrarPonto } = require('../controllers/pontoController');

router.get('/:mes/:ano', auth, buscarPontoMes);
router.post('/',         auth, registrarPonto);

module.exports = router;
