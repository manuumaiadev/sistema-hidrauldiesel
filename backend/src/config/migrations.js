const pool = require('./database');

const createTables = async () => {
  try {

    // Usuários
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(200) NOT NULL,
        email VARCHAR(200) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL,
        perfil VARCHAR(20) NOT NULL DEFAULT 'mecanico',
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Mecânicos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mecanicos (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id),
        nome VARCHAR(200) NOT NULL,
        telefone VARCHAR(20),
        percentual_comissao DECIMAL(5,2) DEFAULT 0,
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Veículos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS veiculos (
        id SERIAL PRIMARY KEY,
        placa VARCHAR(10) UNIQUE NOT NULL,
        modelo VARCHAR(200),
        ano VARCHAR(10),
        cor VARCHAR(50),
        chassi VARCHAR(50),
        motor VARCHAR(100),
        cliente_id INTEGER,
        cliente_nome VARCHAR(200),
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Ordens de Serviço
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ordens_servico (
        id SERIAL PRIMARY KEY,
        numero VARCHAR(20) UNIQUE NOT NULL,
        cliente_id INTEGER,
        cliente_nome VARCHAR(200),
        veiculo_id INTEGER REFERENCES veiculos(id),
        status VARCHAR(30) NOT NULL DEFAULT 'orcamento',
        queixa TEXT,
        obs_tecnica TEXT,
        km_atual VARCHAR(20),
        bling_pedido_id INTEGER,
        criado_em TIMESTAMP DEFAULT NOW(),
        atualizado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Itens de Serviço
    await pool.query(`
      CREATE TABLE IF NOT EXISTS itens_servico (
        id SERIAL PRIMARY KEY,
        os_id INTEGER REFERENCES ordens_servico(id) ON DELETE CASCADE,
        bling_produto_id INTEGER,
        descricao VARCHAR(200) NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        mecanico_id INTEGER REFERENCES mecanicos(id),
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Itens de Peças
    await pool.query(`
      CREATE TABLE IF NOT EXISTS itens_pecas (
        id SERIAL PRIMARY KEY,
        os_id INTEGER REFERENCES ordens_servico(id) ON DELETE CASCADE,
        bling_produto_id INTEGER,
        descricao VARCHAR(200) NOT NULL,
        quantidade DECIMAL(10,3) NOT NULL,
        valor_unit DECIMAL(10,2) NOT NULL,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Comissões
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comissoes (
        id SERIAL PRIMARY KEY,
        mecanico_id INTEGER REFERENCES mecanicos(id),
        os_id INTEGER REFERENCES ordens_servico(id),
        item_servico_id INTEGER REFERENCES itens_servico(id),
        valor_servico DECIMAL(10,2) NOT NULL,
        percentual DECIMAL(5,2) NOT NULL,
        valor_comissao DECIMAL(10,2) NOT NULL,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Histórico de alterações
    await pool.query(`
      CREATE TABLE IF NOT EXISTS historico (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id),
        usuario_nome VARCHAR(200),
        tabela VARCHAR(50) NOT NULL,
        registro_id INTEGER NOT NULL,
        acao VARCHAR(20) NOT NULL,
        dados_anteriores JSONB,
        dados_novos JSONB,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Adiciona quantidade em itens_servico (idempotente)
    await pool.query(`
      ALTER TABLE itens_servico
      ADD COLUMN IF NOT EXISTS quantidade DECIMAL(10,3) NOT NULL DEFAULT 1;
    `);

    // Bling IDs podem ser > 2 bilhões — converte para BIGINT (idempotente)
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE ordens_servico ALTER COLUMN bling_pedido_id TYPE BIGINT;
      EXCEPTION WHEN others THEN NULL;
      END $$;
    `);
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE ordens_servico ALTER COLUMN cliente_id TYPE BIGINT;
      EXCEPTION WHEN others THEN NULL;
      END $$;
    `);
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE veiculos ALTER COLUMN cliente_id TYPE BIGINT;
      EXCEPTION WHEN others THEN NULL;
      END $$;
    `);
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE itens_servico ALTER COLUMN bling_produto_id TYPE BIGINT;
      EXCEPTION WHEN others THEN NULL;
      END $$;
    `);
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE itens_pecas ALTER COLUMN bling_produto_id TYPE BIGINT;
      EXCEPTION WHEN others THEN NULL;
      END $$;
    `);

    // Configurações do sistema (tokens OAuth, etc.)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS configuracoes (
        chave VARCHAR(100) PRIMARY KEY,
        valor TEXT NOT NULL,
        atualizado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Adiciona checklist em ordens_servico (idempotente)
    await pool.query(`
      ALTER TABLE ordens_servico
      ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '{}';
    `);

    // Pedido de Compra e Pedido de Serviço (idempotente)
    await pool.query(`
      ALTER TABLE ordens_servico
      ADD COLUMN IF NOT EXISTS num_pedido_compra VARCHAR(100),
      ADD COLUMN IF NOT EXISTS num_pedido_servico VARCHAR(100);
    `);

    // km_atual e frota (idempotente)
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE ordens_servico ADD COLUMN km_atual VARCHAR(20);
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE ordens_servico ADD COLUMN frota VARCHAR(50);
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `);

    // Funcionários e folha de pagamento
    await pool.query(`
      CREATE TABLE IF NOT EXISTS funcionarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(200) NOT NULL,
        tipo VARCHAR(20) NOT NULL DEFAULT 'informal',
        cargo VARCHAR(100),
        salario_oficial DECIMAL(10,2) DEFAULT 0,
        salario_adicional DECIMAL(10,2) DEFAULT 0,
        adiantamento_fixo DECIMAL(10,2) DEFAULT 0,
        vale_transporte DECIMAL(10,2) DEFAULT 0,
        percentual_inss DECIMAL(5,2) DEFAULT 0,
        data_admissao DATE,
        ativo BOOLEAN DEFAULT true,
        mecanico_id INTEGER REFERENCES mecanicos(id),
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS folha_pagamento (
        id SERIAL PRIMARY KEY,
        funcionario_id INTEGER REFERENCES funcionarios(id),
        tipo VARCHAR(20) NOT NULL,
        data_pagamento DATE NOT NULL,
        salario_oficial DECIMAL(10,2) DEFAULT 0,
        salario_adicional DECIMAL(10,2) DEFAULT 0,
        desconto_inss DECIMAL(10,2) DEFAULT 0,
        desconto_adiantamento DECIMAL(10,2) DEFAULT 0,
        desconto_faltas DECIMAL(10,2) DEFAULT 0,
        outros_descontos DECIMAL(10,2) DEFAULT 0,
        outros_acrescimos DECIMAL(10,2) DEFAULT 0,
        valor_pago DECIMAL(10,2) DEFAULT 0,
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS vale_transporte (
        id SERIAL PRIMARY KEY,
        funcionario_id INTEGER REFERENCES funcionarios(id),
        data_pagamento DATE NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ponto (
        id SERIAL PRIMARY KEY,
        funcionario_id INTEGER REFERENCES funcionarios(id),
        data DATE NOT NULL,
        presente BOOLEAN DEFAULT true,
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Anexos de fotos por OS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS anexos (
        id SERIAL PRIMARY KEY,
        os_id INTEGER REFERENCES ordens_servico(id) ON DELETE CASCADE,
        nome_arquivo VARCHAR(255) NOT NULL,
        nome_original VARCHAR(255),
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Constraint única no vale transporte
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE vale_transporte ADD CONSTRAINT vt_funcionario_data_unique UNIQUE (funcionario_id, data_pagamento);
      EXCEPTION WHEN duplicate_object THEN NULL;
                WHEN duplicate_table  THEN NULL;
      END $$;
    `);

    // Constraint única na folha
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE folha_pagamento ADD CONSTRAINT folha_funcionario_data_unique UNIQUE (funcionario_id, data_pagamento);
      EXCEPTION WHEN duplicate_object THEN NULL;
                WHEN duplicate_table  THEN NULL;
      END $$;
    `);

    // Ponto: adiciona status e constraint única
    await pool.query(`ALTER TABLE ponto ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'presente';`);
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE ponto ADD CONSTRAINT ponto_funcionario_data_unique UNIQUE (funcionario_id, data);
      EXCEPTION WHEN duplicate_object THEN NULL;
                WHEN duplicate_table  THEN NULL;
      END $$;
    `);

    // Colunas extras em funcionarios (idempotente)
    await pool.query(`
      ALTER TABLE funcionarios
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ativo',
      ADD COLUMN IF NOT EXISTS cargo_tipo VARCHAR(20) DEFAULT 'outro',
      ADD COLUMN IF NOT EXISTS percentual_comissao DECIMAL(5,2) DEFAULT 0;
    `);

    // Adiantamentos avulsos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS adiantamentos (
        id SERIAL PRIMARY KEY,
        funcionario_id INTEGER REFERENCES funcionarios(id),
        valor DECIMAL(10,2) NOT NULL,
        data DATE NOT NULL,
        desconto_em VARCHAR(20),
        descontado BOOLEAN DEFAULT false,
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Férias
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ferias (
        id SERIAL PRIMARY KEY,
        funcionario_id INTEGER REFERENCES funcionarios(id),
        data_inicio DATE NOT NULL,
        data_fim DATE NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Rescisão
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rescisao (
        id SERIAL PRIMARY KEY,
        funcionario_id INTEGER REFERENCES funcionarios(id),
        data_rescisao DATE NOT NULL,
        valor_saldo DECIMAL(10,2) DEFAULT 0,
        valor_ferias_prop DECIMAL(10,2) DEFAULT 0,
        valor_decimo_terceiro DECIMAL(10,2) DEFAULT 0,
        valor_fgts DECIMAL(10,2) DEFAULT 0,
        outros_valores DECIMAL(10,2) DEFAULT 0,
        valor_total DECIMAL(10,2) DEFAULT 0,
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Empresas vinculadas ao vendedor
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vendedor_empresas (
        id SERIAL PRIMARY KEY,
        funcionario_id INTEGER REFERENCES funcionarios(id),
        cliente_id BIGINT NOT NULL,
        cliente_nome VARCHAR(200) NOT NULL,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Corrigir tipo da coluna caso a tabela já exista com INTEGER
    await pool.query(`
      ALTER TABLE vendedor_empresas ALTER COLUMN cliente_id TYPE BIGINT
    `).catch(() => {}); // ignora se já for BIGINT

    // Comissões do vendedor
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comissoes_vendedor (
        id SERIAL PRIMARY KEY,
        funcionario_id INTEGER REFERENCES funcionarios(id),
        os_id INTEGER REFERENCES ordens_servico(id),
        cliente_nome VARCHAR(200),
        valor_os DECIMAL(10,2) NOT NULL,
        percentual DECIMAL(5,2) NOT NULL,
        valor_comissao DECIMAL(10,2) NOT NULL,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);

    // Número OS (aprovada em diante) — sequência separada (idempotente)
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE ordens_servico ADD COLUMN numero_os VARCHAR(20);
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `);

    // Dados de contato do cliente na OS (idempotente)
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE ordens_servico ADD COLUMN cliente_cpf_cnpj VARCHAR(20);
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `);
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE ordens_servico ADD COLUMN cliente_telefone VARCHAR(20);
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `);
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE ordens_servico ADD COLUMN cliente_email VARCHAR(100);
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `);

    // Comentário importante no funcionário (idempotente)
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE funcionarios ADD COLUMN comentario_importante TEXT;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `);

    console.log('✅ Tabelas criadas com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao criar tabelas:', err.message);
  }
};

createTables();
