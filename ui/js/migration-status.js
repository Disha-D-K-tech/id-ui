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
        responseBox.innerHTML = buildMigrationTree(json);
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

  function buildMigrationTree(data) {
    if (!data || !data.cols || !data.vals) {
      return '<p class="p-4 text-muted">No migration data available.</p>';
    }

    let parsedVals;
    try {
      parsedVals = JSON.parse(data.vals);
    } catch (e) {
      console.error("Error parsing vals:", e);
      return '<p class="p-4 text-danger">Error parsing migration values.</p>';
    }

    // Group data by Schema and then by Table
    const grouped = {};
    parsedVals.forEach(row => {
      const fullTable = row[0] || 'unknown';
      const parts = fullTable.split('.');
      const schemaName = parts.length > 1 ? parts[0] : 'public';
      const tableName = parts.length > 1 ? parts.slice(1).join('.') : fullTable;

      if (!grouped[schemaName]) grouped[schemaName] = {};
      // Migration status usually has one record per table
      grouped[schemaName][tableName] = row;
    });

    let html = `
      <div class="mb-3 px-3 pt-2">
        <button class="btn btn-sm btn-outline-primary me-2" onclick="expandAll(true)">Expand All</button>
        <button class="btn btn-sm btn-outline-secondary" onclick="expandAll(false)">Collapse All</button>
      </div>
    `;

    for (const [schemaName, tables] of Object.entries(grouped)) {
      html += `
        <div class="node schema-node" onclick="toggle(this)">
          <span><i class="fa-solid fa-layer-group me-2" style="color:var(--lv-indigo)"></i>Schema: ${schemaName}</span>
          <span class="arrow">▼</span>
        </div>
        <div class="panel" style="display:none">
      `;

      for (const [tableName, rowData] of Object.entries(tables)) {
        html += `
          <div class="node table-node" onclick="toggle(this)">
            <span><i class="fa-solid fa-table me-2" style="color:var(--muted)"></i>Table: ${tableName}</span>
            <span class="arrow">▼</span>
          </div>
          <div class="panel" style="display:none; padding: 12px 20px;">
            <div class="table-responsive">
              <table class="migration-table">
                <thead><tr>
        `;

        data.cols.forEach(col => {
          const formattedCol = col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          html += `<th>${formattedCol}</th>`;
        });

        html += `</tr></thead><tbody><tr>`;

        rowData.forEach((cell, index) => {
          let cellContent = cell;
          let cellClass = '';
          const colName = data.cols[index];

          if (colName === 'status' && typeof cell === 'string') {
            if (cell.includes('SUCCESS')) cellClass = 'status-success';
            else if (cell.includes('FAILED') || cell.includes('ERROR')) cellClass = 'status-error';
            else if (cell.includes('IN PROGRESS')) cellClass = 'status-inprogress';
          }

          if (colName === 'created_at' && typeof cellContent === 'string') {
            try { cellContent = new Date(cellContent).toLocaleString(); } catch (e) {}
          }
          html += `<td class="${cellClass}">${cellContent}</td>`;
        });

        html += `</tr></tbody></table></div></div>`;
      }
      html += `</div>`;
    }
    return html;
  }

  window.toggle = function (el) {
    const panel = el.nextElementSibling;
    if (panel) {
      const opening = panel.style.display === 'none' || panel.style.display === '';
      panel.style.display = opening ? 'block' : 'none';
      el.classList.toggle('active', opening);
    }
  };

  window.expandAll = function (expand) {
    const responseBox = document.getElementById('migrationResponse');
    if (!responseBox) return;
    responseBox.querySelectorAll('.node.schema-node').forEach(schemaNode => {
      const schemaPanel = schemaNode.nextElementSibling;
      if (schemaPanel) {
        schemaPanel.style.display = expand ? 'block' : 'none';
        schemaNode.classList.toggle('active', expand);
      }
      schemaPanel?.querySelectorAll('.node.table-node').forEach(tableNode => {
        const tablePanel = tableNode.nextElementSibling;
        if (tablePanel) tablePanel.style.display = 'none'; // Always keep table data closed
      });
    });
  };

  loadMigrationStatus();

})();