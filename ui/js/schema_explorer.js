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
        background:#fee2e2 !important;
      }
        /* =========================
   SUMMARY OVERVIEW
========================= */

.summary-box{
  width: 92%;
  margin: 22px auto 18px auto;
  padding: 15px 15px 20px;
  border-radius: 26px;
  background: rgba(255,255,255,0.55);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(168,85,247,0.12);
  box-shadow:
    0 8px 30px rgba(124,58,237,0.05),
    inset 0 1px 0 rgba(255,255,255,0.55);
}

/* TITLE */

.summary-title{
  display:flex;
  align-items:center;
  gap:10px;
  font-size:16px;
  font-weight:800;
  color:#6d28d9;
  margin-bottom:6px;
}

.summary-subtitle{
  color:#6b7280;
  font-size:13px;
  margin-left:26px;
  margin-bottom:18px;
}

/* TABLE */

.summary-table{
  width:100%;
  border-collapse:separate;
  border-spacing:0 10px;
}

.summary-head th{
  background:#fefce8;
  color:#5b21b6;
  font-size:13px;
  text-align:left;
  padding:12px 16px;
  border-top:1px solid #ede9fe;
  border-bottom:1px solid #ede9fe;
}

.summary-head th:first-child{
  border-top-left-radius:14px;
  border-bottom-left-radius:14px;
}

.summary-head th:last-child{
  border-top-right-radius:14px;
  border-bottom-right-radius:14px;
}

/* ROWS */

.summary-table tr td{
  padding:15px 15px;
  font-size:14px;
  border-top:1px solid rgba(255,255,255,0.6);
  border-bottom:1px solid rgba(255,255,255,0.6);
}

.summary-table tr td:first-child{
  border-top-left-radius:18px;
  border-bottom-left-radius:18px;
}

.summary-table tr td:last-child{
  border-top-right-radius:18px;
  border-bottom-right-radius:18px;
}

/* COLORS */

.summary-green td{
  background:rgba(220,252,231,0.72);
}

.summary-red td{
  background:rgba(254,226,226,0.72);
}

.summary-purple td{
  background:rgba(237,233,254,0.72);
}

/* STATUS */

.summary-status{
  font-weight:800;
  display:flex;
  align-items:center;
  gap:12px;
}

.summary-green .summary-status{
  color:#16a34a;
}

.summary-red .summary-status{
  color:#ef4444;
}

.summary-purple .summary-status{
  color:#7c3aed;
}

/* DESCRIPTION */

.summary-desc{
  color:#111827 !important;
  font-weight:500;
}

/* DOT */

.summary-dot{
  width:14px;
  height:14px;
  border-radius:50%;
  flex-shrink:0;
  box-shadow:0 0 10px rgba(0,0,0,0.08);
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

    const schemaPanel = schemaNode.nextElementSibling;

    if (!schemaPanel) return;

    if (binaryMode) {

      let hasVisibleBinaryTable = false;

      // CHECK ALL TABLES
      schemaPanel.querySelectorAll('.node.table-node').forEach(tableNode => {

        const tablePanel = tableNode.nextElementSibling;

        const hasBinaryBtn =
          tableNode.querySelector('.binary-btn');

        if (hasBinaryBtn) {

          // SHOW ONLY BINARY TABLES
          tableNode.style.display = 'flex';

          hasVisibleBinaryTable = true;

          if (tablePanel) {
            tablePanel.style.display = 'none';
          }

        } else {

          // HIDE NORMAL TABLES
          tableNode.style.display = 'none';

          if (tablePanel) {
            tablePanel.style.display = 'none';
          }
        }
      });

      // SHOW ONLY SCHEMAS HAVING BINARY TABLES
      if (hasVisibleBinaryTable) {

        schemaNode.style.display = 'flex';
        schemaPanel.style.display = 'block';

      } else {

        schemaNode.style.display = 'none';
        schemaPanel.style.display = 'none';
      }

    } else {

      // RESTORE EVERYTHING
      schemaNode.style.display = 'flex';

      schemaPanel.style.display = 'none';

      schemaPanel.querySelectorAll('.node.table-node').forEach(tableNode => {

        tableNode.style.display = 'flex';

        const tablePanel = tableNode.nextElementSibling;

        if (tablePanel) {
          tablePanel.style.display = 'none';
        }
      });
    }
  });
};

        controls.appendChild(topBtn);

        // Show Mismatch button
        const unmatchedBtn = document.createElement('button');
        unmatchedBtn.id = 'topUnmatchedBtn';
        unmatchedBtn.innerText = 'Show Mismatch';
        unmatchedBtn.style.cssText = `
          padding: 5px 15px;
  margin-right: 10px;
  cursor: pointer;
  border: 1px solid #cb8af0;
  border-radius: 4px;
  background: rgba(207, 181, 229, 0.55);
  backdrop-filter: blur(8px);
  color: #9b2db7;
  font-weight: 700;
        `;

        let unmatchedMode = false;

        unmatchedBtn.onclick = function() {
          unmatchedMode = !unmatchedMode;
          unmatchedBtn.innerText = unmatchedMode ? 'Show All' : 'Show Mismatch';

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
                  if (tp) {
                    tp.style.display = 'none';
                    tp.querySelectorAll('tr').forEach(row => row.style.display = '');
                  }
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
                  if (tp) {
                    tp.style.display = 'block';
                    // Show ONLY mismatched rows
                    tp.querySelectorAll('tr').forEach(row => {
                      if (row.querySelector('th')) {
                        row.style.display = ''; // Keep header
                      } else if (row.classList.contains('mismatch-row')) {
                        row.style.display = '';
                      } else {
                        row.style.display = 'none';
                      }
                    });
                  }
                } else {
                  tn.style.display = 'none';
                  if (tp) tp.style.display = 'none';
                }
              });
            }
          });
        };

        controls.appendChild(unmatchedBtn);
        // =========================
