(function () {
  console.log('migration-status.js loaded');
  const dbId =
    (
      sessionStorage.getItem('migrationDbId')
      || ''
    ).trim();

  const responseBox =
    document.getElementById(
      'migrationResponse'
    );

  const loadingBox =
    document.getElementById(
      'migrationLoading'
    );

  // =========================
  // BACK BUTTON
  // =========================

  document
    .getElementById('backBtn')
    .addEventListener('click', function () {

      window.location.href = 'dashboard.html';

    });

  // =========================
  // API FETCH
  // =========================

  async function loadMigrationStatus() {

    console.log('DB ID:', dbId);

    if (!dbId) {

      loadingBox.innerHTML =
        'Missing db_id';

      return;
    }

    try {

  const response = await fetch(
    'https://eknzie3ujercqevbcx3rhjjtrq0fwgph.lambda-url.ap-south-1.on.aws/',
    {
      method: 'POST',

      headers: {
        'Content-Type':
          'application/x-www-form-urlencoded'
      },

      body:
        `db_id=${encodeURIComponent(dbId)}`
    }
  );

  console.log('STATUS:', response.status);

  console.log('OK:', response.ok);

  const data = await response.text();

  console.log('RESPONSE:', data);

  loadingBox.style.display = 'none';

  responseBox.textContent =
    data || 'No response received';

} catch (err) {

  console.error('FETCH ERROR:', err);

  loadingBox.innerHTML =
    'Failed to load migration status';
}
  }

  loadMigrationStatus();

})();