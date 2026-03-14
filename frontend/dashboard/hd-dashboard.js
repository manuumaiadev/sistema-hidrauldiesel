Chart.defaults.font.family = "'DM Sans', sans-serif";
Chart.defaults.color = '#888680';

new Chart(document.getElementById('fatChart'), {
  type: 'bar',
  data: {
    labels: ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'],
    datasets: [{ data: [2100,3400,2800,4200,3100,2800,0],
      backgroundColor: ctx => ctx.dataIndex === 3 ? '#1B2D5B' : '#E3E1DA',
      borderRadius: 5, borderSkipped: false }]
  },
  options: { responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' R$ ' + ctx.parsed.y.toLocaleString('pt-BR') } } },
    scales: { x: { grid: { display: false }, border: { display: false } }, y: { grid: { color: '#EDECEA' }, border: { display: false }, ticks: { callback: v => 'R$' + (v/1000).toFixed(0) + 'k' } } }
  }
});

new Chart(document.getElementById('tipoChart'), {
  type: 'doughnut',
  data: {
    labels: ['Revisão','Freios','Suspensão','Elétrica','Outros'],
    datasets: [{ data: [9,6,4,3,2],
      backgroundColor: ['#1B2D5B','#C0152A','#1B5FBF','#D97706','#D1CFC8'],
      borderWidth: 0, hoverOffset: 4 }]
  },
  options: { responsive: true, maintainAspectRatio: false, cutout: '68%',
    plugins: { legend: { position: 'right', labels: { boxWidth: 10, boxHeight: 10, borderRadius: 3, padding: 12, font: { size: 12 } } } }
  }
});

document.querySelectorAll('.period-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.period-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});