// SUMMARY BOX
// =========================

const summaryBox =
  document.getElementById('summaryBox');

summaryBox.innerHTML = `
  <div class="summary-title">
    <span>▦</span>
    <span>Schema Overview</span>
  </div>

  <div class="summary-subtitle">
    Summary of row comparison across schemas
  </div>

  <table class="summary-table">

    <tr class="summary-head">
      <th>Status</th>
      <th>Description</th>
    </tr>

    <tr class="summary-green">
      <td class="summary-status">
        <span class="summary-dot" style="background:#22c55e"></span>
        Updated Rows
      </td>

      <td class="summary-desc">
        Rows updated in target
      </td>
    </tr>

    <tr class="summary-red">
      <td class="summary-status">
        <span class="summary-dot" style="background:#ef4444"></span>
        BIN-Map Rows
      </td>

      <td class="summary-desc">
        Rows binary column mapped
      </td>
    </tr>

    <tr class="summary-purple">
      <td class="summary-status">
        <span class="summary-dot" style="background:#7c3aed"></span>
        Mismatched Rows
      </td>

      <td class="summary-desc">
        Rows with mismatched data
      </td>
    </tr>

  </table>
`;
controls.parentNode.insertBefore(summaryBox, controls);
      }
    }


    // =========================
    // MAP COUNTS
    // =========================
    
    setTimeout(() => {

      const payload = readStore();

const totalRows =
  payload.totalRows ||
  payload.total_rows ||
  0;

const dbChip = document.getElementById('dbIdChip');

if (dbChip) {
  dbChip.innerHTML =
    `adworks: ${formatCount(totalRows)} rows`;
}

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

              btn.textContent = 'BIN_Map';

              btn.className = 'binary-btn';

              // SMALL LIGHT BUTTON
              btn.style.cssText = `
       padding: 4px 13px;
  margin-left: 6px;
  margin-right: 8px;
  cursor: pointer;
  border: 1px solid rgba(34,197,94,0.35);
  border-radius: 999px;
  background: rgba(34,197,94,0.10);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #16a34a;
  font-size: 10px;
  font-weight: 700;
  height: auto;
  line-height: normal;
  box-shadow: 0 2px 8px rgba(34,197,94,0.08);
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
      const raw = (t || '').trim();
      const lower = raw.toLowerCase();

      // Special mapped pairs — source → expected target canonical form
      // character varying → VARCHAR(n) family
      if (lower.includes('character varying')) return 'VARCHAR';

      // timestamp without time zone → TIMESTAMP_NTZ
      if (lower.includes('timestamp')) return 'TIMESTAMP_NTZ';

      // character / char(n) → CHAR
      if (lower === 'character' || lower.startsWith('char(') || lower === 'char') return 'CHAR';

      // For everything else — uppercase the source type and strip
      // size qualifiers like (10), (10,2) so INTEGER matches INTEGER etc.
      // This means: integer → INTEGER, smallint → SMALLINT, boolean → BOOLEAN etc.
      let normalized = raw.toUpperCase().trim();

      // Strip size qualifiers e.g. VARCHAR(50) → VARCHAR, NUMBER(10,2) → NUMBER
      normalized = normalized.replace(/\s*\([\d,\s]+\)$/, '').trim();

      // Strip " WITHOUT TIME ZONE" suffix
      normalized = normalized.replace(' WITHOUT TIME ZONE', '').trim();

      // Source-specific expansions that map to Snowflake types
      if (normalized === 'TEXT') return 'STRING';
      if (normalized === 'BYTEA') return 'BINARY';
      if (normalized === 'INTEGER' || normalized === 'INT') return 'INTEGER';
      if (normalized === 'NUMERIC') return 'NUMBER';
      if (normalized === 'TIME') return 'TIME';

      // xml and VARIANT are DIFFERENT — do NOT normalize together
      // xml stays as XML, VARIANT stays as VARIANT → will be flagged as mismatch
      if (normalized === 'XML') return 'XML';
      if (normalized === 'VARIANT') return 'VARIANT';

      return normalized;
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
          tr.classList.add('mismatch-row');

          const isBinMapped = tr.innerText.includes('BIN-MAPPED') || srcType.includes('bin-mapped') || tgtType.includes('bin-mapped');
          const isAtSign = tgtDef.includes('@');

          if (isBinMapped) {
            // RED for bin mapped
            tr.style.backgroundColor = '#fee2e2';
            tr.style.borderLeft = '3px solid #ef4444';
          } else if (isAtSign) {
            // GREEN if target default has @
            tr.style.backgroundColor = '#dcfce7';
            tr.style.borderLeft = '3px solid #22c55e';
          } else {
            // PURPLE mismatch color
            tr.style.backgroundColor = '#ede9fe';
            tr.style.borderLeft = '3px solid #7c3aed';
          }

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