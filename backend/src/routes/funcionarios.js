const express = require('express');
const router  = express.Router();
const auth    = require('../middlewares/auth');
const {
  listarFuncionarios, criarFuncionario, atualizarFuncionario, deletarFuncionario,
  registrarAdiantamento, listarAdiantamentos,
  registrarFerias,
  registrarRescisao,
  vincularEmpresa, listarEmpresasVendedor, calcularComissaoVendedor,
} = require('../controllers/funcionarioController');

router.get('/',      auth, listarFuncionarios);
router.post('/',     auth, criarFuncionario);
router.patch('/:id', auth, atualizarFuncionario);
router.delete('/:id', auth, deletarFuncionario);

router.post('/adiantamento',         auth, registrarAdiantamento);
router.get('/:id/adiantamentos',     auth, listarAdiantamentos);

router.post('/ferias',               auth, registrarFerias);
router.post('/rescisao',             auth, registrarRescisao);

router.post('/vendedor/empresa',     auth, vincularEmpresa);
router.get('/:id/empresas',          auth, listarEmpresasVendedor);
router.get('/:id/comissao-vendedor', auth, calcularComissaoVendedor);

module.exports = router;
