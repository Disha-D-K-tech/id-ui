(function () {

  const STORAGE_KEY = 'schemaExplorerResults';
  const dbId =
  (sessionStorage.getItem('currentSchemaDbId') || '').trim();

  
  const parseUserJson = (str) => {
    if (!str || typeof str !== 'string') return {};
    try { return JSON.parse(str.replace(/'/g, '"')); } catch (e) { return {}; }
  };


  function getSafeUserId() {
    const direct = sessionStorage.getItem("userid");
    if (direct && direct !== 'undefined' && direct !== 'null' && direct.trim() !== '') {
      return direct.trim();
    }
    const userJson = parseUserJson(sessionStorage.getItem("userJson")) || {};
    const fromJson = userJson.userid || userJson.user_id || userJson.id || '';
    if (fromJson) return String(fromJson).trim();
    return '';
  }

  function getCurrentCompanyName() {
    const companyEl = document.getElementById('companyName');
    const userJson = parseUserJson(sessionStorage.getItem("userJson")) || {};
    const fromDom = companyEl ? companyEl.textContent.trim() : '';
    
    return (fromDom || userJson.company || userJson.company_name || sessionStorage.getItem("company") || 'livision').trim();
  }

  const userJson = parseUserJson(sessionStorage.getItem("userJson"));
  (sessionStorage.getItem('currentSchemaDbId') || '').trim();

const sourceDbName =
(
 sessionStorage.getItem(
   'currentSourceDbName'
 ) || ''
).trim();

const sourceDbType =
(
 sessionStorage.getItem(
   'currentSourceDbType'
 ) || 'postgresql'
)
.trim()
.toLowerCase();
    
  const currentEntity = getCurrentCompanyName();

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
/* =========================
TABLE RESPONSIVE FIX
========================= */

.panel{

  width:100%;

  overflow-x:hidden;

  padding:12px 18px 18px;

  box-sizing:border-box;
}

/* TABLE */

table{
  width:100%;
  table-layout:auto;
  border-collapse:collapse;
}

/* HEADER + DATA CELLS */

table th,
table td{

  padding:10px 12px;

  vertical-align:top;

  text-align:left;

  white-space:normal;

  word-break:break-word;

  overflow-wrap:anywhere;

  line-height:1.5;

  max-width:260px;
}

/* LONG VALUES / URLS / PATHS */

table td{

  font-size:13px;

  color:#1f2937;
}

/* HEADER */

table th{

 
  font-weight:700;

  background:#fefce8;

  color:#5b21b6;

  position:sticky;
  top:0;

  border-bottom:1px solid #ede9fe;
}

/* ROW HEIGHT AUTO */

table tr{
  height:auto;
}
.panel table:not(.summary-table) td:hover{
  background:rgba(99,102,241,0.04);
  transition:.2s;
}
  .panel table td *{
  white-space:normal !important;
  word-break:break-word !important;
  overflow-wrap:anywhere !important;
}
  /* SERIAL NUMBER COLUMN */

/* ONLY MAIN DATA TABLE SERIAL NUMBER */

.panel table:not(.summary-table) th:first-child,
.panel table:not(.summary-table) td:first-child{

  width:55px;
  min-width:55px;
  max-width:55px;

  text-align:center;
}

      .binary-highlight{
        background:#fee2e2 !important;
      }
        /* =========================
DDL MODAL
========================= */

.ddl-modal{
  position:fixed;
  inset:0;
  background:rgba(0,0,0,0.45);
  z-index:99999;

  display:none;
  align-items:center;
  justify-content:center;

  padding:30px;
  box-sizing:border-box;
}

.ddl-modal.open{
  display:flex;
}

.ddl-box{
  width:95%;
  max-width:1400px;
  height:85vh;

  background:white;
  border-radius:24px;

  overflow:hidden;

  display:flex;
  flex-direction:column;

  box-shadow:
    0 20px 60px rgba(0,0,0,0.25);
}

.ddl-header{
  padding:18px 24px;
  background:#6d28d9;
  color:white;

  display:flex;
  align-items:center;
  justify-content:space-between;
}

.ddl-title{
  font-size:18px;
  font-weight:700;
}

.ddl-close{
  cursor:pointer;
  font-size:26px;
  font-weight:bold;
}

.ddl-content{
  flex:1;

  display:grid;
  grid-template-columns:1fr 1fr;

  gap:0;

  overflow:hidden;
}

.ddl-panel{
  overflow:auto;
  background:#0f172a;
}

.ddl-panel-title{
  padding:12px 16px;
  background:#111827;
  color:white;
  font-weight:700;
  border-bottom:1px solid #374151;
}

.ddl-panel pre{
  margin:0;
  padding:20px;
  min-height:100%;
  overflow:auto;
}

.ddl-panel code{
  font-size:13px;
  line-height:1.6;
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
/* =========================
SCHEMA OVERVIEW TOGGLE
========================= */

.summary-toggle{
  width:100%;
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:16px 20px;
  border-radius:22px;
  cursor:pointer;
  user-select:none;

  background:rgba(255,255,255,0.35);

  border:1px solid rgba(168,85,247,0.18);

  backdrop-filter:blur(16px);
  -webkit-backdrop-filter:blur(16px);

  transition:all .28s ease;

  box-shadow:
    0 6px 18px rgba(124,58,237,0.06),
    inset 0 1px 0 rgba(255,255,255,0.55);
}

.summary-toggle:hover{
  transform:translateY(-1px);

  background:rgba(237,233,254,0.55);

  border-color:rgba(124,58,237,0.28);

  box-shadow:
    0 10px 25px rgba(124,58,237,0.10);
}

.summary-toggle.active{
  background:linear-gradient(
    135deg,
    rgba(237,233,254,0.72),
    rgba(255,255,255,0.55)
  );

  border-color:rgba(124,58,237,0.32);
}

.summary-toggle-left{
  display:flex;
  align-items:center;
  gap:12px;
}

.summary-toggle-icon{
  width:34px;
  height:34px;
  border-radius:12px;

  display:flex;
  align-items:center;
  justify-content:center;

  background:rgba(124,58,237,0.10);

  color:#7c3aed;

  font-size:18px;
  font-weight:700;
}

.summary-toggle-text{
  display:flex;
  flex-direction:column;
}

.summary-toggle-title{
  font-size:15px;
  font-weight:800;
  color:#5b21b6;
}

.summary-toggle-sub{
  font-size:12px;
  color:#6b7280;
  margin-top:2px;
}

.summary-arrow{
  font-size:18px;
  color:#7c3aed;
  transition:transform .25s ease;
}

.summary-toggle.active .summary-arrow{
  transform:rotate(180deg);
}

/* CONTENT AREA */

.summary-content{
  overflow:hidden;
  max-height:0;
  opacity:0;

  transition:
    max-height .35s ease,
    opacity .25s ease,
    margin-top .25s ease;
}

.summary-content.open{
  max-height:600px;
  opacity:1;
  margin-top:16px;
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

/* =========================
SUMMARY TABLE
========================= */

.summary-table{
  width:100%;
  border-collapse:separate;
  border-spacing:0 10px;
}

/* HEADER */

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
  padding:15px 18px;
  font-size:14px;
  border:none;
  background-clip:padding-box;
  vertical-align:middle;
}

/* REMOVE HOVER EFFECT */

.summary-table tr:hover td{
  background-color:inherit !important;
}

/* ROW COLORS */

.summary-green td{
  background:rgba(220,252,231,0.72);
}

.summary-red td{
  background:rgba(254,226,226,0.72);
}

.summary-purple td{
  background:rgba(237,233,254,0.72);
}

/* ROUNDED ROWS */

.summary-table tr td:first-child{
  border-top-left-radius:18px;
  border-bottom-left-radius:18px;
}

.summary-table tr td:last-child{
  border-top-right-radius:18px;
  border-bottom-right-radius:18px;
}

/* STATUS CELL */

.summary-status{
  font-weight:800;
  display:flex;
  align-items:center;
  gap:12px;

  white-space:nowrap;
}

/* STATUS COLORS */

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
  width:100%;
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
    if (!document.getElementById('ddlModal')) {

  document.body.insertAdjacentHTML(
    'beforeend',
    `
    <div class="ddl-modal" id="ddlModal">

      <div class="ddl-box">

        <div class="ddl-header">

          <div class="ddl-title" id="ddlTitle">
            Table DDL
          </div>

          <div class="ddl-close"
               id="ddlCloseBtn">
            ×
          </div>

        </div>

        <div class="ddl-content">

          <div class="ddl-panel">

            <div class="ddl-panel-title">
              SOURCE
            </div>

            <pre>
<code class="sql" id="sourceDDL"></code>
            </pre>

          </div>

          <div class="ddl-panel">

            <div class="ddl-panel-title">
              TARGET
            </div>

            <pre>
<code class="sql" id="targetDDL"></code>
            </pre>

          </div>

        </div>

      </div>

    </div>
    `
  );

  document
    .getElementById('ddlCloseBtn')
    .onclick = function () {

      document
        .getElementById('ddlModal')
        .classList.remove('open');
    };
}

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

  // SHOW BIN BUTTON
  hasBinaryBtn.style.display = 'inline-block';

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

  // HIDE BIN BUTTON AGAIN
  const binBtn =
    tableNode.querySelector('.binary-btn');

  if (binBtn) {
    binBtn.style.display = 'none';
  }

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

<div class="summary-toggle" id="summaryToggle">

  <div class="summary-toggle-left">

    <div class="summary-toggle-icon">
      ▦
    </div>

    <div class="summary-toggle-text">

      <div class="summary-toggle-title">
         Legend
      </div>

      <div class="summary-toggle-sub">
        Click to view schema comparison summary
      </div>

    </div>

  </div>

  <div class="summary-arrow">
    ⌄
  </div>

</div>

<div class="summary-content" id="summaryContent">

  <table class="summary-table">

    <tr class="summary-head">
      <th>Status</th>
      <th>Description</th>
    </tr>

    <tr class="summary-green">
      <td class="summary-status">
        <span class="summary-dot"
          style="background:#22c55e"></span>

        Retained Rows
      </td>

      <td class="summary-desc">
        Rows retained in target
      </td>
    </tr>

    <tr class="summary-red">
      <td class="summary-status">

        <span class="summary-dot"
          style="background:#ef4444"></span>

        BIN-Map Rows
      </td>

      <td class="summary-desc">
        Rows binary column mapped
      </td>
    </tr>

    <tr class="summary-purple">
      <td class="summary-status">

        <span class="summary-dot"
          style="background:#7c3aed"></span>

        Mismatched Rows
      </td>

      <td class="summary-desc">
        Rows with mismatched data
      </td>
    </tr>

  </table>

</div>
`;
controls.parentNode.insertBefore(summaryBox, controls);
// =========================
// SUMMARY TOGGLE
// =========================

const summaryToggle =
  document.getElementById('summaryToggle');

const summaryContent =
  document.getElementById('summaryContent');

summaryToggle.onclick = function () {

  const isOpen =
    summaryContent.classList.contains('open');

  if (isOpen) {

    summaryContent.classList.remove('open');

    summaryToggle.classList.remove('active');

  } else {

    summaryContent.classList.add('open');

    summaryToggle.classList.add('active');
  }
};
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
const isBinMappedTable =
  tablePanel &&
  tablePanel.innerHTML.includes('BIN-MAPPED');

if (isBinMappedTable) {
  schemaNode.dataset.hasBinary = "true";
}

// Prevent duplicate buttons
if (!tableNode.querySelector('.ddl-btn')) {

  // =========================
  // DDL BUTTON (ALL TABLES)
  // =========================

  const ddlBtn =
    document.createElement('button');

  ddlBtn.textContent = 'DDL';
  ddlBtn.className = 'ddl-btn';

  ddlBtn.style.cssText = `
    padding:4px 12px;
    border:none;
    border-radius:999px;
    cursor:pointer;
    background:#ede9fe;
    color:#6d28d9;
    font-size:11px;
    font-weight:700;
  `;

  ddlBtn.onclick = function (e) {
  e.stopPropagation();

  const modal = document.getElementById('ddlModal');
  modal.classList.add('open');

  document.getElementById('ddlTitle').innerText = `${schemaName}.${tableName}`;
  document.getElementById('sourceDDL').textContent = 'Loading...';
  document.getElementById('targetDDL').textContent = 'Loading...';

  // Using $.ajax technique from dashboard.js with the 5 required parameters
  // table, schema, db_name, entity, db_type
  $.ajax({
    url: 'https://ond2jedt7gztroeiac2hoclsc4da0fyzlm.lambda-url.ap-south-1.on.aws/',
    type: 'POST',
    crossDomain: true,
    data: {
      table: tableName,
      schema: schemaName,
      db_name: sourceDbName,
      entity: getCurrentCompanyName(), // Fetches 'livision' if present in session/DOM
      db_type: sourceDbType            // e.g., 'postgresql'
    },
    dataType: 'json',
    success: function (result) {
      console.log('DDL RESPONSE SUCCESS', result);

      // store response
      const ddlStoreKey = `ddl_${schemaName}_${tableName}`;
      sessionStorage.setItem(ddlStoreKey, JSON.stringify(result));

      // Extract DDL content with fallbacks
      const sourceDDL = result.source || result.source_ddl || result.sourceDDL || result.ddl || '-- No Source DDL --';
      const targetDDL = result.target || result.target_ddl || result.targetDDL || '-- No Target DDL --';

      // update modal content
      document.getElementById('sourceDDL').textContent = sourceDDL;
      document.getElementById('targetDDL').textContent = targetDDL;

      // update title if message exists
      if (result.message) {
        document.getElementById('ddlTitle').innerText = `${schemaName}.${tableName} - ${result.message}`;
      }

      // Apply syntax highlighting
      if (typeof hljs !== 'undefined') {
        hljs.highlightElement(document.getElementById('sourceDDL'));
        hljs.highlightElement(document.getElementById('targetDDL'));
      }
    },
    error: function (xhr, status, error) {
      console.error('DDL API ERROR', status, error, xhr.status, xhr.responseText);
      document.getElementById('sourceDDL').textContent = 
        `Error ${xhr.status}: ${error || 'Access Denied'}. If you see CORS origin 'null' errors, you MUST use VS Code Live Server instead of opening the HTML file directly.`;
      document.getElementById('targetDDL').textContent = 'Failed to fetch target DDL.';
    }
  });
};
  // =========================
  // RIGHT SIDE CONTAINER
  // =========================

  const span =
    tableNode.querySelector('span');

  const rightBox =
    document.createElement('div');

  rightBox.style.display = 'flex';
  rightBox.style.alignItems = 'center';
  rightBox.style.marginLeft = 'auto';
  rightBox.style.gap = '6px';

  // Remove old count span
  if (span) {
    span.remove();
  }

  // Add DDL button ALWAYS
  rightBox.appendChild(ddlBtn);

  // =========================
  // BIN MAP BUTTON
  // ONLY FOR BIN TABLES
  // =========================

  if (isBinMappedTable) {

    const btn =
      document.createElement('button');

    btn.textContent =
      'BIN_Map';

    btn.className =
      'binary-btn';

    btn.style.cssText = `
      padding:4px 13px;
      margin-left:6px;
      margin-right:8px;
      cursor:pointer;
      border:1px solid rgba(34,197,94,0.35);
      border-radius:999px;
      background:
        rgba(34,197,94,0.10);
      color:#16a34a;
      font-size:10px;
      font-weight:700;
      box-shadow:
        0 2px 8px
        rgba(34,197,94,0.08);
    `;

    btn.style.display = 'none';

    btn.onclick = function (e) {

      e.stopPropagation();

      const isOpen =
        tablePanel.style.display
        === 'block';

      if (isOpen) {

        tablePanel.style.display =
          'none';

        tablePanel
          .querySelectorAll('tr')
          .forEach(row => {

            row.style.display = '';

            row.classList.remove(
              'binary-highlight'
            );
          });

      } else {

        panel.style.display =
          'block';

        tablePanel.style.display =
          'block';

        tableNode.scrollIntoView({
          behavior:'smooth',
          block:'center'
        });

        tablePanel
          .querySelectorAll('tr')
          .forEach(row => {

            if (
              row.querySelector('th')
            ) {
              row.style.display = '';
              return;
            }

            const isRedRow =
              row.style.backgroundColor
              ===
              'rgb(254, 226, 226)' ||
              row.innerText.includes(
                'BIN-MAPPED'
              );

            if (isRedRow) {

              row.style.display = '';

              row.classList.add(
                'binary-highlight'
              );

            } else {

              row.style.display =
                'none';
            }
          });
      }
    };

    rightBox.appendChild(btn);
  }

  // Add count back
  if (span) {
    rightBox.appendChild(span);
  }

  tableNode.appendChild(rightBox);
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

    const opening =
      panel.style.display === 'none' ||
      panel.style.display === '';

    panel.style.display =
      opening ? 'block' : 'none';

    // RESTORE ALL ROWS DURING NORMAL OPEN
    if (opening) {

      panel.querySelectorAll('tr').forEach(row => {

        row.style.display = '';

      });
    }
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