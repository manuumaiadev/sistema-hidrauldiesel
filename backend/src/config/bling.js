const axios = require('axios');

const BLING_BASE_URL = 'https://www.bling.com.br/Api/v3';

const getBlingToken = async (pool) => {
  const resultado = await pool.query(
    "SELECT valor FROM configuracoes WHERE chave = 'bling_access_token'"
  );
  if (resultado.rows.length === 0) return null;
  return resultado.rows[0].valor;
};

const refreshBlingToken = async (pool) => {
  const refreshToken = await pool.query(
    "SELECT valor FROM configuracoes WHERE chave = 'bling_refresh_token'"
  );
  if (refreshToken.rows.length === 0) return null;

  const response = await axios.post(
    'https://www.bling.com.br/Api/v3/oauth/token',
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken.rows[0].valor
    }),
    {
      auth: {
        username: process.env.BLING_CLIENT_ID,
        password: process.env.BLING_CLIENT_SECRET
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }
  );

  const { access_token, refresh_token } = response.data;

  await pool.query(
    "INSERT INTO configuracoes (chave, valor) VALUES ('bling_access_token', $1) ON CONFLICT (chave) DO UPDATE SET valor = $1",
    [access_token]
  );
  await pool.query(
    "INSERT INTO configuracoes (chave, valor) VALUES ('bling_refresh_token', $1) ON CONFLICT (chave) DO UPDATE SET valor = $1",
    [refresh_token]
  );

  return access_token;
};

const blingRequest = async (pool, method, endpoint, params = {}, body = null) => {
  let token = await getBlingToken(pool);

  const buildConfig = (tkn) => {
    const cfg = {
      method,
      url: `${BLING_BASE_URL}${endpoint}`,
      params,
      headers: {
        Authorization: `Bearer ${tkn}`,
        'Content-Type': 'application/json'
      }
    };
    if (body) cfg.data = body;
    return cfg;
  };

  try {
    const response = await axios(buildConfig(token));
    return response.data;
  } catch (err) {
    if (err.response?.status === 401) {
      token = await refreshBlingToken(pool);
      const response = await axios(buildConfig(token));
      return response.data;
    }
    throw err;
  }
};

module.exports = { blingRequest, getBlingToken, refreshBlingToken };
