(function () {

  const STORAGE_KEY = 'schemaExplorerResults';
  const dbId = (sessionStorage.getItem('currentSchemaDbId') || '').trim();

  const mountNode = document.getElementById('schemaHtmlMount');
  const statusNode = document.getElementById('schemaStatus');

  let binaryMode = false;

  function readStore() {
    try {
      const store = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
      return store[dbId] || {};
    } catch (e) {
      return {};
    }
  }

  function formatCount(num) {

    if (num === 0) return "—";

    if (num >= 1_000_000)
      return Math.floor(num / 1_000_000) + "M";

    if (num >= 1_000)
      return Math.floor(num / 1_000) + "K";

    return num.toString();
  }

  if (!dbId) {
    statusNode.textContent = 'Missing db_id';
    return;
  }

  function processSchema() {

    // =========================
    // STYLE
    // =========================

    const style = document.createElement("style");

    style.innerHTML = `

      .node{
        display:flex;
        align-items:center;
      }
      .node span{
   margin-left:auto;
}
      .panel{
        overflow-x:auto;
      }

      table{
        width:100%;
      }

      .binary-highlight{
        background:#dcfce7 !important;
      }

    `;

    document.head.appendChild(style);

    // =========================
    // REMOVE DUPLICATES
    // =========================

    const seen = new Set();

    mountNode.querySelectorAll('.node.schema-node').forEach(node => {

      const name = node.innerText
        .toLowerCase()
        .replace('schema:', '')
        .split('(')[0]
        .trim();

      if (!name || seen.has(name)) {

        if (node.nextElementSibling?.classList.contains('panel')) {
          node.nextElementSibling.remove();
        }

        node.remove();

      } else {

        seen.add(name);
      }
    });
    
    // =========================
    // TOP BINARY BUTTON
    // =========================

    if (!document.getElementById('topBinaryBtn')) {

      const controls = document.querySelector('.controls');

      if (controls) {

        controls.style.display = 'flex';
        controls.style.alignItems = 'center';

        const topBtn = document.createElement('button');

        topBtn.id = 'topBinaryBtn';

        topBtn.innerText = 'Show Binary';

        topBtn.style.cssText = `
          padding: 5px 15px;
          margin-right: 10px;
          cursor: pointer;
          border: none;
          border-radius: 4px;
          background: purple;
          color: white;
          font-weight: bold;
          margin-left:auto;
        `;

        topBtn.onclick = function () {

          binaryMode = !binaryMode;

          mountNode.querySelectorAll('.node.schema-node').forEach(schemaNode => {

            const panel = schemaNode.nextElementSibling;

            if (binaryMode) {

              if (schemaNode.dataset.hasBinary === "true") {

                schemaNode.style.display = 'flex';

                if (panel) {
                  panel.style.display = 'block';
                }

              } else {

                schemaNode.style.display = 'none';

                if (panel) {
                  panel.style.display = 'none';
                }
              }

            } else {

              schemaNode.style.display = 'flex';

              if (panel) {
                panel.style.display = 'none';
              }
            }
          });
        };

        controls.appendChild(topBtn);

        // Show Unmatched button
        const unmatchedBtn = document.createElement('button');
        unmatchedBtn.id = 'topUnmatchedBtn';
        unmatchedBtn.innerText = 'Show Unmatched';
        unmatchedBtn.style.cssText = `
          padding: 5px 15px;
          margin-right: 10px;
          cursor: pointer;
          border: none;
          border-radius: 4px;
          background: #7c3aed;
          color: white;
          font-weight: bold;
        `;

        let unmatchedMode = false;

        unmatchedBtn.onclick = function() {
          unmatchedMode = !unmatchedMode;
          unmatchedBtn.innerText = unmatchedMode ? 'Show All' : 'Show Unmatched';

          const unmatchedTables = mountNode._unmatchedTables || new Set();
          const unmatchedSchemas = mountNode._unmatchedSchemas || new Set();

          mountNode.querySelectorAll('.node.schema-node').forEach(schemaNode => {
            const schemaPanel = schemaNode.nextElementSibling;

            if (!unmatchedMode) {
              // Restore all — show schemas, collapse table panels
              schemaNode.style.display = 'flex';
              if (schemaPanel) {
                schemaPanel.style.display = 'none';
                schemaPanel.querySelectorAll('.node.table-node').forEach(tn => {
                  tn.style.display = 'flex';
                  const tp = tn.nextElementSibling;
                  if (tp) tp.style.display = 'none';
                });
              }
              return;
            }

            // Unmatched mode — hide schemas with no mismatches
            if (!unmatchedSchemas.has(schemaNode)) {
              schemaNode.style.display = 'none';
              if (schemaPanel) schemaPanel.style.display = 'none';
              return;
            }

            // Show schema and its panel
            schemaNode.style.display = 'flex';
            if (schemaPanel) {
              schemaPanel.style.display = 'block';

              // Hide/show table nodes
              schemaPanel.querySelectorAll('.node.table-node').forEach(tn => {
                const tp = tn.nextElementSibling;
                if (unmatchedTables.has(tn)) {
                  tn.style.display = 'flex';
                  if (tp) tp.style.display = 'block';
                } else {
                  tn.style.display = 'none';
                  if (tp) tp.style.display = 'none';
                }
              });
            }
          });
        };

        controls.appendChild(unmatchedBtn);
      }
    }


    // =========================
    // MAP COUNTS
    // =========================
    
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
                .replace(/,\s*]/g, ']')
            : JSON.stringify(raw);

          const parsed = JSON.parse(dataStr);

          const list =
            parsed.table_counts ||
            (Array.isArray(parsed) ? parsed : []);

          list.forEach(([fullName, count]) => {

            tableMap[
              fullName.toLowerCase().trim()
            ] = parseInt(count) || 0;

          });

        } catch (e) {

          console.error("Data Parse Error", e);
        }
      }

      // =========================
      // LOOP SCHEMAS
      // =========================

      mountNode.querySelectorAll('.node.schema-node').forEach(schemaNode => {

        const panel = schemaNode.nextElementSibling;

        if (!panel) return;

        const schemaName = schemaNode.innerText
          .toLowerCase()
          .replace('schema:', '')
          .split('(')[0]
          .trim();

        let schemaTotal = 0;

        // =========================
        // LOOP TABLES
        // =========================

        panel.querySelectorAll('.node.table-node').forEach(tableNode => {

          const tableName = tableNode.innerText
            .toLowerCase()
            .replace('table:', '')
            .split('(')[0]
            .trim();

          const key = `${schemaName}.${tableName}`;

          const count = tableMap[key] || 0;

          const tablePanel = tableNode.nextElementSibling;

          // =========================
          // BIN-MAPPED
          // =========================

          if (
            tablePanel &&
            tablePanel.innerHTML.includes('BIN-MAPPED')
          ) {

            schemaNode.dataset.hasBinary = "true";

            if (!tableNode.querySelector('.binary-btn')) {

              const btn = document.createElement('button');

              btn.textContent = 'Show Binary';

              btn.className = 'binary-btn';

              // SMALL LIGHT BUTTON
              btn.style.cssText = `
                padding: 1px 6px;
                margin-left: 6px;
                margin-right: 6px;
                cursor: pointer;
                border: none;
                border-radius: 3px;
                background: #6ee7b7;
                color: #065f46;
                font-size: 10px;
                font-weight: 600;
                height: 20px;
                line-height: 18px;
              `;

              btn.onclick = function (e) {

                e.stopPropagation();

                const isOpen =
                  tablePanel.style.display === 'block';

                // CLOSE
                if (isOpen) {

                  tablePanel.style.display = 'none';

                  tablePanel.querySelectorAll('tr').forEach(row => {
                    row.classList.remove('binary-highlight');
                  });

                } else {

                  // OPEN
                  panel.style.display = 'block';

                  tablePanel.style.display = 'block';

                  tableNode.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                  });

                  tablePanel.querySelectorAll('tr').forEach(row => {

                    if (row.innerText.includes('BIN-MAPPED')) {

                      row.classList.add('binary-highlight');
                    }
                  });
                }
              };

              // RIGHT SIDE BUTTON + COUNT
              const span = tableNode.querySelector('span');

              const rightBox = document.createElement('div');

              rightBox.style.display = 'flex';
              rightBox.style.alignItems = 'center';
              rightBox.style.marginLeft = 'auto';
              rightBox.style.gap = '6px';

              span.remove();

              rightBox.appendChild(btn);
              rightBox.appendChild(span);

              tableNode.appendChild(rightBox);
            }
          }

          schemaTotal += count;

          // =========================
          // COUNT
          // =========================

          const spanId = `${schemaName}.${tableName}_c`;

          const span = tableNode.querySelector(
            `#${CSS.escape(spanId)}`
          );

          if (span) {

            span.textContent = formatCount(count);

            span.style.cssText = `
              color:#10b981;
              font-weight:bold;
              margin-left: auto;
            `;
          }

        });

        // =========================
        // SCHEMA COUNT
        // =========================

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

    function normalizeType(t) {
      t = (t || '').toLowerCase().trim();
      if (t === 'character' || t.includes('char(') || t.startsWith('char')) return 'char';
      if (t.includes('character varying') || t.startsWith('varchar')) return 'varchar';
      if (t === 'text' || t === 'string') return 'string';
      if (t === 'integer' || t === 'int') return 'integer';
      if (t === 'smallint') return 'smallint';
      if (t === 'boolean') return 'boolean';
      if (t === 'date') return 'date';
      if (t.includes('timestamp')) return 'timestamp';
      if (t === 'numeric' || t.startsWith('number')) return 'numeric';
      if (t === 'uuid') return 'uuid';
      if (t === 'xml' || t === 'variant') return 'variant';
      if (t === 'bytea' || t === 'bin-mapped') return 'binary';
      if (t === 'time without time zone' || t === 'time') return 'time';
      return t;
    }

    function normalizeDefault(d) {
      d = (d || '').toLowerCase().trim();
      if (d === 'none' || d === '' || d === 'null') return '__none__';
      if (d === 'now()' || d === 'current_timestamp()' || d === 'current_timestamp') return '__now__';
      if (d.includes('uuid_generate') || d.includes('uuid_string')) return '__uuid__';
      if (d.includes('nextval') || d.includes('.nextval')) return '__seq__';
      if (d.includes('@data_stage') || d.includes('binary col. mapped')) return '__binary__';
      d = d.replace(/::[a-z ]+$/, '').trim();
      d = d.replace(/^'(.*)'$/, '$1');
      return d;
    }

    setTimeout(() => {
      const unmatchedTables = new Set();
      const unmatchedSchemas = new Set();

      mountNode.querySelectorAll('.panel table tr').forEach(tr => {
        const tds = tr.querySelectorAll('td');
        if (tds.length < 6) return;

        const srcType = tds[2].textContent.trim();
        const tgtType = tds[3].textContent.trim();
        const srcDef  = tds[4].textContent.trim();
        const tgtDef  = tds[5].textContent.trim();

        const typeMismatch = normalizeType(srcType) !== normalizeType(tgtType);
        const defMismatch  = normalizeDefault(srcDef) !== normalizeDefault(tgtDef);

        if (typeMismatch || defMismatch) {
          tr.style.backgroundColor = '#ede9fe';
          tr.style.borderLeft = '3px solid #7c3aed';

          // Find parent table-node and schema-node
          const tablePanel = tr.closest('.panel');
          if (tablePanel) {
            const tableNode = tablePanel.previousElementSibling;
            if (tableNode && tableNode.classList.contains('table-node')) {
              unmatchedTables.add(tableNode);
              // Find parent schema-node
              const schemaPanel = tableNode.closest('.panel');
              if (schemaPanel) {
                const schemaNode = schemaPanel.previousElementSibling;
                if (schemaNode && schemaNode.classList.contains('schema-node')) {
                  unmatchedSchemas.add(schemaNode);
                }
              }
            }
          }
        }
      });

      // Store on mountNode for the button to access
      mountNode._unmatchedTables = unmatchedTables;
      mountNode._unmatchedSchemas = unmatchedSchemas;
    }, 600);
  }

  // =========================
  // FETCH
  // =========================

  statusNode.textContent = 'Loading...';

  fetch('https://dpm44skvaxno5gkzadi3kpodyu0vfzct.lambda-url.ap-south-1.on.aws/', {

    method: 'POST',

    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },

    body: new URLSearchParams({
      db_id: dbId
    })

  })
  .then(r => r.text())
  .then(html => {

    statusNode.style.display = 'none';

    mountNode.innerHTML = html;

    processSchema();

  })
  .catch(err => {

    console.error("API Fetch Error:", err);

    statusNode.innerHTML = `
      <b style="color:red">
        Connection Error
      </b>
    `;
  });

})();

window.toggle = function (el) {

  const panel = el.nextElementSibling;

  if (panel) {

    panel.style.display =
      (panel.style.display === 'none' || panel.style.display === '')
      ? 'block'
      : 'none';
  }
};

// =========================
// GLOBAL TOGGLE FUNCTION
// =========================
window.expandAll = function (expand) {

  const mountNode = document.getElementById('schemaHtmlMount');

  if (!mountNode) return;

  // LOOP ALL SCHEMA NODES
  mountNode.querySelectorAll('.node.schema-node').forEach(schemaNode => {

    const schemaPanel = schemaNode.nextElementSibling;

    // OPEN/CLOSE ONLY SCHEMA PANELS
    if (schemaPanel) {

      schemaPanel.style.display = expand
        ? 'block'
        : 'none';
    }

    // KEEP TABLE DATA CLOSED
    schemaPanel?.querySelectorAll('.node.table-node').forEach(tableNode => {

      const tablePanel = tableNode.nextElementSibling;

      if (tablePanel) {

        // ALWAYS KEEP TABLE DATA CLOSED
        tablePanel.style.display = 'none';
      }
    });
  });
};