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
 ) || 'PostgreSQL'
)
.trim()

    
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

  // Read status from currentSchemaDbStatus or binaryExplorerData session
  const _beData = JSON.parse(sessionStorage.getItem('binaryExplorerData') || '{}');
  const _currentStatus = String(sessionStorage.getItem('currentSchemaDbStatus') || _beData.status || '').trim().toLowerCase();

  // Show binary mapping section below schema for any status beyond "binary col. scanned"
  // i.e. when mapping is done: "binary col. mapped", "pending approval", "data extracted" etc.
  const _showReadOnlyBinary = _currentStatus !== ''
    && _currentStatus !== 'new'
    && _currentStatus !== 'binary col. scanned';

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
.node.table-node{
  position:relative;

  /* enough space for DDL + BIN + count */
  padding-right:170px;
}

.node.table-node .right-actions{

  position:absolute;

  right:18px;   /* SAME distance from right */
  top:50%;

  transform:translateY(-50%);

  display:flex;
  align-items:center;
  

  gap:0px;

  
}

/* COUNT TEXT */

.node.table-node .right-actions span{
margin-left:25px;   /* distance from DDL */
  min-width:42px;

  text-align:right;

  display:inline-block;

  color:#10b981;
  font-weight:700;
}

/* DDL BUTTON */

