/* ===== FILTER BUTTONS ===== */
(function () {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const rows = document.querySelectorAll('#clientesTableBody tr');

  function applyFilters() {
    const activeFilter = document.querySelector('.filter-btn.active');
    const filterValue = activeFilter ? activeFilter.dataset.filter : 'todos';
    const searchValue = document.getElementById('searchInput').value.trim().toLowerCase();

    rows.forEach(function (row) {
      const status = row.dataset.status || '';
      const name = (row.dataset.name || '').toLowerCase();
      const doc = (row.dataset.doc || '').toLowerCase();

      const matchesFilter =
        filterValue === 'todos' ||
        status === filterValue;

      const matchesSearch =
        searchValue === '' ||
        name.includes(searchValue) ||
        doc.includes(searchValue);

      if (matchesFilter && matchesSearch) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  }

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      applyFilters();
    });
  });

  /* ===== SEARCH INPUT ===== */
  var searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }
})();

/* ===== BLING SYNC STUB ===== */
function sincronizarBling() {
  alert('Sincronização com Bling iniciada. Aguarde...');
  // TODO: implement Bling API integration
}
