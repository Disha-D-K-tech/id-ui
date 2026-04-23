(function () {
  const STORAGE_KEY = 'schemaExplorerResults';
  const params = new URLSearchParams(window.location.search);
  const dbId = (params.get('db_id') || '').trim();

  const dbIdChip      = document.getElementById('dbIdChip');
  const statusNode    = document.getElementById('schemaStatus');
  const fetchedAtNode = document.getElementById('schemaFetchedAt');
  const mountNode     = document.getElementById('schemaHtmlMount');

  function readStore() {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}'); }
    catch (e) { return {}; }
  }

  if (dbIdChip) dbIdChip.textContent = `db_id: ${dbId || '--'}`;

  if (!dbId) {
    if (statusNode) statusNode.textContent = 'Missing db_id in the page URL.';
    return;
  }

  const storedPayload = readStore()[dbId];

  if (!storedPayload) {
    if (statusNode) statusNode.textContent = 'No stored data found. Run Assessment first.';
    return;
  }

  if (fetchedAtNode) {
    fetchedAtNode.textContent = storedPayload.fetched_at ? `Fetched: ${storedPayload.fetched_at}` : '';
  }

  if (storedPayload.html) {
    if (statusNode) statusNode.textContent = 'Schema loaded successfully.';
    if (mountNode) {
      // Inject the API HTML as-is
      mountNode.innerHTML = storedPayload.html;
      

      // Re-execute any scripts that came with the injected HTML
      mountNode.querySelectorAll('script').forEach(function (oldScript) {
        const newScript = document.createElement('script');
        newScript.textContent = oldScript.textContent;
        document.body.appendChild(newScript);
        document.body.removeChild(newScript);
      });
setTimeout(() => {

  const schemas = mountNode.querySelectorAll('.node.schema-node');

  schemas.forEach(schema => {
    const panel = schema.nextElementSibling;

    if (!panel || !panel.classList.contains('panel')) return;

    const tables = panel.querySelectorAll('.node.table-node');
    const count = tables.length;

    // clean previous count
    const clean = schema.textContent.replace(/\(\d+\)$/, '').trim();

    schema.textContent = `${clean} (${count})`;
  });

}, 300);
    }
    return;
  }

  if (statusNode) statusNode.textContent = 'API returned an error.';
})();