.ddl-btn{

  min-width:52px;

  text-align:center;
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
   MODERN DDL MODAL
========================= */
/* =========================
DDL DB HEADER
========================= */

.ddl-db-head{

  display:flex;
  align-items:center;

  padding:14px 16px;

  background:#111827;

  border-bottom:1px solid #1e293b;
}

.ddl-db-info{

  display:flex;
  align-items:center;
  gap:10px;

  padding:10px 14px;

  border-radius:14px;

  background:rgba(255,255,255,0.04);

  border:1px solid rgba(255,255,255,0.06);
}

.ddl-db-icon{

  width:30px;
  height:30px;

  object-fit:contain;
}

.ddl-db-info span{

  font-size:15px;
  font-weight:700;

  color:#f8fafc;
}
/* =========================
   PREMIUM GLASS DDL MODAL
========================= */

.ddl-modal{
  position:fixed;
  inset:0;

  display:none;
  align-items:center;
  justify-content:center;

  padding:30px;

  z-index:99999;

  background:
    radial-gradient(circle at top left,
      rgba(168,85,247,.18),
      transparent 35%),

    radial-gradient(circle at bottom right,
      rgba(99,102,241,.18),
      transparent 35%),

    rgba(15,23,42,.20);

  backdrop-filter:blur(18px);
  -webkit-backdrop-filter:blur(18px);
}

.ddl-modal.open{
  display:flex;
}

/* =========================
   MAIN CONTAINER
========================= */

.ddl-box{

  width:94vw;
  max-width:1400px;

  max-height:88vh;

  overflow:hidden;

  border-radius:34px;

  position:relative;

  background:
    linear-gradient(
      135deg,
      rgba(255,255,255,.72),
      rgba(255,255,255,.50)
    );

  border:1px solid rgba(255,255,255,.45);

  backdrop-filter:blur(28px);
  -webkit-backdrop-filter:blur(28px);

  box-shadow:
    0 30px 80px rgba(91,33,182,.18),
    0 10px 40px rgba(15,23,42,.12),
    inset 0 1px 0 rgba(255,255,255,.65);

  display:flex;
  flex-direction:column;
}

/* TOP GLOW */

.ddl-box::before{
  content:"";

  position:absolute;
  top:-120px;
  left:-120px;

  width:320px;
  height:320px;

  border-radius:50%;

  background:
    radial-gradient(
      circle,
      rgba(168,85,247,.30),
      transparent 70%
    );

  pointer-events:none;
}

.ddl-box::after{
  content:"";

  position:absolute;
  right:-120px;
  bottom:-120px;

  width:300px;
  height:300px;

  border-radius:50%;

  background:
    radial-gradient(
      circle,
      rgba(99,102,241,.22),
      transparent 70%
    );

  pointer-events:none;
}

/* =========================
   HEADER
========================= */

.ddl-header{

  height:72px;

  padding:0 28px;

  display:flex;
  align-items:center;
  justify-content:space-between;

  background:
    linear-gradient(
      90deg,
      #7c3aed,
      #8b5cf6,
      #6366f1
    );

  position:relative;

  overflow:hidden;
}

.ddl-header::after{
  content:"";

  position:absolute;
  inset:0;

  background:
    linear-gradient(
      120deg,
      transparent 20%,
      rgba(255,255,255,.14) 50%,
      transparent 80%
    );

  animation:shine 5s linear infinite;
}

@keyframes shine{
  from{
    transform:translateX(-100%);
  }
  to{
    transform:translateX(100%);
  }
}

.ddl-title{

  display:flex;
  align-items:center;
  gap:12px;

  color:white;

  font-size:18px;
  font-weight:800;

  position:relative;
  z-index:2;
}

/* =========================
   CLOSE BUTTON
========================= */

.ddl-close{

  width:40px;
  height:40px;

  border-radius:14px;

  display:flex;
  align-items:center;
  justify-content:center;

  cursor:pointer;

  color:white;

  font-size:22px;
  font-weight:300;

  background:
    rgba(255,255,255,.16);

  border:
    1px solid rgba(255,255,255,.22);

  transition:.25s ease;

  position:relative;
  z-index:2;
}

.ddl-close:hover{

  transform:scale(1.08) rotate(90deg);

  background:
    rgba(255,255,255,.26);
}

/* =========================
   FLOW SECTION
========================= */

.ddl-flow{

  display:flex;
  align-items:center;
  justify-content:center;

  gap:26px;

  padding:20px 24px;

  background:
    rgba(255,255,255,.28);

  border-bottom:
    1px solid rgba(255,255,255,.45);

  backdrop-filter:blur(14px);
}

/* DB CHIP */

.ddl-db-chip{

  display:flex;
  align-items:center;
  gap:14px;

  padding:14px 22px;

  border-radius:22px;

  background:
    linear-gradient(
      135deg,
      rgba(255,255,255,.70),
      rgba(255,255,255,.40)
    );

  border:
    1px solid rgba(255,255,255,.55);

  box-shadow:
    0 8px 20px rgba(124,58,237,.08);

  transition:.25s ease;
}

.ddl-db-chip:hover{

  transform:
    translateY(-3px)
    scale(1.02);

  box-shadow:
    0 12px 28px rgba(124,58,237,.14);
}

.ddl-db-chip img{

  width:34px;
  height:34px;

  object-fit:contain;
}

.ddl-db-chip span{

  font-size:15px;
  font-weight:800;

  color:#111827;
}

/* FLOW ICON */

.ddl-flow-arrow{

  font-size:34px;
  font-weight:900;

  color:#f97316;

  transform:translateY(-2px);
}

/* =========================
   CONTENT
========================= */

.ddl-content{

  flex:1;

  display:grid;

  grid-template-columns:1fr 1fr;

  gap:18px;

  padding:20px;

  overflow:hidden;
}

/* =========================
   PANELS
========================= */

.ddl-panel{

  display:flex;
  flex-direction:column;

  min-height:0;
}

/* TITLE */

.ddl-panel-title{

  padding:16px 18px;

  border-radius:22px 22px 0 0;

  background:
    linear-gradient(
      135deg,
      rgba(255,255,255,.62),
      rgba(255,255,255,.38)
    );

  border:
    1px solid rgba(255,255,255,.50);

  border-bottom:none;

  font-size:12px;
  font-weight:900;

  letter-spacing:.18em;

  color:#64748b;
}

/* CODE BLOCK */

.ddl-panel pre{

  flex:1;

  margin:0;

  overflow:auto;

  padding:26px;

  border-radius:
    0 0 26px 26px;

  background:
    linear-gradient(
      180deg,
      rgba(255,255,255,.62),
      rgba(255,255,255,.36)
    );

  border:
    1px solid rgba(255,255,255,.52);

  border-top:none;

  backdrop-filter:blur(18px);

  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.45);
}

/* CODE */

.ddl-panel code{

  display:block;

  color:#0f172a;

  font-size:13px;

  line-height:1.9;

  white-space:pre-wrap !important;

  word-break:break-word;

  overflow-wrap:anywhere;

  font-family:
    "JetBrains Mono",
    monospace;
}

/* =========================
   HIGHLIGHT COLORS
========================= */

.hljs{
  background:transparent !important;
  color:#0f172a !important;
}

.hljs-keyword{
  color:#ff6b57 !important;
  font-weight:700;
}

.hljs-string{
  color:#60a5fa !important;
}

.hljs-number{
  color:#fb7185 !important;
}

.hljs-built_in{
  color:#8b5cf6 !important;
}

/* =========================
   SCROLLBAR
========================= */

