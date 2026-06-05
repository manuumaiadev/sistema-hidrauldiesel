const express = require('express');
const multer  = require('multer');
const router  = express.Router();
const auth    = require('../middlewares/auth');
const { listarFaturamentos, criarFaturamento, atualizarFaturamento, marcarVencimentoPago, atualizarStatus, atualizarStatusLote, deletarFaturamento, gerarOSRetroativo } = require('../controllers/faturamentoController');
const { importarPdfBling } = require('../controllers/importarPdfController');
const anexosCtrl = require('../controllers/faturamentoAnexosController');

const uploadPdf  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const uploadAnex = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

router.get('/',                        auth, listarFaturamentos);
router.post('/',                       auth, criarFaturamento);
router.post('/importar-pdf',           auth, uploadPdf.single('pdf'), importarPdfBling);
router.post('/gerar-os-retroativo',    auth, gerarOSRetroativo);
router.patch('/lote/status',           auth, atualizarStatusLote);
router.patch('/vencimento/:id/pagar',  auth, marcarVencimentoPago);
router.patch('/:id/status',            auth, atualizarStatus);
router.patch('/:id',                   auth, atualizarFaturamento);
router.delete('/:id',                  auth, deletarFaturamento);

// Anexos por faturamento
router.get   ('/:id/anexos',             auth, anexosCtrl.listar);
router.post  ('/:id/anexos',             auth, uploadAnex.single('arquivo'), anexosCtrl.upload);
router.delete('/:id/anexos/:anexoId',    auth, anexosCtrl.deletar);
router.get   ('/:id/anexos/:anexoId/arquivo', auth, anexosCtrl.servir);

// Histórico de envios
router.get('/:id/envios', auth, async (req, res) => {
  try {
    const { rows } = await require('../config/database').query(
      `SELECT id, canal, destinatarios, assunto, documentos, enviado_por,
              TO_CHAR(enviado_em AT TIME ZONE 'America/Fortaleza', 'DD/MM/YYYY HH24:MI') AS enviado_em_fmt,
              enviado_em
       FROM faturamento_envios
       WHERE faturamento_id = $1
       ORDER BY enviado_em DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
