(function () {
  const STORAGE_KEY = 'schemaExplorerResults';
  const params = new URLSearchParams(window.location.search);
  const dbId = (params.get('db_id') || '').trim();

  const mountNode = document.getElementById('schemaHtmlMount');
  const statusNode = document.getElementById('schemaStatus');

  function readStore() {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
  }

  if (!dbId) {
    statusNode.textContent = 'Missing db_id';
    return;
  }

  const storedPayload = readStore()[dbId];

  if (!storedPayload || !storedPayload.html) {
    statusNode.textContent = 'No stored data found';
    return;
  }

  // Inject HTML
  mountNode.innerHTML = storedPayload.html;
// restore toggle + API JS
mountNode.querySelectorAll('script').forEach(oldScript => {
  const newScript = document.createElement('script');
  newScript.textContent = oldScript.textContent;
  document.body.appendChild(newScript);
  document.body.removeChild(newScript);
});
  // ===============================
  // STEP 1: REMOVE DUPLICATE SCHEMAS
  // ===============================
  setTimeout(() => {

    const seen = new Set();
    const schemas = mountNode.querySelectorAll('.node.schema-node');

    schemas.forEach(schema => {
      const name = schema.textContent.trim().toLowerCase();

      if (seen.has(name)) {
        const panel = schema.nextElementSibling;
        schema.remove();
        if (panel && panel.classList.contains('panel')) panel.remove();
      } else {
        seen.add(name);
      }
    });

  }, 200);

  // ===============================
  // STEP 2: APPLY ROW COUNTS
  // ===============================
  setTimeout(() => {
    console.log('FULL storedPayload:', storedPayload);
    const raw = storedPayload['table-counts'];

    if (!raw) {
      console.error('❌ table-counts missing in storage');
      return;
    }

    let tableMap = {};

    try {
      const fixed = raw
        .replace(/\(/g, '[')
        .replace(/\)/g, ']')
        .replace(/'/g, '"');

      const parsed = JSON.parse(fixed);

      parsed.table_counts.forEach(([name, count]) => {
        tableMap[name.toLowerCase().trim()] = parseInt(count) || 0;
      });

    } catch (e) {
      console.error('Parse error', e);
      return;
    }

    const schemas = mountNode.querySelectorAll('.node.schema-node');

    schemas.forEach(schema => {
      const panel = schema.nextElementSibling;
      if (!panel || !panel.classList.contains('panel')) return;

      // const schemaName = schema.textContent
      //   .replace(/\(\d+\)$/, '')
      //   .trim()
      //   .toLowerCase();
      const schemaName = schema.childNodes[0].nodeValue
  .trim()
  .toLowerCase();

      let total = 0;

      panel.querySelectorAll('.node.table-node').forEach(table => {
        const tableName = table.textContent.trim().toLowerCase();
        const key = `${schemaName}.${tableName}`;

        if (tableMap.hasOwnProperty(key)) {
  total += tableMap[key];
}
      });

      schema.textContent = `${schemaName} (${total})`;
    });

  }, 500);

})();
// FIX: expose toggle globally
window.toggle = function (el) {
  const panel = el.nextElementSibling;
  if (!panel) return;

  if (panel.style.display === 'none' || panel.style.display === '') {
    panel.style.display = 'block';
  } else {
    panel.style.display = 'none';
  }
};