(function () {
  console.log('migration-status.js loaded');
  const dbId = (sessionStorage.getItem('migrationDbId') || '').trim();
  const responseBox = document.getElementById('migrationResponse');
  const loadingBox = document.getElementById('migrationLoading');

  // =========================
  // API FETCH
  // =========================
  function loadMigrationStatus() {
    console.log('Fetching Migration Status for ID:', dbId);

    if (!dbId) {
      loadingBox.innerHTML = '<i class="fa-solid fa-circle-exclamation me-2"></i> Missing Database ID. Please select a database from the Dashboard.';
      return;
    }

    // Matching schema_explorer pattern exactly: added trailing slash and reverted to .then() chain
    fetch('https://eknzie3ujercqevbcx3rhjjtrq0fwgph.lambda-url.ap-south-1.on.aws/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        db_id: 128
      })
    })
    .then(r => r.text())
    .then(data => {
      loadingBox.style.display = 'none';
      try {
        const json = JSON.parse(data);
        responseBox.textContent = JSON.stringify(json, null, 2);
      } catch (e) {
        responseBox.textContent = data || 'No response data received.';
      }
    })
    .catch(err => {
      console.error('FETCH ERROR:', err);
      loadingBox.innerHTML = '<i class="fa-solid fa-triangle-exclamation me-2"></i> Connection Error (502). The service may be temporarily unavailable.';
      loadingBox.style.color = '#dc2626';
    });
  }

  loadMigrationStatus();

})();