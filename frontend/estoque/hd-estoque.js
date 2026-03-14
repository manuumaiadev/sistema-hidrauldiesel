(() => {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const searchInput = document.getElementById('searchInput');
  const rows = document.querySelectorAll('#estoqueTable tbody tr');

  let activeFilter = 'todos';
  let searchQuery = '';

  function applyFilters() {
    rows.forEach(row => {
      const status = row.getAttribute('data-status') || '';
      const text = row.textContent.toLowerCase();

      const matchesFilter =
        activeFilter === 'todos' || status === activeFilter;

      const matchesSearch =
        searchQuery === '' || text.includes(searchQuery);

      if (matchesFilter && matchesSearch) {
        row.classList.remove('hidden');
      } else {
        row.classList.add('hidden');
      }
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-filter');
      applyFilters();
    });
  });

  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.toLowerCase().trim();
    applyFilters();
  });
})();
