const express = require('express');
const router  = express.Router();
const auth    = require('../middlewares/auth');
const { gerarFolhaDia05, gerarFolhaDia20, buscarFolha, atualizarLancamento, listarFolhas, excluirFolha, adicionarFuncionarioFolha, removerLancamento } = require('../controllers/folhaController');

router.get('/',                                auth, listarFolhas);
router.post('/gerar-dia05',                    auth, gerarFolhaDia05);
router.post('/gerar-dia20',                    auth, gerarFolhaDia20);
router.get('/:data_pagamento',                 auth, buscarFolha);
router.patch('/lancamento/:id',                auth, atualizarLancamento);
router.delete('/lancamento/:id',               auth, removerLancamento);
router.post('/:data_pagamento/funcionario',    auth, adicionarFuncionarioFolha);
router.delete('/:data_pagamento',              auth, excluirFolha);

module.exports = router;
