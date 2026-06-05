const express = require('express');
const multer  = require('multer');
const router  = express.Router();
const auth    = require('../middlewares/auth');
const { enviarCobranca } = require('../controllers/emailController');

// Arquivos ficam em memória (buffer), não são gravados em disco
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.post('/enviar-cobranca', auth, upload.array('anexos', 20), enviarCobranca);

module.exports = router;
