const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const {
  autorizar, callback, listarTodosClientes, criarCliente, buscarProdutos,
  criarServico, buscarServicos, criarPeca, buscarPecas, consultarEstoque,
  importarPedidosBling
} = require('../controllers/blingController');

router.get('/autorizar', auth, autorizar);
router.get('/callback', callback);
router.get('/clientes', auth, listarTodosClientes);
router.post('/clientes', auth, criarCliente);
router.get('/produtos', auth, buscarProdutos);
router.get('/servicos', auth, buscarServicos);
router.post('/servicos', auth, criarServico);
router.get('/pecas', auth, buscarPecas);
router.post('/pecas', auth, criarPeca);
router.get('/estoque/:id',       auth, consultarEstoque);
router.post('/importar-pedidos', auth, importarPedidosBling);

module.exports = router;
