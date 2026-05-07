(function () {
  const STORAGE_KEY = 'schemaExplorerResults';
  const dbId = (sessionStorage.getItem('currentSchemaDbId') || '').trim();
  const mountNode = document.getElementById('schemaHtmlMount');
  const statusNode = document.getElementById('schemaStatus');

  function readStore() {
    try {
      const store = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
      return store[dbId] || {};
    } catch (e) { return {}; }
  }

  // ✅ FORMAT FUNCTION (K, M, —)
  function formatCount(num) {
    if (num === 0) return "—";
    if (num >= 1_000_000) return Math.floor(num / 1_000_000) + "M";
    if (num >= 1_000) return Math.floor(num / 1_000) + "K";
    return num.toString();
  }

  if (!dbId) {
    statusNode.textContent = 'Missing db_id';
    return;
  }

  function processSchema() {

    // Better alignment (flex)
   const style = document.createElement("style");
style.innerHTML = `
  .node {
    display: flex;
    align-items: center;
  }

  .node span {
    margin-left: auto;
  }
`;
document.head.appendChild(style);

    // 1. Remove Duplicates
    const seen = new Set();
    mountNode.querySelectorAll('.node.schema-node').forEach(node => {
      const name = node.innerText.toLowerCase().replace('schema:', '').split('(')[0].trim();
      if (!name || seen.has(name)) {
        if (node.nextElementSibling?.classList.contains('panel')) node.nextElementSibling.remove();
        node.remove();
      } else { seen.add(name); }
    });

    // 2. Map and Display Counts
    setTimeout(() => {
      const payload = readStore();
      const raw = payload['table-counts'] || payload['table_counts'];
      
      let tableMap = {};
      if (raw) {
        try {
          const dataStr = typeof raw === 'string'
            ? raw
                .replace(/\(/g, '[')
                .replace(/\)/g, ']')
                .replace(/'/g, '"')
                .replace(/,\s*]/g, ']')   // fix broken data
            : JSON.stringify(raw);

          const parsed = JSON.parse(dataStr);
          const list = parsed.table_counts || (Array.isArray(parsed) ? parsed : []);

          list.forEach(([fullName, count]) => {
            tableMap[fullName.toLowerCase().trim()] = parseInt(count) || 0;
          });

        } catch (e) { console.error("Data Parse Error", e); }
      }

      mountNode.querySelectorAll('.node.schema-node').forEach(schemaNode => {
        const panel = schemaNode.nextElementSibling;
        if (!panel) return;

        const schemaName = schemaNode.innerText
          .toLowerCase()
          .replace('schema:', '')
          .split('(')[0]
          .trim();

        let schemaTotal = 0;

        panel.querySelectorAll('.node.table-node').forEach(tableNode => {

          // Extract table name
          const tableName = tableNode.innerText
            .toLowerCase()
            .replace('table:', '')
            .split('(')[0]
            .trim();

          const key = `${schemaName}.${tableName}`;
          const count = tableMap[key] || 0;

          schemaTotal += count;

          // Use existing span
          const spanId = `${schemaName}.${tableName}_c`;
          const span = tableNode.querySelector(`#${CSS.escape(spanId)}`);

          if (span) {
            span.textContent = formatCount(count);
            span.style.cssText = `
              color:#10b981;
              font-weight:bold;
            `;
          }
        });

        // Update schema total
        const span = schemaNode.querySelector('span');
        if (span) {
          span.textContent = formatCount(schemaTotal);
          span.style.cssText = `
            color:#6366f1;
            font-weight:bold;
          `;
        }
      });

    }, 400);
  }

  statusNode.textContent = 'Loading...';
  
  fetch('https://dpm44skvaxno5gkzadi3kpodyu0vfzct.lambda-url.ap-south-1.on.aws/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ db_id: dbId })
  })
  .then(r => r.text())
  .then(html => {
    statusNode.style.display = 'none';
    mountNode.innerHTML = html;
    processSchema();
  })
  .catch(err => {
    console.error("API Fetch Error:", err);
    statusNode.innerHTML = `<b style="color:red">Connection Error</b>`;
  });

})();

window.toggle = function (el) {
  const panel = el.nextElementSibling;
  if (panel) {
    panel.style.display = (panel.style.display === 'none' || panel.style.display === '') ? 'block' : 'none';
  }
};
