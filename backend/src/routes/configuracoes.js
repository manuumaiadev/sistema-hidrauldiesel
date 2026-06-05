const express = require('express');
const router  = express.Router();
const auth    = require('../middlewares/auth');
const ctrl    = require('../controllers/configuracoesController');

router.get('/',           auth, ctrl.listar);
router.put('/',           auth, ctrl.salvar);
router.post('/testar-email', auth, ctrl.testarEmail);

module.exports = router;
