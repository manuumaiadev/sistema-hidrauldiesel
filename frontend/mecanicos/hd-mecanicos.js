// Interações futuras: modal de cadastro, edição de mecânico

// Render current date in the header
(function () {
  const el = document.getElementById('page-date');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
})();