.ddl-panel pre::-webkit-scrollbar{
  width:6px;
  height:6px;
}

.ddl-panel pre::-webkit-scrollbar-thumb{

  background:
    linear-gradient(
      180deg,
      rgba(124,58,237,.45),
      rgba(99,102,241,.45)
    );

  border-radius:20px;
}

/* =========================
   MOBILE
========================= */

@media(max-width:950px){

  .ddl-box{
    width:96vw;
    max-height:90vh;
  }

  .ddl-content{
    grid-template-columns:1fr;
  }

  .ddl-flow{
    gap:14px;
  }

  .ddl-db-chip{
    padding:12px 16px;
  }
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

    <!-- HEADER -->

    <div class="ddl-header">

      <div class="ddl-title">

        <lord-icon
          src="https://cdn.lordicon.com/jectmwqf.json"
          trigger="loop"
          delay="2000"
          colors="primary:#ffffff,secondary:#ddd6fe"
          style="width:28px;height:28px">
        </lord-icon>

        <span>Table DDL Comparison</span>

      </div>

      <div class="ddl-close" id="ddlCloseBtn">
        ×
      </div>

    </div>

    <!-- SOURCE → TARGET -->

    <div class="ddl-flow">

      <div class="ddl-db-chip">

        <img
          id="sourceDbIcon"
          src=""
          alt=""
        />

        <span id="sourceDbLabel">
          PostgreSQL
        </span>

      </div>

      <div class="ddl-flow-arrow">
        →
      </div>

      <div class="ddl-db-chip">

        <img
          id="targetDbIcon"
          src=""
          alt=""
        />

        <span id="targetDbLabel">
          Snowflake
        </span>

      </div>

    </div>

    <!-- CONTENT -->

    <div class="ddl-content">

      <!-- SOURCE -->

      <div class="ddl-panel">

        <div class="ddl-panel-title">
          SOURCE DDL
        </div>

        <pre>
<code class="sql" id="sourceDDL"></code>
        </pre>

      </div>

      <!-- TARGET -->

      <div class="ddl-panel">

        <div class="ddl-panel-title">
          TARGET DDL
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

            // Unmatched mode 
            if (!unmatchedSchemas.has(schemaNode)) {
              schemaNode.style.display = 'none';
              if (schemaPanel) schemaPanel.style.display = 'none';
              return;
            }

            
            schemaNode.style.display = 'flex';
            if (schemaPanel) {
              schemaPanel.style.display = 'block';

              
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

  const modal =
    document.getElementById('ddlModal');

  modal.classList.add('open');

  document.getElementById('sourceDDL').textContent =
    'Loading...';

  document.getElementById('targetDDL').textContent =
    'Loading...';

   const sourceType =
    sessionStorage.getItem('currentSourceDbType')
    || 'PostgreSQL';

  const targetType = 'Snowflake';

  const dbIcons = {

    PostgreSQL:
      'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg',

    Snowflake:
      'snowflake-logo.png',

    MySQL:
      'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg',

    Oracle:
      'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/oracle/oracle-original.svg'
  };

  // SOURCE
  document.getElementById('sourceDbLabel')
    .textContent = sourceType;

  document.getElementById('sourceDbIcon')
    .src = dbIcons[sourceType] || dbIcons.PostgreSQL;

  // TARGET
  document.getElementById('targetDbLabel')
    .textContent = targetType;

  document.getElementById('targetDbIcon')
    .src = dbIcons[targetType]; 
const dbId = sessionStorage.getItem('currentSchemaDbId');
const dbType = sessionStorage.getItem('currentSourceDbType');
const dbName = sessionStorage.getItem('currentSourceDbName');

function getSafeUserId() {
    const direct = sessionStorage.getItem("userid");

    if (
        direct &&
        direct !== 'undefined' &&
        direct !== 'null' &&
        direct.trim() !== ''
    ) {
        return direct.trim();
    }

    try {
        const userJson = JSON.parse(
            (sessionStorage.getItem("userJson") || '{}')
                .replace(/'/g, '"')
        );

        return String(
            userJson.userid ||
            userJson.user_id ||
            userJson.id ||
            ''
        ).trim();

    } catch (e) {
        return '';
    }
}

function getCurrentCompanyName() {
    return (
        sessionStorage.getItem("company") ||
        "Welcome"
    ).trim();
}

$.ajax({
    url: 'https://d2jedt7gztroeiac2hoclsc4da0fyzlm.lambda-url.ap-south-1.on.aws/',
    type: 'POST',

    data: {
        table: tableName,
        schema: schemaName,
        db_name: dbName,
        entity: getCurrentCompanyName(),
        db_type: dbType
    },

    success: function(response) {

    console.log(response);

    const sourceEl =
      document.getElementById('sourceDDL');

    const targetEl =
      document.getElementById('targetDDL');

    sourceEl.textContent =
      response.source || '-- No Source DDL --';

    targetEl.textContent =
      response.target || '-- No Target DDL --';

    // RESET HIGHLIGHT.JS
    sourceEl.removeAttribute('data-highlighted');
    targetEl.removeAttribute('data-highlighted');

    sourceEl.innerHTML =
      sourceEl.textContent;

    targetEl.innerHTML =
      targetEl.textContent;

    // APPLY AGAIN
    hljs.highlightElement(sourceEl);
    hljs.highlightElement(targetEl);
},

    error: function(xhr) {

        console.log(xhr.responseText);

        document.getElementById('sourceDDL').textContent =
            'API Error';

        document.getElementById('targetDDL').textContent =
            'API Error';
    }
})};
 
  // =========================
  // RIGHT SIDE CONTAINER
  // =========================

  const span =
    tableNode.querySelector('span');

  const rightBox =
    document.createElement('div');

rightBox.className = 'right-actions';

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

    // Show read-only binary mappings below schema
    // Only when binary mapping is done (status is beyond "binary col. scanned")
    if (!_showReadOnlyBinary) return;

    const BINARY_READ_URL = 'https://zw2ahet7yyteveqhv53euau5ym0obgpj.lambda-url.ap-south-1.on.aws';

    const binarySection = document.createElement('div');
    binarySection.style.cssText = 'margin-top:32px;';
    binarySection.innerHTML = `
      <div style="font-size:15px;font-weight:800;color:#5b3ed6;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
        <i class="fa-solid fa-table-columns"></i> Binary Column Mappings
      </div>
      <div id="readOnlyBinaryStatus" style="padding:12px 16px;border-radius:10px;background:rgba(124,99,255,0.08);color:#334155;font-weight:600;margin-bottom:12px;">
        Loading binary mappings...
      </div>
      <div id="readOnlyBinaryMount"></div>
    `;
    mountNode.parentNode.appendChild(binarySection);

    fetch(BINARY_READ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ db_id: dbId })
    })
    .then(r => r.json())
    .then(function(data) {
      const binaryStatusEl = document.getElementById('readOnlyBinaryStatus');
      const binaryMountEl  = document.getElementById('readOnlyBinaryMount');
      if (binaryStatusEl) binaryStatusEl.style.display = 'none';

      const binCols = data.bin_cols || [];

      if (!binCols.length) {
        if (binaryMountEl) binaryMountEl.innerHTML = '<p style="color:#94a3b8;font-size:13px;">No binary columns mapped for this database.</p>';
        return;
      }

      let rowsHtml = '';
      binCols.forEach(function(col) {
        rowsHtml += `
          <tr>
            <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#5b3ed6;">${col.schema || '—'}.${col.table || '—'}</td>
            <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;">${col.column_name || '—'}</td>
            <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;">${col.binary_type || '—'}</td>
            <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;">
              <span style="display:inline-flex;padding:3px 10px;border-radius:999px;background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;font-size:11px;font-weight:700;">
                ${col.mapping_column || '—'}
              </span>
            </td>
          </tr>`;
      });

      if (binaryMountEl) {
        binaryMountEl.innerHTML = `
          <div style="border:1px solid rgba(120,110,220,0.15);border-radius:12px;overflow:hidden;">
            <table style="width:100%;border-collapse:collapse;background:white;font-size:13px;text-align:left;">
              <thead style="background:#f8fafc;border-bottom:1px solid #e2e8f0;color:#334155;">
                <tr>
                  <th style="padding:12px 16px;font-weight:700;">Table</th>
                  <th style="padding:12px 16px;font-weight:700;">Binary Column</th>
                  <th style="padding:12px 16px;font-weight:700;">Type</th>
                  <th style="padding:12px 16px;font-weight:700;">Mapped To</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>`;
      }
    })
    .catch(function(err) {
      console.error('Read-only binary fetch error:', err);
      const binaryStatusEl = document.getElementById('readOnlyBinaryStatus');
      if (binaryStatusEl) binaryStatusEl.innerHTML = '<b style="color:#dc2626">Failed to load binary mappings.</b>';
    });
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