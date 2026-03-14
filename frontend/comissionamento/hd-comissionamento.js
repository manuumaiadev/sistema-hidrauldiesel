// Period tab switching
document.querySelectorAll('.period-tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.period-tab').forEach(function(t) {
      t.classList.remove('active');
    });
    tab.classList.add('active');
  });
});
