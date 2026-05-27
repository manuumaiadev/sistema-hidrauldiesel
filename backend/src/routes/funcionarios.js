const express = require('express');
const router  = express.Router();
const auth    = require('../middlewares/auth');
const {
  listarFuncionarios, criarFuncionario, atualizarFuncionario, deletarFuncionario,
  registrarAdiantamento, listarAdiantamentos, editarAdiantamento, deletarAdiantamento,
  registrarFerias,
  registrarRescisao,
  registrarDecimo, listarDecimos,
  resumoPagamentos,
  vincularEmpresa, listarEmpresasVendedor, calcularComissaoVendedor,
} = require('../controllers/funcionarioController');

router.get('/',      auth, listarFuncionarios);
router.post('/',     auth, criarFuncionario);
router.patch('/:id', auth, atualizarFuncionario);
router.delete('/:id', auth, deletarFuncionario);

router.post('/adiantamento',         auth, registrarAdiantamento);
router.patch('/adiantamento/:id',    auth, editarAdiantamento);
router.delete('/adiantamento/:id',   auth, deletarAdiantamento);
router.get('/:id/adiantamentos',     auth, listarAdiantamentos);

router.post('/ferias',               auth, registrarFerias);
router.post('/rescisao',             auth, registrarRescisao);

router.post('/decimo',               auth, registrarDecimo);
router.get('/:id/decimos',           auth, listarDecimos);
router.get('/:id/resumo',            auth, resumoPagamentos);

router.post('/vendedor/empresa',     auth, vincularEmpresa);
router.get('/:id/empresas',          auth, listarEmpresasVendedor);
router.get('/:id/comissao-vendedor', auth, calcularComissaoVendedor);

module.exports = router;
