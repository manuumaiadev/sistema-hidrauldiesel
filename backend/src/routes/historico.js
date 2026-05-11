const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { listarHistorico } = require('../controllers/historicoController');

router.get('/', auth, listarHistorico);

module.exports = router;
