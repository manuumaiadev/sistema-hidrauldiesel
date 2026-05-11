const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { consultarPlaca } = require('../controllers/detranController');

router.get('/:placa', auth, consultarPlaca);

module.exports = router;
