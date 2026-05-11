const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { listarComissoes } = require('../controllers/comissaoController');

router.get('/', auth, listarComissoes);

module.exports = router;
