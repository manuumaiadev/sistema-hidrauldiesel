const express = require('express');
const multer  = require('multer');
const path    = require('path');
const auth    = require('../middlewares/auth');
const { uploadFoto, listarAnexos, deletarAnexo } = require('../controllers/anexoController');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads/fotos'),
  filename: (req, file, cb) => {
    const ext   = path.extname(file.originalname);
    const nome  = `os${req.params.os_id}_${Date.now()}${ext}`;
    cb(null, nome);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Apenas imagens são permitidas'));
  }
});

const router = express.Router();

router.post('/:os_id/fotos', auth, upload.single('foto'), uploadFoto);
router.get('/:os_id',        auth, listarAnexos);
router.delete('/:id',        auth, deletarAnexo);

module.exports = router;
