const axios = require('axios');

const consultarPlaca = async (req, res) => {
  const { placa } = req.params;

  try {
    const response = await axios.get(
      `https://brasilapi.com.br/api/fipe/preco/v1/${placa}`,
      { timeout: 5000 }
    );

    res.json(response.data);
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ erro: 'Veículo não encontrado para esta placa' });
    }
    res.status(500).json({ erro: 'Erro ao consultar placa' });
  }
};

module.exports = { consultarPlaca };
