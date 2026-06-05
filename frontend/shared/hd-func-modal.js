// Shared employee modal — used by funcionarios and folha pages.
// Call window.abrirModalFuncionario(funcOrId) to open.
// After save/delete, calls window._funcModalOnSave?.() for page refresh.

(function () {
  const _fmt   = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const _parse = s => Number((s || '0').replace(/[R$\s.]/g, '').replace(',', '.')) || 0;

  function _fmtInput(input) {
    const digits = input.value.replace(/\D/g, '');
    if (!digits) { input.value = ''; return; }
    input.value = (parseInt(digits, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ── CSS ─────────────────────────────────────────────────────────────────────
  function _injectCSS() {
    if (document.getElementById('hd-func-modal-css')) return;
    const s = document.createElement('style');
    s.id = 'hd-func-modal-css';
    s.textContent = `
      .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:2000}
      .modal-box{background:#fff;border-radius:12px;width:860px;max-width:96vw;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.2)}
      .modal-header{padding:20px 24px 16px;border-bottom:1px solid #E3E1DA;display:flex;align-items:center;justify-content:space-between}
      .modal-title{font-size:15px;font-weight:600;font-family:'DM Sans',sans-serif}
      .modal-close{background:none;border:none;font-size:22px;color:#888680;cursor:pointer;line-height:1;padding:0 4px;font-family:inherit}
      .modal-close:hover{color:#12151F}
      .modal-body{padding:20px 24px;overflow-y:auto;flex:1;font-family:'DM Sans',sans-serif}
      .modal-footer{padding:16px 24px;border-top:1px solid #E3E1DA;display:flex;justify-content:flex-end;gap:10px}
      .mfm-field-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
      .mfm-field{display:flex;flex-direction:column;gap:5px}
      .mfm-field.full{grid-column:1/-1}
      .mfm-field label{font-size:12.5px;font-weight:500;color:#888680;font-family:'DM Sans',sans-serif}
      .mfm-field input,.mfm-field select{font-family:'DM Sans',sans-serif;font-size:13.5px;padding:8px 11px;border:1px solid #E3E1DA;border-radius:7px;color:#12151F;background:#F4F3F0;outline:none;transition:border-color .15s}
      .mfm-field input:focus,.mfm-field select:focus{border-color:#1B2D5B;background:#fff}
      .mfm-req{color:#C0152A}
      .mfm-opcional{font-size:11px;color:#888680;font-weight:400}
      .mfm-toggle-group{display:flex;border:1px solid #E3E1DA;border-radius:7px;overflow:hidden;width:fit-content}
      .mfm-toggle-btn{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;padding:7px 20px;border:none;background:transparent;color:#888680;cursor:pointer;transition:all .15s}
      .mfm-toggle-btn.active{background:#1B2D5B;color:#fff}
      .mfm-clt-only{display:none}
      .mfm-clt-only.visible{display:flex}
      .mfm-form-erro{color:#C0152A;font-size:12.5px;margin-top:8px;min-height:18px;font-family:'DM Sans',sans-serif}
      .mfm-tab-btn{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;padding:10px 16px;border:none;border-bottom:2px solid transparent;background:transparent;cursor:pointer;color:#888680}
      /* Divisores de seção no formulário */
      .mfm-section-divider{grid-column:1/-1;display:flex;align-items:center;gap:10px;margin:10px 0 2px}
      .mfm-section-divider span{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap}
      .mfm-section-divider::after{content:'';flex:1;height:1px;background:#E3E1DA}
      /* Caixa de totais */
      .mfm-totais{margin-top:14px;display:grid;grid-template-columns:1fr 1fr 1fr;border:1px solid #E3E1DA;border-radius:8px;overflow:hidden}
      .mfm-totais-cell{padding:10px 14px;display:flex;flex-direction:column;gap:3px}
      .mfm-totais-cell:not(:last-child){border-right:1px solid #E3E1DA}
      .mfm-totais-cell-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#888680}
      .mfm-totais-cell-val{font-family:'DM Mono',monospace;font-size:16px;font-weight:700;color:#12151F}
      .mfm-totais-cell-sub{font-size:10px;color:#888680;margin-top:1px}
    `;
    document.head.appendChild(s);
  }

  // ── HTML ────────────────────────────────────────────────────────────────────
  function _injectHTML() {
    if (document.getElementById('modal-func')) return;
    const div = document.createElement('div');
    div.innerHTML = `
<div id="modal-func" class="modal-overlay" style="display:none">
  <div class="modal-box">
    <div class="modal-header">
      <span class="modal-title" id="modal-func-title">Funcionário</span>
      <button class="modal-close" id="modal-func-close">×</button>
    </div>
    <div id="modal-tabs" style="display:none;border-bottom:1px solid #E3E1DA;padding:0 24px;flex-direction:row;gap:0">
      <button class="mfm-tab-btn" data-tab="dados"         onclick="trocarAbaModal('dados')">Dados</button>
      <button class="mfm-tab-btn" data-tab="adiantamentos" onclick="trocarAbaModal('adiantamentos')">Adiantamentos</button>
      <button class="mfm-tab-btn" data-tab="ferias"        onclick="trocarAbaModal('ferias')">Férias</button>
      <button class="mfm-tab-btn" data-tab="decimo"        onclick="trocarAbaModal('decimo')">13º Salário</button>
      <button class="mfm-tab-btn" data-tab="rescisao"      onclick="trocarAbaModal('rescisao')">Rescisão</button>
      <button class="mfm-tab-btn" data-tab="resumo"        onclick="trocarAbaModal('resumo')">Histórico</button>
    </div>
    <input type="hidden" id="modal-active-tab" value="dados"/>
    <div class="modal-body">
      <input type="hidden" id="func-id"/>

      <!-- Aba: Dados -->
      <div id="modal-tab-dados">
        <div class="mfm-field-grid">
          <div class="mfm-field">
            <label>Nome <span class="mfm-req">*</span></label>
            <input type="text" id="func-nome" placeholder="Nome completo"/>
          </div>
          <div class="mfm-field" style="align-items:flex-end">
            <label>Tipo de contrato</label>
            <div class="mfm-toggle-group">
              <button class="mfm-toggle-btn active" data-val="informal">Informal</button>
              <button class="mfm-toggle-btn" data-val="clt">CLT</button>
            </div>
            <input type="hidden" id="func-tipo" value="informal"/>
          </div>
          <div class="mfm-field">
            <label>Tipo de cargo</label>
            <select id="func-cargo-tipo">
              <option value="mecanico">Mecânico</option>
              <option value="vendedor">Vendedor</option>
              <option value="financeiro">Financeiro</option>
              <option value="estoquista">Estoquista</option>
              <option value="gestao">Gestão</option>
              <option value="gerente">Gerente</option>
              <option value="comercial">Comercial</option>
              <option value="motoboy">Motoboy</option>
              <option value="faxineiro">Faxineiro</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div class="mfm-field">
            <label>Cargo / Função</label>
            <input type="text" id="func-cargo" placeholder="Ex: Mecânico Diesel"/>
          </div>
          <div class="mfm-field">
            <label>Data de admissão</label>
            <input type="date" id="func-admissao"/>
          </div>
          <div class="mfm-field">
            <label>Status</label>
            <select id="func-status">
              <option value="ativo">Ativo</option>
              <option value="ferias">Férias</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
          <!-- ── Recebimentos ── -->
          <div class="mfm-section-divider full"><span style="color:#15803D">Recebimentos</span></div>
          <div class="mfm-field mfm-clt-only" id="mfm-field-salario-oficial">
            <label>Salário Oficial (R$)</label>
            <input type="text" id="func-salario-oficial" class="mfm-valor-input" placeholder="0,00"/>
          </div>
          <div class="mfm-field">
            <label>Salário Adicional (R$)</label>
            <input type="text" id="func-salario-adicional" class="mfm-valor-input" placeholder="0,00"/>
          </div>

          <!-- ── Descontos Fixos ── -->
          <div class="mfm-section-divider full"><span style="color:#DC2626">Descontos Fixos</span></div>
          <div class="mfm-field mfm-clt-only" id="mfm-field-inss">
            <label>INSS fixo (R$)</label>
            <input type="text" id="func-inss" class="mfm-valor-input" placeholder="0,00"/>
          </div>
          <div class="mfm-field" id="mfm-field-comissao" style="display:none">
            <label>% Comissão</label>
            <input type="number" id="func-comissao" placeholder="0.00" step="0.01" min="0" max="100"/>
          </div>

          <!-- ── Benefícios ── -->
          <div class="mfm-section-divider full"><span style="color:#0369A1">Benefícios</span></div>
          <div class="mfm-field">
            <label>Vale Transporte semanal (R$)</label>
            <input type="text" id="func-vt" class="mfm-valor-input" placeholder="0,00"/>
          </div>
          <div class="mfm-field">
            <label>Vale Alimentação semanal (R$)</label>
            <input type="text" id="func-va" class="mfm-valor-input" placeholder="0,00"/>
          </div>

          <div class="mfm-field full">
            <label>Comentário importante <span class="mfm-opcional">(opcional)</span></label>
            <textarea id="func-comentario" rows="2" placeholder="Ex: empréstimo com desconto até 20/07…"
              style="font-family:'DM Sans',sans-serif;font-size:13px;padding:8px 10px;border:1px solid #E3E1DA;border-radius:8px;width:100%;box-sizing:border-box;resize:vertical;color:#12151F"></textarea>
          </div>
        </div>
        <div id="func-erro" class="mfm-form-erro"></div>

        <!-- Caixa de totais -->
        <div class="mfm-totais">
          <div class="mfm-totais-cell" style="background:#F0FDF4">
            <span class="mfm-totais-cell-label" style="color:#166534">Total bruto / mês</span>
            <span class="mfm-totais-cell-val" id="mfm-total-bruto" style="color:#15803D">R$ 0,00</span>
            <span class="mfm-totais-cell-sub">oficial + adicional</span>
          </div>
          <div class="mfm-totais-cell">
            <span class="mfm-totais-cell-label" style="color:#7C3AED">Líquido Dia 20</span>
            <span class="mfm-totais-cell-val" id="mfm-liq-d20">R$ 0,00</span>
            <span class="mfm-totais-cell-sub">metade do bruto</span>
          </div>
          <div class="mfm-totais-cell">
            <span class="mfm-totais-cell-label" style="color:#1B2D5B">Líquido Dia 05</span>
            <span class="mfm-totais-cell-val" id="mfm-liq-d05">R$ 0,00</span>
            <span class="mfm-totais-cell-sub">metade − INSS</span>
          </div>
        </div>
      </div>

      <!-- Aba: Adiantamentos -->
      <div id="modal-tab-adiantamentos" style="display:none">
        <div style="border:1px solid #E3E1DA;border-radius:8px;padding:14px 16px;margin-bottom:16px">
          <div style="font-size:12px;font-weight:600;color:#888680;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Novo Adiantamento</div>
          <div class="mfm-field-grid">
            <div class="mfm-field">
              <label>Data <span class="mfm-req">*</span></label>
              <input type="date" id="adiant-data"/>
            </div>
            <div class="mfm-field">
              <label>Valor total (R$) <span class="mfm-req">*</span></label>
              <input type="text" id="adiant-valor" class="mfm-valor-input" placeholder="0,00"/>
            </div>
            <div class="mfm-field">
              <label>Parcelas</label>
              <div style="display:flex;gap:6px">
                <button type="button" class="adiant-num-btn active" data-n="1" onclick="selecionarNParcelas(1)"
                  style="font-family:inherit;font-size:13px;font-weight:500;padding:6px 14px;border-radius:7px;border:1px solid #1B2D5B;background:#1B2D5B;color:#fff;cursor:pointer">1x</button>
                <button type="button" class="adiant-num-btn" data-n="2" onclick="selecionarNParcelas(2)"
                  style="font-family:inherit;font-size:13px;font-weight:500;padding:6px 14px;border-radius:7px;border:1px solid #E3E1DA;background:#fff;color:#888680;cursor:pointer">2x</button>
                <button type="button" class="adiant-num-btn" data-n="3" onclick="selecionarNParcelas(3)"
                  style="font-family:inherit;font-size:13px;font-weight:500;padding:6px 14px;border-radius:7px;border:1px solid #E3E1DA;background:#fff;color:#888680;cursor:pointer">3x</button>
                <button type="button" class="adiant-num-btn" data-n="4" onclick="selecionarNParcelas(4)"
                  style="font-family:inherit;font-size:13px;font-weight:500;padding:6px 14px;border-radius:7px;border:1px solid #E3E1DA;background:#fff;color:#888680;cursor:pointer">4x</button>
              </div>
            </div>
            <div class="mfm-field full">
              <label>Observação</label>
              <input type="text" id="adiant-obs" placeholder="Opcional"/>
            </div>
          </div>
          <div id="adiant-parcelas-wrap" style="display:none;margin-top:10px;border-top:1px solid #E3E1DA;padding-top:10px">
            <div style="font-size:12px;font-weight:600;color:#888680;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Descontar em</div>
            <div id="adiant-parcelas-lista"></div>
          </div>
          <div id="adiant-erro" class="mfm-form-erro" style="margin-top:8px"></div>
        </div>
        <div style="font-size:12px;font-weight:600;color:#888680;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Histórico</div>
        <div id="adiant-historico-lista"><div style="color:#888680;font-size:13px;padding:8px 0">Carregando…</div></div>
      </div>

      <!-- Aba: Férias -->
      <div id="modal-tab-ferias" style="display:none">

        <!-- Pagamento (obrigatório) -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#15803D">Registrar Pagamento</span>
          <button id="btn-registrar-ferias" type="button"
            style="font-family:'DM Sans',sans-serif;font-size:12.5px;font-weight:600;padding:5px 14px;border-radius:7px;border:none;background:#15803D;color:#fff;cursor:pointer">
            Registrar
          </button>
        </div>
        <div class="mfm-field-grid" style="margin-bottom:16px">
          <div class="mfm-field">
            <label>Data do pagamento <span class="mfm-req">*</span></label>
            <input type="date" id="ferias-pagamento"/>
          </div>
          <div class="mfm-field">
            <label>Valor (R$) <span class="mfm-req">*</span></label>
            <input type="text" id="ferias-valor" class="mfm-valor-input" placeholder="0,00"/>
          </div>
          <div class="mfm-field full">
            <label>Observações</label>
            <input type="text" id="ferias-obs" placeholder="Opcional"/>
          </div>
        </div>

        <!-- Período de gozo (opcional) -->
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#888680;margin-bottom:8px">
          Período de gozo <span style="font-weight:400;font-size:10px;text-transform:none;letter-spacing:0">(opcional)</span>
        </div>
        <div class="mfm-field-grid">
          <div class="mfm-field">
            <label>Data início</label>
            <input type="date" id="ferias-inicio"/>
          </div>
          <div class="mfm-field">
            <label>Data fim</label>
            <input type="date" id="ferias-fim"/>
          </div>
        </div>

        <div id="ferias-erro" class="mfm-form-erro"></div>

        <!-- Histórico de pagamentos de férias -->
        <div style="margin-top:16px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#888680;margin-bottom:8px">Pagamentos registrados</div>
          <div id="ferias-historico-lista"><div style="color:#888680;font-size:13px;padding:8px 0">Carregando…</div></div>
        </div>
      </div>

      <!-- Aba: 13º Salário -->
      <div id="modal-tab-decimo" style="display:none">
        <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:12px 16px;margin-bottom:14px">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
            <div>
              <div style="font-size:11px;font-weight:600;color:#1D4ED8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">13º Salário</div>
              <div style="display:flex;align-items:baseline;gap:6px">
                <span style="font-size:12px;color:#1D4ED8">Ano</span>
                <select id="decimo-ano-filtro" style="font-family:inherit;font-size:13px;padding:2px 8px;border:1px solid #BFDBFE;border-radius:6px;background:#fff;color:#1B2D5B"></select>
              </div>
            </div>
            <div style="display:flex;gap:20px;flex-wrap:wrap">
              <div style="text-align:right"><div style="font-size:11px;color:#64748B;margin-bottom:2px">Total calculado</div><div style="font-size:15px;font-weight:600;font-family:'DM Mono',monospace;color:#1B2D5B" id="decimo-total-calc">—</div></div>
              <div style="text-align:right"><div style="font-size:11px;color:#64748B;margin-bottom:2px">Já pago</div><div style="font-size:15px;font-weight:600;font-family:'DM Mono',monospace;color:#15803D" id="decimo-total-pago">R$ 0,00</div></div>
              <div style="text-align:right"><div style="font-size:11px;color:#64748B;margin-bottom:2px">Saldo a pagar</div><div style="font-size:15px;font-weight:600;font-family:'DM Mono',monospace;color:#DC2626" id="decimo-saldo">—</div></div>
            </div>
          </div>
        </div>
        <div style="border:1px solid #E3E1DA;border-radius:8px;padding:14px 16px;margin-bottom:14px">
          <div style="font-size:12px;font-weight:600;color:#888680;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Registrar pagamento</div>
          <div class="mfm-field-grid">
            <div class="mfm-field"><label>Data do pagamento <span class="mfm-req">*</span></label><input type="date" id="decimo-data"/></div>
            <div class="mfm-field"><label>Valor pago (R$) <span class="mfm-req">*</span></label><input type="text" id="decimo-valor" class="mfm-valor-input" placeholder="0,00"/></div>
            <div class="mfm-field full"><label>Observação</label><input type="text" id="decimo-obs" placeholder="Opcional"/></div>
          </div>
          <div id="decimo-erro" class="mfm-form-erro"></div>
        </div>
        <div style="font-size:12px;font-weight:600;color:#888680;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Histórico</div>
        <div id="decimo-historico-lista"><div style="color:#888680;font-size:13px;padding:8px 0">Carregando…</div></div>
      </div>

      <!-- Aba: Rescisão -->
      <div id="modal-tab-rescisao" style="display:none">
        <div class="mfm-field-grid">
          <div class="mfm-field full"><label>Data da rescisão <span class="mfm-req">*</span></label><input type="date" id="rescisao-data"/></div>
          <div class="mfm-field"><label>Saldo de salário (R$)</label><input type="text" id="rescisao-saldo" class="mfm-valor-input rescisao-input" placeholder="0,00"/></div>
          <div class="mfm-field"><label>Férias proporcionais (R$)</label><input type="text" id="rescisao-ferias-prop" class="mfm-valor-input rescisao-input" placeholder="0,00"/></div>
          <div class="mfm-field"><label>13º proporcional (R$)</label><input type="text" id="rescisao-decimo" class="mfm-valor-input rescisao-input" placeholder="0,00"/></div>
          <div class="mfm-field" id="mfm-field-fgts"><label>FGTS (R$) <span class="mfm-opcional">CLT</span></label><input type="text" id="rescisao-fgts" class="mfm-valor-input rescisao-input" placeholder="0,00"/></div>
          <div class="mfm-field"><label>Outros valores (R$)</label><input type="text" id="rescisao-outros" class="mfm-valor-input rescisao-input" placeholder="0,00"/></div>
          <div class="mfm-field full"><label>Observações</label><input type="text" id="rescisao-obs" placeholder="Opcional"/></div>
        </div>
        <div style="background:#F0FDF4;border-radius:8px;padding:12px 16px;margin-top:8px;display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:13px;font-weight:600;color:#15803D">Total calculado</span>
          <span style="font-size:18px;font-weight:600;color:#15803D;font-family:'DM Mono',monospace" id="rescisao-total">R$ 0,00</span>
        </div>
        <div style="margin-top:10px;padding:14px 16px;background:#F8F7F4;border-radius:8px;border:1px solid #E3E1DA">
          <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:10px">
            <label style="font-size:13px;font-weight:500">Tipo de pagamento:</label>
            <div style="display:flex;gap:8px">
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px"><input type="radio" name="rescisao-tipo-pgto" id="rescisao-baixa-completa" value="completa" checked style="cursor:pointer;accent-color:#1B2D5B"/>Baixa completa</label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px"><input type="radio" name="rescisao-tipo-pgto" id="rescisao-parcial" value="parcial" style="cursor:pointer;accent-color:#1B2D5B"/>Pagamento parcial</label>
            </div>
          </div>
          <div id="rescisao-parcial-wrap" style="display:none;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:10px">
            <div><label style="font-size:12px;color:#888680;display:block;margin-bottom:3px">Data do pagamento</label><input type="date" id="rescisao-data-pagamento" style="font-family:inherit;font-size:13px;padding:6px 10px;border:1px solid #C8C5BE;border-radius:6px"/></div>
            <div><label style="font-size:12px;color:#888680;display:block;margin-bottom:3px">Valor pago agora (R$)</label><input type="text" id="rescisao-valor-pago" class="mfm-valor-input" placeholder="0,00" style="font-family:inherit;font-size:13px;padding:6px 10px;border:1px solid #C8C5BE;border-radius:6px;width:160px"/></div>
            <div style="padding-bottom:8px"><span style="font-size:13px;color:#888680">Saldo restante: </span><span id="rescisao-saldo-restante" style="font-size:14px;font-weight:600;font-family:'DM Mono',monospace;color:#DC2626">—</span></div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <input type="checkbox" id="rescisao-inativo" checked style="width:15px;height:15px;cursor:pointer;accent-color:#DC2626"/>
            <label for="rescisao-inativo" style="font-size:13px;cursor:pointer">Marcar funcionário como inativo</label>
          </div>
        </div>
        <div id="rescisao-erro" class="mfm-form-erro"></div>
      </div>

      <!-- Aba: Histórico -->
      <div id="modal-tab-resumo" style="display:none">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px">
          <span style="font-size:12px;font-weight:600;color:#888680;text-transform:uppercase;letter-spacing:.05em">Período:</span>
          <div style="display:flex;gap:4px;flex-wrap:wrap" id="resumo-filtros-periodo">
            <button class="resumo-periodo-btn resumo-periodo-ativo" data-p="semana"       onclick="selecionarPeriodoResumo(this)" style="font-family:inherit;font-size:12px;padding:4px 10px;border-radius:20px;border:1px solid #C8C5BE;background:#1B2D5B;color:#fff;cursor:pointer">Semana</button>
            <button class="resumo-periodo-btn" data-p="mes"          onclick="selecionarPeriodoResumo(this)" style="font-family:inherit;font-size:12px;padding:4px 10px;border-radius:20px;border:1px solid #C8C5BE;background:#fff;color:#888680;cursor:pointer">Mês atual</button>
            <button class="resumo-periodo-btn" data-p="mes_anterior" onclick="selecionarPeriodoResumo(this)" style="font-family:inherit;font-size:12px;padding:4px 10px;border-radius:20px;border:1px solid #C8C5BE;background:#fff;color:#888680;cursor:pointer">Mês anterior</button>
            <button class="resumo-periodo-btn" data-p="ano"          onclick="selecionarPeriodoResumo(this)" style="font-family:inherit;font-size:12px;padding:4px 10px;border-radius:20px;border:1px solid #C8C5BE;background:#fff;color:#888680;cursor:pointer">Este ano</button>
            <button class="resumo-periodo-btn" data-p="tudo"         onclick="selecionarPeriodoResumo(this)" style="font-family:inherit;font-size:12px;padding:4px 10px;border-radius:20px;border:1px solid #C8C5BE;background:#fff;color:#888680;cursor:pointer">Tudo</button>
            <button class="resumo-periodo-btn" data-p="custom"       onclick="selecionarPeriodoResumo(this)" style="font-family:inherit;font-size:12px;padding:4px 10px;border-radius:20px;border:1px solid #C8C5BE;background:#fff;color:#888680;cursor:pointer">Personalizado</button>
          </div>
          <div id="resumo-custom-wrap" style="display:none;align-items:center;gap:6px;margin-top:4px">
            <input type="date" id="resumo-de" style="font-family:inherit;font-size:12px;padding:4px 8px;border:1px solid #C8C5BE;border-radius:6px"/>
            <span style="font-size:12px;color:#888680">até</span>
            <input type="date" id="resumo-ate" style="font-family:inherit;font-size:12px;padding:4px 8px;border:1px solid #C8C5BE;border-radius:6px"/>
            <button onclick="carregarResumo()" style="font-family:inherit;font-size:12px;padding:4px 12px;border-radius:6px;border:none;background:#1B2D5B;color:#fff;cursor:pointer">Filtrar</button>
          </div>
        </div>
        <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <span style="font-size:13px;font-weight:600;color:#15803D">Total no período</span>
          <span style="font-size:17px;font-weight:700;font-family:'DM Mono',monospace;color:#15803D" id="resumo-total-geral">—</span>
        </div>
        <div id="resumo-lista"><div style="color:#888680;font-size:13px;padding:8px 0">Carregando…</div></div>
      </div>
    </div>

    <div class="modal-footer">
      <button id="btn-excluir-func" style="display:none;margin-right:auto;background:#FEE2E2;color:#B91C1C;border:1px solid #FCA5A5;font-family:'DM Sans',sans-serif;font-size:13.5px;font-weight:500;padding:7px 16px;border-radius:8px;cursor:pointer">Excluir</button>
      <button id="modal-func-cancel" style="font-family:'DM Sans',sans-serif;font-size:13.5px;font-weight:500;padding:7px 16px;border-radius:8px;border:1px solid #E3E1DA;background:transparent;color:#12151F;cursor:pointer">Cancelar</button>
      <button id="btn-salvar-func" style="font-family:'DM Sans',sans-serif;font-size:13.5px;font-weight:500;padding:7px 16px;border-radius:8px;border:none;background:#C0152A;color:#fff;cursor:pointer">Salvar</button>
    </div>
  </div>
</div>`;
    document.body.appendChild(div.firstElementChild);
    _bindEvents();
  }

  // ── Internal state ───────────────────────────────────────────────────────────
  let _funcCache = null;
  let _tipoAtual = 'informal';
  let _adiantNParcelas = 1;

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function _setValor(id, v) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = Number(v) > 0 ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '';
  }

  function _atualizarCLT() {
    const isCLT = _tipoAtual === 'clt';
    document.querySelectorAll('.mfm-clt-only').forEach(el => el.classList.toggle('visible', isCLT));
  }

  function _atualizarCargo(tipo) {
    const el = document.getElementById('mfm-field-comissao');
    if (el) el.style.display = (tipo === 'mecanico' || tipo === 'vendedor') ? '' : 'none';
  }

  // ── Abas ─────────────────────────────────────────────────────────────────────
  window.trocarAbaModal = function (tab) {
    document.getElementById('modal-active-tab').value = tab;
    ['dados','adiantamentos','ferias','decimo','rescisao','resumo'].forEach(t => {
      document.getElementById('modal-tab-' + t).style.display = t === tab ? '' : 'none';
    });
    document.querySelectorAll('.mfm-tab-btn').forEach(btn => {
      const active = btn.dataset.tab === tab;
      btn.style.borderBottomColor = active ? '#1B2D5B' : 'transparent';
      btn.style.color = active ? '#1B2D5B' : '#888680';
    });
    const btnSalvar = document.getElementById('btn-salvar-func');
    if (tab === 'dados')         { btnSalvar.textContent = 'Salvar';              btnSalvar.style.background = '#C0152A'; }
    if (tab === 'adiantamentos') { btnSalvar.textContent = 'Registrar';           btnSalvar.style.background = '#C0152A'; }
    if (tab === 'ferias')        { btnSalvar.textContent = 'Salvar';              btnSalvar.style.background = '#C0152A'; }
    if (tab === 'decimo')        { btnSalvar.textContent = 'Registrar Pagamento'; btnSalvar.style.background = '#C0152A'; }
    if (tab === 'rescisao')      { btnSalvar.textContent = 'Confirmar Rescisão';  btnSalvar.style.background = '#DC2626'; }
    if (tab === 'resumo')        { btnSalvar.style.display = 'none'; }
    if (tab !== 'resumo')        { btnSalvar.style.display = ''; }
    if (tab === 'adiantamentos') _carregarAdiantamentosTab();
    if (tab === 'ferias')        _carregarFeriasTab();
    if (tab === 'decimo')        _carregarDecimoTab();
    if (tab === 'resumo')        carregarResumo();
  };

  // ── Abrir/Fechar modal ────────────────────────────────────────────────────────
  function _abrirModal(funcionario) {
    const isEdit = !!funcionario;
    document.getElementById('modal-func-title').textContent = isEdit ? funcionario.nome : 'Novo Funcionário';
    document.getElementById('func-id').value        = funcionario?.id || '';
    document.getElementById('func-nome').value       = funcionario?.nome || '';
    document.getElementById('func-cargo').value      = funcionario?.cargo || '';
    document.getElementById('func-admissao').value   = funcionario?.data_admissao?.slice(0,10) || '';
    document.getElementById('func-status').value     = funcionario?.status || 'ativo';
    document.getElementById('func-cargo-tipo').value = funcionario?.cargo_tipo || 'outro';
    document.getElementById('func-comentario').value = funcionario?.comentario_importante || '';
    document.getElementById('func-comissao').value   = funcionario?.percentual_comissao || '';
    document.getElementById('func-erro').textContent = '';

    _setValor('func-salario-oficial',    funcionario?.salario_oficial    || 0);
    _setValor('func-salario-adicional',  funcionario?.salario_adicional  || 0);
    _setValor('func-vt',  funcionario?.vale_transporte || 0);
    _setValor('func-va',                 funcionario?.vale_alimentacao   || 0);
    _setValor('func-inss',               funcionario?.percentual_inss    || 0);

    _tipoAtual = funcionario?.tipo || 'informal';
    document.getElementById('func-tipo').value = _tipoAtual;
    document.querySelectorAll('.mfm-toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.val === _tipoAtual));
    _atualizarCLT();
    _atualizarCargo(funcionario?.cargo_tipo || 'outro');

    const tabsEl = document.getElementById('modal-tabs');
    tabsEl.style.display = isEdit ? 'flex' : 'none';
    document.getElementById('btn-excluir-func').style.display = isEdit ? '' : 'none';

    // Limpar adiantamentos
    document.getElementById('adiant-data').value  = '';
    document.getElementById('adiant-valor').value = '';
    document.getElementById('adiant-obs').value   = '';
    document.getElementById('adiant-parcelas-wrap').style.display = 'none';
    document.getElementById('adiant-erro').textContent = '';
    selecionarNParcelas(1);
    document.getElementById('adiant-historico-lista').innerHTML = '<div style="color:#888680;font-size:13px;padding:8px 0">Carregando…</div>';

    // Limpar férias
    document.getElementById('ferias-inicio').value    = '';
    document.getElementById('ferias-fim').value       = '';
    document.getElementById('ferias-pagamento').value = '';
    document.getElementById('ferias-valor').value     = '';
    document.getElementById('ferias-obs').value       = '';
    document.getElementById('ferias-erro').textContent = '';
    const feriasHistEl = document.getElementById('ferias-historico-lista');
    if (feriasHistEl) feriasHistEl.innerHTML = '<div style="color:#888680;font-size:13px;padding:8px 0">Carregando…</div>';

    // Limpar resumo
    document.getElementById('resumo-lista').innerHTML = '<div style="color:#888680;font-size:13px;padding:8px 0">Carregando…</div>';
    document.getElementById('resumo-total-geral').textContent = '—';
    document.getElementById('resumo-custom-wrap').style.display = 'none';
    document.querySelectorAll('.resumo-periodo-btn').forEach(b => {
      const isAtivo = b.dataset.p === 'semana';
      b.style.background = isAtivo ? '#1B2D5B' : '#fff';
      b.style.color = isAtivo ? '#fff' : '#888680';
      b.classList.toggle('resumo-periodo-ativo', isAtivo);
    });

    // Limpar décimo
    document.getElementById('decimo-data').value  = '';
    document.getElementById('decimo-valor').value = '';
    document.getElementById('decimo-obs').value   = '';
    document.getElementById('decimo-erro').textContent = '';
    document.getElementById('decimo-historico-lista').innerHTML = '<div style="color:#888680;font-size:13px;padding:8px 0">Carregando…</div>';
    const anoAtual = new Date().getFullYear();
    const selAno = document.getElementById('decimo-ano-filtro');
    selAno.innerHTML = [anoAtual, anoAtual-1, anoAtual-2].map(a => `<option value="${a}">${a}</option>`).join('');

    // Limpar rescisão
    document.getElementById('rescisao-data').value = '';
    document.getElementById('rescisao-obs').value  = '';
    document.getElementById('rescisao-erro').textContent = '';
    ['rescisao-saldo','rescisao-ferias-prop','rescisao-decimo','rescisao-fgts','rescisao-outros'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('rescisao-total').textContent = 'R$ 0,00';
    document.getElementById('rescisao-baixa-completa').checked = true;
    document.getElementById('rescisao-parcial-wrap').style.display = 'none';
    document.getElementById('rescisao-valor-pago').value = '';
    document.getElementById('rescisao-data-pagamento').value = '';
    document.getElementById('rescisao-saldo-restante').textContent = '—';
    document.getElementById('rescisao-inativo').checked = true;
    if (funcionario) {
      const fgtsEl = document.getElementById('mfm-field-fgts');
      if (fgtsEl) fgtsEl.style.display = funcionario.tipo === 'clt' ? '' : 'none';
    }

    trocarAbaModal('dados');
    _atualizarResumoFin();
    document.getElementById('modal-func').style.display = 'flex';
    document.getElementById('func-nome').focus();
  }

  function _fecharModal() { document.getElementById('modal-func').style.display = 'none'; }

  // ── Adiantamentos ─────────────────────────────────────────────────────────────
  async function _carregarAdiantamentosTab() {
    const id = document.getElementById('func-id').value;
    if (!id) return;
    const el = document.getElementById('adiant-historico-lista');
    try {
      const lista = await api.listarAdiantamentos(id);
      if (!lista.length) {
        el.innerHTML = '<div style="color:#888680;font-size:13px;padding:8px 0">Nenhum adiantamento registrado.</div>';
        return;
      }
      const thS = 'text-align:left;padding:7px 10px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase';
      el.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:#F8F7F4">
          <th style="${thS}">Data</th><th style="${thS};text-align:right">Valor</th>
          <th style="${thS}">Desconto em</th><th style="${thS}">Status</th>
          <th style="${thS}">Obs.</th><th style="${thS}"></th>
        </tr></thead>
        <tbody>${lista.map(a => {
          const dataFmt = new Date(a.data.slice(0,10)+'T12:00:00').toLocaleDateString('pt-BR');
          const badge = a.descontado
            ? '<span style="background:#DCFCE7;color:#15803D;font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px">Descontado</span>'
            : '<span style="background:#FEF9C3;color:#92400E;font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px">Pendente</span>';
          const editBtn = !a.descontado
            ? `<button onclick="iniciarEdicaoAdiant(${a.id})" title="Editar" style="background:none;border:none;padding:4px 6px;cursor:pointer;color:#6B7280;border-radius:6px" onmouseover="this.style.color='#2563EB'" onmouseout="this.style.color='#6B7280'">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
               </button>
               <button onclick="confirmarExclusaoAdiant(${a.id})" title="Excluir" style="background:none;border:none;padding:4px 6px;cursor:pointer;color:#9CA3AF;border-radius:6px" onmouseover="this.style.color='#DC2626'" onmouseout="this.style.color='#9CA3AF'">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
               </button>` : '';
          return `<tr id="adiant-row-${a.id}" data-id="${a.id}" data-data="${a.data.slice(0,10)}" data-valor="${a.valor}" data-desconto="${a.desconto_em||''}" data-obs="${(a.observacoes||'').replace(/"/g,'&quot;')}" style="border-top:1px solid #E3E1DA">
            <td style="padding:8px 10px">${dataFmt}</td>
            <td style="padding:8px 10px;text-align:right;font-family:'DM Mono',monospace">${_fmt(a.valor)}</td>
            <td style="padding:8px 10px;color:#888680">${a.desconto_em||'—'}</td>
            <td style="padding:8px 10px">${badge}</td>
            <td style="padding:8px 10px;color:#888680">${a.observacoes||'—'}</td>
            <td style="padding:8px 10px">${editBtn}</td>
          </tr>`;
        }).join('')}</tbody></table>`;
    } catch (_) {
      el.innerHTML = '<div style="color:#DC2626;font-size:13px">Erro ao carregar histórico.</div>';
    }
  }

  window.iniciarEdicaoAdiant = function(id) {
    const row = document.getElementById(`adiant-row-${id}`);
    if (!row) return;
    const inputS = 'border:1px solid #D1D5DB;border-radius:6px;padding:4px 6px;font-size:12px;width:100%;box-sizing:border-box';
    row.innerHTML = `
      <td style="padding:6px 8px"><input type="date" id="edit-adiant-data-${id}" value="${row.dataset.data}" style="${inputS}"></td>
      <td style="padding:6px 8px"><input type="number" id="edit-adiant-valor-${id}" value="${row.dataset.valor}" step="0.01" style="${inputS};text-align:right"></td>
      <td style="padding:6px 8px"><input type="text" id="edit-adiant-desconto-${id}" value="${row.dataset.desconto}" placeholder="ex: 05/06/2026" style="${inputS}"></td>
      <td style="padding:6px 8px"><span style="background:#FEF9C3;color:#92400E;font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px">Pendente</span></td>
      <td style="padding:6px 8px"><input type="text" id="edit-adiant-obs-${id}" value="${row.dataset.obs}" style="${inputS}"></td>
      <td style="padding:6px 8px;white-space:nowrap">
        <button onclick="salvarEdicaoAdiant(${id})" style="background:#2563EB;color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;margin-right:4px">Salvar</button>
        <button onclick="_carregarAdiantamentosTabGlobal()" style="background:none;border:1px solid #D1D5DB;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer">Cancelar</button>
      </td>`;
  };
  window._carregarAdiantamentosTabGlobal = () => _carregarAdiantamentosTab();

  window.salvarEdicaoAdiant = async function(id) {
    const data        = document.getElementById(`edit-adiant-data-${id}`)?.value;
    const valor       = parseFloat(document.getElementById(`edit-adiant-valor-${id}`)?.value);
    const desconto_em = document.getElementById(`edit-adiant-desconto-${id}`)?.value;
    const observacoes = document.getElementById(`edit-adiant-obs-${id}`)?.value;
    if (!data || isNaN(valor) || valor <= 0) { alert('Preencha data e valor corretamente.'); return; }
    try { await api.editarAdiantamento(id, { data, valor, desconto_em, observacoes }); await _carregarAdiantamentosTab(); }
    catch (err) { alert(err.message); }
  };

  window.confirmarExclusaoAdiant = async function(id) {
    if (!confirm('Excluir este adiantamento? Essa ação não pode ser desfeita.')) return;
    try { await api.excluirAdiantamento(id); await _carregarAdiantamentosTab(); }
    catch (err) { alert(err.message || 'Erro ao excluir adiantamento.'); }
  };

  // ── Parcelas ──────────────────────────────────────────────────────────────────
  function _proximasQuinzenas(dataStr, qtd) {
    if (!dataStr) return [];
    const [anoStr, mesStr, diaStr] = dataStr.split('-');
    const dia = parseInt(diaStr,10), mes = parseInt(mesStr,10), ano = parseInt(anoStr,10);
    let cur;
    if (dia<=5) cur={d:5,m:mes,a:ano};
    else if (dia<=20) cur={d:20,m:mes,a:ano};
    else cur={d:5,m:mes===12?1:mes+1,a:mes===12?ano+1:ano};
    const result=[];
    while(result.length<qtd+4){
      result.push(`${String(cur.d).padStart(2,'0')}/${String(cur.m).padStart(2,'0')}/${cur.a}`);
      if(cur.d===5){cur={d:20,m:cur.m,a:cur.a}}
      else{const nm=cur.m===12?1:cur.m+1;const na=cur.m===12?cur.a+1:cur.a;cur={d:5,m:nm,a:na};}
    }
    return result;
  }

  function _buildParcelasRows() {
    const data       = document.getElementById('adiant-data').value;
    const valorTotal = _parse(document.getElementById('adiant-valor').value);
    const n          = _adiantNParcelas;
    const wrap       = document.getElementById('adiant-parcelas-wrap');
    const lista      = document.getElementById('adiant-parcelas-lista');
    if (!data || !valorTotal) { wrap.style.display='none'; return; }
    const quinzenas    = _proximasQuinzenas(data, n+3);
    const valorParcela = valorTotal / n;
    const selS = 'font-family:inherit;font-size:13px;padding:6px 10px;border:1px solid #E3E1DA;border-radius:7px;background:#fff;flex:1;min-width:140px';
    lista.innerHTML = Array.from({length:n},(_,i)=>`
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="font-size:13px;color:#888680;min-width:${n>1?'74px':'0'}">${n>1?`Parcela ${i+1}/${n}`:''}</span>
        <span style="font-size:13px;font-family:'DM Mono',monospace;min-width:80px;text-align:right">${_fmt(valorParcela)}</span>
        <select id="adiant-parcela-sel-${i}" style="${selS}">${quinzenas.map((q,qi)=>`<option value="${q}" ${qi===i?'selected':''}>${q}</option>`).join('')}</select>
      </div>`).join('');
    wrap.style.display = 'block';
  }

  window.selecionarNParcelas = function(n) {
    _adiantNParcelas = n;
    document.querySelectorAll('.adiant-num-btn').forEach(b => {
      const active = parseInt(b.dataset.n) === n;
      b.style.background = active ? '#1B2D5B' : '#fff';
      b.style.color       = active ? '#fff'    : '#888680';
      b.style.borderColor = active ? '#1B2D5B' : '#E3E1DA';
    });
    _buildParcelasRows();
  };

  // ── Décimo terceiro ───────────────────────────────────────────────────────────
  async function _carregarDecimoTab() {
    const id  = document.getElementById('func-id').value;
    const ano = document.getElementById('decimo-ano-filtro').value;
    if (!id) return;

    const func = (_funcCache || []).find(f => String(f.id) === String(id));
    const salario = (parseFloat(func?.salario_oficial)||0) + (parseFloat(func?.salario_adicional)||0);
    let meses = 12;
    if (func?.data_admissao) {
      const adm = new Date(func.data_admissao.slice(0,10)+'T12:00:00');
      if (adm.getFullYear() === parseInt(ano)) meses = 12 - adm.getMonth();
    }
    const totalCalc = (salario / 12) * meses;
    document.getElementById('decimo-total-calc').textContent = _fmt(totalCalc);

    const el = document.getElementById('decimo-historico-lista');
    try {
      const lista = await api.listarDecimos(id, ano);
      const totalPago = lista.reduce((a, d) => a + parseFloat(d.valor), 0);
      document.getElementById('decimo-total-pago').textContent = _fmt(totalPago);
      document.getElementById('decimo-saldo').textContent      = _fmt(Math.max(0, totalCalc - totalPago));
      if (!lista.length) { el.innerHTML='<div style="color:#888680;font-size:13px;padding:8px 0">Nenhum pagamento registrado.</div>'; return; }
      el.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:#F8F7F4">
          <th style="text-align:left;padding:7px 10px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase">Data</th>
          <th style="text-align:right;padding:7px 10px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase">Valor pago</th>
          <th style="padding:7px 10px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase">Obs.</th>
        </tr></thead>
        <tbody>${lista.map(d=>{
          const data=new Date(d.data_pagamento.slice(0,10)+'T12:00:00').toLocaleDateString('pt-BR');
          return `<tr style="border-top:1px solid #E3E1DA">
            <td style="padding:8px 10px">${data}</td>
            <td style="padding:8px 10px;text-align:right;font-family:'DM Mono',monospace;color:#15803D;font-weight:600">${_fmt(d.valor)}</td>
            <td style="padding:8px 10px;color:#888680">${d.observacoes||'—'}</td>
          </tr>`;
        }).join('')}</tbody></table>`;
    } catch(_){ el.innerHTML='<div style="color:#DC2626;font-size:13px">Erro ao carregar histórico.</div>'; }
  }

  // ── Rescisão: recalcular total ────────────────────────────────────────────────
  function _atualizarTotalRescisao() {
    const total = ['rescisao-saldo','rescisao-ferias-prop','rescisao-decimo','rescisao-fgts','rescisao-outros']
      .reduce((acc, id) => acc + _parse(document.getElementById(id)?.value || ''), 0);
    document.getElementById('rescisao-total').textContent = _fmt(total);
    const isParcial = document.getElementById('rescisao-parcial').checked;
    if (isParcial) {
      const pago = _parse(document.getElementById('rescisao-valor-pago').value);
      document.getElementById('rescisao-saldo-restante').textContent = _fmt(Math.max(0, total - pago));
    }
  }

  // ── Resumo de pagamentos ──────────────────────────────────────────────────────
  const RESUMO_COR   = {'Folha de Pagamento':'#1B2D5B','Vale Transporte':'#0369A1','Adiantamento':'#92400E','13º Salário':'#6D28D9','Férias':'#0F766E','Rescisão':'#DC2626'};
  const RESUMO_BADGE = {'Folha de Pagamento':'#EFF6FF','Vale Transporte':'#E0F2FE','Adiantamento':'#FEF3C7','13º Salário':'#EDE9FE','Férias':'#CCFBF1','Rescisão':'#FEE2E2'};

  function _periodoParaDatas(p) {
    const hoje=new Date(), pad=n=>String(n).padStart(2,'0'), fmt=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    if(p==='semana'){const dow=hoje.getDay()||7;const seg=new Date(hoje);seg.setDate(hoje.getDate()-dow+1);const dom=new Date(seg);dom.setDate(seg.getDate()+6);return{de:fmt(seg),ate:fmt(dom)};}
    if(p==='mes')return{de:`${hoje.getFullYear()}-${pad(hoje.getMonth()+1)}-01`,ate:fmt(new Date(hoje.getFullYear(),hoje.getMonth()+1,0))};
    if(p==='mes_anterior'){const m=new Date(hoje.getFullYear(),hoje.getMonth(),0);return{de:`${m.getFullYear()}-${pad(m.getMonth()+1)}-01`,ate:fmt(m)};}
    if(p==='ano')return{de:`${hoje.getFullYear()}-01-01`,ate:`${hoje.getFullYear()}-12-31`};
    return null;
  }

  window.selecionarPeriodoResumo = function(btn) {
    document.querySelectorAll('.resumo-periodo-btn').forEach(b=>{ b.style.background='#fff'; b.style.color='#888680'; b.classList.remove('resumo-periodo-ativo'); });
    btn.style.background='#1B2D5B'; btn.style.color='#fff'; btn.classList.add('resumo-periodo-ativo');
    const isCustom = btn.dataset.p==='custom';
    document.getElementById('resumo-custom-wrap').style.display = isCustom ? 'flex' : 'none';
    if(!isCustom) carregarResumo();
  };

  window.carregarResumo = async function() {
    const id = document.getElementById('func-id').value;
    if (!id) return;
    const periodoAtivo = document.querySelector('.resumo-periodo-ativo')?.dataset.p || 'semana';
    let de, ate;
    if (periodoAtivo==='custom') {
      de=document.getElementById('resumo-de').value; ate=document.getElementById('resumo-ate').value;
      if(!de||!ate) return;
    } else if (periodoAtivo==='tudo') { de=null; ate=null; }
    else { const datas=_periodoParaDatas(periodoAtivo); de=datas.de; ate=datas.ate; }
    const el=document.getElementById('resumo-lista');
    el.innerHTML='<div style="color:#888680;font-size:13px;padding:8px 0">Carregando…</div>';
    document.getElementById('resumo-total-geral').textContent='—';
    try {
      const { lancamentos, totais, total_geral } = await api.resumoPagamentos(id, de, ate);
      document.getElementById('resumo-total-geral').textContent = _fmt(total_geral);
      if(!lancamentos.length){ el.innerHTML='<div style="color:#888680;font-size:13px;padding:8px 0">Nenhum pagamento encontrado neste período.</div>'; return; }
      const cats = Object.entries(totais).sort((a,b)=>b[1]-a[1]);
      const cardsHTML = cats.map(([cat,val])=>`<div style="background:${RESUMO_BADGE[cat]||'#F8F7F4'};border-radius:8px;padding:8px 12px;min-width:110px"><div style="font-size:11px;font-weight:600;color:${RESUMO_COR[cat]||'#888'};margin-bottom:2px;white-space:nowrap">${cat}</div><div style="font-size:14px;font-weight:700;font-family:'DM Mono',monospace;color:${RESUMO_COR[cat]||'#333'}">${_fmt(val)}</div></div>`).join('');
      const linhasHTML = lancamentos.map(l=>{
        const data=new Date(String(l.data).slice(0,10)+'T12:00:00').toLocaleDateString('pt-BR');
        const cor=RESUMO_COR[l.categoria]||'#333', bg=RESUMO_BADGE[l.categoria]||'#F8F7F4';
        const sub=l.subtipo?` <span style="font-size:10px;color:#888;text-transform:uppercase">(${l.subtipo})</span>`:'';
        return `<tr style="border-top:1px solid #E3E1DA">
          <td style="padding:8px 10px;white-space:nowrap">${data}</td>
          <td style="padding:8px 10px"><span style="background:${bg};color:${cor};font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;white-space:nowrap">${l.categoria}</span>${sub}</td>
          <td style="padding:8px 10px;text-align:right;font-family:'DM Mono',monospace;font-weight:600;color:${cor}">${_fmt(l.valor)}</td>
          <td style="padding:8px 10px;color:#888680;font-size:12px">${l.observacoes||'—'}</td>
        </tr>`;
      }).join('');
      el.innerHTML=`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">${cardsHTML}</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="background:#F8F7F4">
            <th style="text-align:left;padding:7px 10px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase">Data</th>
            <th style="text-align:left;padding:7px 10px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase">Tipo</th>
            <th style="text-align:right;padding:7px 10px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase">Valor</th>
            <th style="text-align:left;padding:7px 10px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase">Obs.</th>
          </tr></thead>
          <tbody>${linhasHTML}</tbody>
        </table>`;
    } catch(_){ el.innerHTML='<div style="color:#DC2626;font-size:13px">Erro ao carregar histórico.</div>'; }
  };

  // ── Salvar ────────────────────────────────────────────────────────────────────
  async function _salvarDados() {
    const nome = document.getElementById('func-nome').value.trim();
    if (!nome) { document.getElementById('func-erro').textContent='Nome é obrigatório.'; return; }
    const dados = {
      nome,
      tipo:               document.getElementById('func-tipo').value,
      cargo:              document.getElementById('func-cargo').value.trim()||null,
      cargo_tipo:         document.getElementById('func-cargo-tipo').value,
      status:             document.getElementById('func-status').value,
      salario_oficial:    _parse(document.getElementById('func-salario-oficial').value),
      salario_adicional:  _parse(document.getElementById('func-salario-adicional').value),
      vale_transporte:    _parse(document.getElementById('func-vt').value),
      vale_alimentacao:   _parse(document.getElementById('func-va').value),
      percentual_inss:    _parse(document.getElementById('func-inss').value),
      percentual_comissao: parseFloat(document.getElementById('func-comissao').value)||0,
      data_admissao:      document.getElementById('func-admissao').value||null,
      comentario_importante: document.getElementById('func-comentario').value.trim()||null,
    };
    const id  = document.getElementById('func-id').value;
    const btn = document.getElementById('btn-salvar-func');
    btn.disabled=true; btn.textContent='Salvando…';
    try {
      if (id) await api.atualizarFuncionario(id, dados);
      else    await api.criarFuncionario(dados);
      _funcCache = null;
      _fecharModal();
      window._funcModalOnSave?.();
    } catch(err){
      document.getElementById('func-erro').textContent = err.message;
    } finally { btn.disabled=false; btn.textContent='Salvar'; }
  }

  async function _salvarAdiantamento() {
    const funcionario_id = document.getElementById('func-id').value;
    const data           = document.getElementById('adiant-data').value;
    const valorTotal     = _parse(document.getElementById('adiant-valor').value);
    const observacoes    = document.getElementById('adiant-obs').value.trim();
    const n              = _adiantNParcelas;
    const erroEl         = document.getElementById('adiant-erro');
    if (!data||!valorTotal){ erroEl.textContent='Preencha data e valor.'; return; }
    const parcelas=[];
    for(let i=0;i<n;i++){
      const sel=document.getElementById(`adiant-parcela-sel-${i}`);
      if(!sel||!sel.value){erroEl.textContent='Selecione a quinzena de desconto para todas as parcelas.';return;}
      parcelas.push(sel.value);
    }
    erroEl.textContent='';
    const valorParcela=valorTotal/n;
    const btn=document.getElementById('btn-salvar-func');
    btn.disabled=true; btn.textContent='Salvando…';
    try {
      for(let i=0;i<n;i++){
        const obsParc=n>1?(observacoes?`${observacoes} — Parcela ${i+1}/${n}`:`Parcela ${i+1}/${n}`):observacoes;
        await api.registrarAdiantamento({funcionario_id,valor:valorParcela,data,observacoes:obsParc,desconto_em:parcelas[i]});
      }
      document.getElementById('adiant-data').value='';
      document.getElementById('adiant-valor').value='';
      document.getElementById('adiant-obs').value='';
      document.getElementById('adiant-parcelas-wrap').style.display='none';
      selecionarNParcelas(1);
      await _carregarAdiantamentosTab();
    } catch(err){ erroEl.textContent=err.message; }
    finally{ btn.disabled=false; btn.textContent='Registrar'; }
  }

  async function _carregarFeriasTab() {
    const id = document.getElementById('func-id').value;
    if (!id) return;
    const el = document.getElementById('ferias-historico-lista');
    if (!el) return;
    try {
      const lista = await api.listarFerias(id);
      if (!lista.length) {
        el.innerHTML = '<div style="color:#888680;font-size:13px;padding:8px 0">Nenhum pagamento registrado.</div>';
        return;
      }
      el.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#F8F7F4">
            <th style="text-align:left;padding:7px 10px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase">Pagamento</th>
            <th style="text-align:right;padding:7px 10px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase">Valor</th>
            <th style="text-align:left;padding:7px 10px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase">Período de gozo</th>
            <th style="text-align:left;padding:7px 10px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase">Obs.</th>
          </tr>
        </thead>
        <tbody>
          ${lista.map(f => {
            const periodo = f.data_inicio && f.data_fim
              ? `${f.data_inicio} → ${f.data_fim}`
              : '<span style="color:#ccc">—</span>';
            return `<tr style="border-top:1px solid #E3E1DA">
              <td style="padding:8px 10px;font-weight:600">${f.data_pagamento || '—'}</td>
              <td style="padding:8px 10px;text-align:right;font-family:'DM Mono',monospace;color:#15803D;font-weight:600">${_fmt(f.valor)}</td>
              <td style="padding:8px 10px;color:#555;font-size:12px">${periodo}</td>
              <td style="padding:8px 10px;color:#888680;font-size:12px">${f.observacoes || '—'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
    } catch (_) {
      el.innerHTML = '<div style="color:#DC2626;font-size:13px">Erro ao carregar histórico.</div>';
    }
  }

  async function _salvarFerias() {
    const funcionario_id = document.getElementById('func-id').value;
    const data_inicio    = document.getElementById('ferias-inicio').value;
    const data_fim       = document.getElementById('ferias-fim').value;
    const data_pagamento = document.getElementById('ferias-pagamento').value;
    const valor          = _parse(document.getElementById('ferias-valor').value);
    const observacoes    = document.getElementById('ferias-obs').value;
    const erroEl         = document.getElementById('ferias-erro');

    if (!data_pagamento || !valor) { erroEl.textContent = 'Informe a data do pagamento e o valor.'; return; }
    erroEl.textContent = '';

    const btnReg  = document.getElementById('btn-registrar-ferias');
    const btnSalv = document.getElementById('btn-salvar-func');
    if (btnReg)  { btnReg.disabled = true;  btnReg.textContent  = 'Salvando…'; }
    if (btnSalv) { btnSalv.disabled = true; btnSalv.textContent = 'Salvando…'; }

    try {
      await api.registrarFerias({funcionario_id, data_inicio, data_fim, data_pagamento, valor, observacoes});
      // Limpa os campos mas fica na aba
      document.getElementById('ferias-pagamento').value = '';
      document.getElementById('ferias-valor').value     = '';
      document.getElementById('ferias-obs').value       = '';
      document.getElementById('ferias-inicio').value    = '';
      document.getElementById('ferias-fim').value       = '';
      await _carregarFeriasTab();
      window._funcModalOnSave?.();
    } catch (err) {
      erroEl.textContent = err.message;
    } finally {
      if (btnReg)  { btnReg.disabled = false;  btnReg.textContent  = 'Registrar'; }
      if (btnSalv) { btnSalv.disabled = false; btnSalv.textContent = 'Salvar'; }
    }
  }

  async function _salvarDecimo() {
    const funcionario_id=document.getElementById('func-id').value;
    const data_pagamento=document.getElementById('decimo-data').value;
    const valor=_parse(document.getElementById('decimo-valor').value);
    const observacoes=document.getElementById('decimo-obs').value;
    const ano=parseInt(document.getElementById('decimo-ano-filtro').value);
    const erroEl=document.getElementById('decimo-erro');
    if(!data_pagamento){erroEl.textContent='Informe a data do pagamento.';return;}
    if(!valor){erroEl.textContent='Informe o valor pago.';return;}
    erroEl.textContent='';
    const btn=document.getElementById('btn-salvar-func');
    btn.disabled=true; btn.textContent='Salvando…';
    try {
      await api.registrarDecimo({funcionario_id,ano,data_pagamento,valor,observacoes});
      document.getElementById('decimo-data').value='';
      document.getElementById('decimo-valor').value='';
      document.getElementById('decimo-obs').value='';
      await _carregarDecimoTab();
    } catch(err){ erroEl.textContent=err.message; }
    finally{ btn.disabled=false; btn.textContent='Registrar Pagamento'; }
  }

  async function _salvarRescisao() {
    const funcionario_id=document.getElementById('func-id').value;
    const data_rescisao=document.getElementById('rescisao-data').value;
    const valor_saldo=_parse(document.getElementById('rescisao-saldo').value);
    const valor_ferias_prop=_parse(document.getElementById('rescisao-ferias-prop').value);
    const valor_decimo_terceiro=_parse(document.getElementById('rescisao-decimo').value);
    const valor_fgts=_parse(document.getElementById('rescisao-fgts').value);
    const outros_valores=_parse(document.getElementById('rescisao-outros').value);
    const observacoes=document.getElementById('rescisao-obs').value;
    const marcar_inativo=document.getElementById('rescisao-inativo').checked;
    const nome=document.getElementById('func-nome').value;
    const isParcial=document.getElementById('rescisao-parcial').checked;
    const valor_pago_agora=isParcial?_parse(document.getElementById('rescisao-valor-pago').value):null;
    const data_pagamento_parcial=isParcial?document.getElementById('rescisao-data-pagamento').value:null;
    const erroEl=document.getElementById('rescisao-erro');
    if(!data_rescisao){erroEl.textContent='Informe a data da rescisão.';return;}
    if(isParcial&&!data_pagamento_parcial){erroEl.textContent='Informe a data deste pagamento.';return;}
    if(isParcial&&!valor_pago_agora){erroEl.textContent='Informe o valor pago neste pagamento.';return;}
    erroEl.textContent='';
    const totalStr=document.getElementById('rescisao-total').textContent;
    const saldoStr=document.getElementById('rescisao-saldo-restante').textContent;
    const modoStr=isParcial?`Pagamento parcial de ${_fmt(valor_pago_agora)} (saldo: ${saldoStr})`:`Baixa completa — ${totalStr}`;
    if(!confirm(`Confirmar rescisão de ${nome}?\n${modoStr}${marcar_inativo?'\n\nO funcionário será marcado como inativo.':''}`)) return;
    const btn=document.getElementById('btn-salvar-func');
    btn.disabled=true; btn.textContent='Salvando…';
    try {
      await api.registrarRescisao({funcionario_id,data_rescisao,valor_saldo,valor_ferias_prop,valor_decimo_terceiro,valor_fgts,outros_valores,observacoes,pagamento_parcial:isParcial,valor_pago_agora,data_pagamento_parcial,marcar_inativo});
      _funcCache=null;
      _fecharModal();
      window._funcModalOnSave?.();
    } catch(err){ erroEl.textContent=err.message; }
    finally{ btn.disabled=false; btn.textContent='Confirmar Rescisão'; }
  }

  // ── Caixa de totais ───────────────────────────────────────────────────────────
  function _atualizarResumoFin() {
    const oficial   = _parse(document.getElementById('func-salario-oficial')?.value   || '');
    const adicional = _parse(document.getElementById('func-salario-adicional')?.value || '');
    const inss      = _parse(document.getElementById('func-inss')?.value              || '');

    const total  = oficial + adicional;
    const liqD20 = total / 2;
    const liqD05 = total / 2 - inss;

    const cor = v => v >= 0 ? '#15803D' : '#DC2626';
    const txt = v => v >= 0 ? _fmt(v) : `- ${_fmt(Math.abs(v))}`;

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const setColor = (id, c) => { const el = document.getElementById(id); if (el) el.style.color = c; };

    set('mfm-total-bruto', _fmt(total));
    set('mfm-liq-d20', txt(liqD20)); setColor('mfm-liq-d20', cor(liqD20));
    set('mfm-liq-d05', txt(liqD05)); setColor('mfm-liq-d05', cor(liqD05));
  }

  // ── Bind de eventos ───────────────────────────────────────────────────────────
  function _bindEvents() {
    document.getElementById('modal-func-close').addEventListener('click', _fecharModal);
    document.getElementById('modal-func-cancel').addEventListener('click', _fecharModal);
    document.getElementById('modal-func').addEventListener('click', e => { if(e.target===e.currentTarget) _fecharModal(); });

    document.querySelectorAll('.mfm-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mfm-toggle-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        _tipoAtual = btn.dataset.val;
        document.getElementById('func-tipo').value = _tipoAtual;
        _atualizarCLT();
      });
    });

    document.getElementById('func-cargo-tipo').addEventListener('change', function(){ _atualizarCargo(this.value); });

    document.querySelectorAll('.mfm-valor-input').forEach(i => {
      i.addEventListener('input', () => _fmtInput(i));
      i.addEventListener('focus', () => i.select());
    });

    // Recalcular caixa de totais ao alterar campos financeiros
    ['func-salario-oficial','func-salario-adicional','func-inss'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', _atualizarResumoFin);
    });

    document.getElementById('adiant-data').addEventListener('change',  _buildParcelasRows);
    document.getElementById('adiant-valor').addEventListener('input',   _buildParcelasRows);

    document.getElementById('btn-registrar-ferias').addEventListener('click', _salvarFerias);

    document.getElementById('decimo-ano-filtro').addEventListener('change', () => {
      if(document.getElementById('func-id').value && document.getElementById('modal-active-tab').value==='decimo') _carregarDecimoTab();
    });

    document.querySelectorAll('.rescisao-input').forEach(input => {
      input.addEventListener('input',()=>{ _fmtInput(input); _atualizarTotalRescisao(); });
      input.addEventListener('focus',()=>input.select());
    });
    document.querySelectorAll('input[name="rescisao-tipo-pgto"]').forEach(radio => {
      radio.addEventListener('change',()=>{
        const isParcial=document.getElementById('rescisao-parcial').checked;
        document.getElementById('rescisao-parcial-wrap').style.display=isParcial?'flex':'none';
        if(!isParcial) document.getElementById('rescisao-saldo-restante').textContent='—';
        document.getElementById('btn-salvar-func').textContent=isParcial?'Confirmar Pagamento':'Confirmar Rescisão';
        _atualizarTotalRescisao();
      });
    });
    document.getElementById('rescisao-valor-pago').addEventListener('input',function(){ _fmtInput(this); _atualizarTotalRescisao(); });
    document.getElementById('rescisao-valor-pago').addEventListener('focus',function(){ this.select(); });
    document.getElementById('decimo-valor').addEventListener('input',function(){ _fmtInput(this); });
    document.getElementById('decimo-valor').addEventListener('focus',function(){ this.select(); });

    document.getElementById('btn-excluir-func').addEventListener('click', async () => {
      const id=document.getElementById('func-id').value;
      const nome=document.getElementById('func-nome').value;
      if(!confirm(`Excluir ${nome}? O funcionário ficará inativo e não aparecerá mais na lista.`)) return;
      const btn=document.getElementById('btn-excluir-func');
      btn.disabled=true; btn.textContent='Excluindo…';
      try {
        await api.excluirFuncionario(id);
        _funcCache=null;
        _fecharModal();
        window._funcModalOnSave?.();
      } catch(err){ alert('Erro ao excluir: '+err.message); btn.disabled=false; btn.textContent='Excluir'; }
    });

    document.getElementById('btn-salvar-func').addEventListener('click', async () => {
      const tab = document.getElementById('modal-active-tab').value;
      if (tab==='dados')         return await _salvarDados();
      if (tab==='adiantamentos') return await _salvarAdiantamento();
      if (tab==='ferias')        return await _salvarFerias();
      if (tab==='decimo')        return await _salvarDecimo();
      if (tab==='rescisao')      return await _salvarRescisao();
    });
  }

  // ── Public ────────────────────────────────────────────────────────────────────
  window.abrirModalFuncionario = async function(funcOrId) {
    _injectCSS();
    _injectHTML();
    if (funcOrId === null || funcOrId === undefined || typeof funcOrId === 'object') {
      _abrirModal(funcOrId || null);
      return;
    }
    // ID passado — buscar no cache
    if (!_funcCache) {
      try { _funcCache = await api.listarFuncionarios(); }
      catch(err) { alert('Erro ao carregar funcionário: ' + err.message); return; }
    }
    let func = _funcCache.find(f => String(f.id) === String(funcOrId));
    if (!func) {
      // Tentativa com cache renovado
      try { _funcCache = await api.listarFuncionarios(); func = _funcCache.find(f => String(f.id) === String(funcOrId)); }
      catch(_) {}
    }
    _abrirModal(func || null);
  };

  // Inicializar imediatamente (injeta na primeira vez que o arquivo é carregado)
  _injectCSS();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _injectHTML);
  } else {
    _injectHTML();
  }
})();
