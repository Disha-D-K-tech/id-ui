const SCHEMA_API_URL = 'https://dpm44skvaxno5gkzadi3kpodyu0vfzct.lambda-url.ap-south-1.on.aws';
    const BINARY_API_URL = 'https://zw2ahet7yyteveqhv53euau5ym0obgpj.lambda-url.ap-south-1.on.aws';

    const params = new URLSearchParams(window.location.search);
    let userId = '', dbId = '', dbName = '', entity = '', dbType = '';

    let approverEmail = '';

    const token = params.get('token');
    if (token) {
      try {
        const decoded = JSON.parse(atob(decodeURIComponent(token)));
        userId        = decoded.user_id       || '';
        dbId          = decoded.db_id         || '';
        dbName        = decoded.db_name       || '';
        entity        = decoded.entity        || '';
        dbType        = decoded.db_type       || '';
        approverEmail = decoded.approver_email || '';
      } catch(e) {
        console.error('Failed to decode token:', e);
      }
    } else {
      // fallback for direct URL params
      dbId   = params.get('db_id') || params.get('db') || '';
      dbName = params.get('db_name') || '';
      entity = params.get('entity') || '';
      dbType = params.get('db_type') || '';
    }

    console.log('Approver email decoded from token:', approverEmail);
    console.log('Final Approval Parameters:', { userId, dbId, dbName, entity, dbType });

    // ── STATUS GATE — check if already approved before loading page ──────────
    const FETCH_DB_URL = 'https://dkg2bnh5lu4vregv4of3sbbite0arjgx.lambda-url.ap-south-1.on.aws/';

    fetch(FETCH_DB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ user_id: userId })
    })
    .then(r => r.json())
    .then(function(response) {
      const raw = Array.isArray(response?.databases) ? response.databases
        : Array.isArray(response) ? response
        : Array.isArray(response?.data) ? response.data
        : [];

      // Find the record matching our dbId
      let matchedStatus = '';
      raw.forEach(function(row) {
        if (Array.isArray(row)) {
          const rowId = String(row[1] || '').trim();
          if (rowId === String(dbId).trim()) {
            matchedStatus = String(row[5] || '').trim().toLowerCase();
          }
        } else if (row && typeof row === 'object') {
          const rowId = String(row.id || row.bu_id || row.db_id || '').trim();
          if (rowId === String(dbId).trim()) {
            matchedStatus = String(row.status || '').trim().toLowerCase();
          }
        }
      });

      console.log('Approval page — matched DB status:', matchedStatus);
      const blockedStatuses = [
        'Data Extracted', 'Data Extrated'
      ];
      const isAlreadyApproved = blockedStatuses.some(s => matchedStatus.includes(s.toLowerCase()));

      if (isAlreadyApproved) {
        // Replace entire page content with "already approved" message
        document.querySelector('main.main').innerHTML = `
          <div style="
            display:flex;flex-direction:column;align-items:center;justify-content:center;
            min-height:60vh;text-align:center;gap:16px;
          ">
            <div style="
              width:72px;height:72px;border-radius:50%;
              background:linear-gradient(135deg,#bbf7d0,#86efac);
              display:flex;align-items:center;justify-content:center;
              box-shadow:0 8px 24px rgba(34,197,94,0.2);
            ">
              <i class="fa-solid fa-circle-check" style="font-size:32px;color:#15803d;"></i>
            </div>
            <div style="font-size:22px;font-weight:800;color:#5b3ed6;">Approval Already Completed</div>
            <div style="font-size:15px;color:#6b7280;max-width:420px;line-height:1.6;">
              This migration request has already been reviewed and approved.
            </div>
          </div>
        `;
        return;
      }
      loadApprovalPage();
    })
    .catch(function(err) {
      console.error('Status gate fetch error:', err);
      loadApprovalPage();
    });

    const dbIdChip     = document.getElementById('dbIdChip');
    const schemaStatus = document.getElementById('schemaStatus');
    const schemaMount  = document.getElementById('schemaMount');
    const binaryStatus = document.getElementById('binaryStatus');
    const binaryMount  = document.getElementById('binaryMount');
    const approveBtn   = document.getElementById('approveBtn');

    dbIdChip.textContent = 'Loading row counts...';

function loadApprovalPage() {
   if (!dbId) {
  schemaStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color:#dc2626"></i> No db_id found in URL.';
  binaryStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color:#dc2626"></i> No db_id found in URL.';
} else {

    let schemaLoaded = false;
    let binaryLoaded = false;
    let binaryMode = false;

    const topBinaryBtn = document.getElementById('topBinaryBtn');
    if (topBinaryBtn) {
      topBinaryBtn.onclick = function() {
        binaryMode = !binaryMode;
        this.innerHTML = binaryMode 
          ? '<i class="fa-solid fa-eye-slash" style="margin-right: 4px;"></i> Show All' 
          : '<i class="fa-solid fa-eye" style="margin-right: 4px;"></i> Show Binary Only';
        
        schemaMount.querySelectorAll('.node.schema-node').forEach(schemaNode => {
          const panel = schemaNode.nextElementSibling;
          if (binaryMode) {
            if (schemaNode.dataset.hasBinary === "true") {
              schemaNode.style.display = 'flex';
              if (panel) panel.style.display = 'block';
            } else {
              schemaNode.style.display = 'none';
              if (panel) panel.style.display = 'none';
            }
          } else {
            schemaNode.style.display = 'flex';
            if (panel) panel.style.display = 'none';
          }
        });
      };
    }

    let unmatchedMode = false;
    const topUnmatchedBtn = document.getElementById('topUnmatchedBtn');
    if (topUnmatchedBtn) {
      topUnmatchedBtn.onclick = function() {
        unmatchedMode = !unmatchedMode;
        this.innerText = unmatchedMode ? 'Show All' : 'Show Unmatched';
        
        const unmatchedTables = schemaMount._unmatchedTables || new Set();
        const unmatchedSchemas = schemaMount._unmatchedSchemas || new Set();

        schemaMount.querySelectorAll('.node.schema-node').forEach(schemaNode => {
          const schemaPanel = schemaNode.nextElementSibling;
          if (!unmatchedMode) {
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
    }

    function checkAllLoaded() {
      if (schemaLoaded && binaryLoaded) {
        approveBtn.disabled = false;
        document.getElementById('rejectBtn').disabled = false;
      }
    }

    // ── Parse table counts helper ──────────────────────────────────────────
    function parseAndInjectCounts(raw, mount) {
      if (!raw) return;
      try {
        const cleaned = raw
          .replace(/'/g, '"').replace(/\(/g, '[').replace(/\)/g, ']')
          .replace(/\bNone\b/g, 'null').replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false');
        const counts = (JSON.parse(cleaned).table_counts || []);
        const countMap    = new Map();
        const schemaTotals = new Map();
        counts.forEach(function(e) {
          if (!Array.isArray(e) || !e[0]) return;
          const key   = String(e[0]);
          const count = Number(e[1]) || 0;
          countMap.set(key, count);
          const schema = key.split('.')[0];
          schemaTotals.set(schema, (schemaTotals.get(schema) || 0) + count);
        });
        countMap.forEach(function(count, key) {
          const el = mount.querySelector('[id="' + key + '_c"]');
          if (el) el.textContent = ' ' + count.toLocaleString();
        });
        schemaTotals.forEach(function(total, schema) {
          const el = mount.querySelector('[id="' + schema + '_c"]');
          if (el) el.textContent = ' ' + total.toLocaleString();
        });
      } catch(e) {
        console.warn('Failed to inject counts:', e);
      }
    }

    // ── 1. Schema API ──────────────────────────────────────────────────────
   
    function injectSchemaHtml(html) {
      schemaStatus.style.display = 'none';
      schemaMount.innerHTML = html;

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
    }


      // Re-execute injected scripts
      schemaMount.querySelectorAll('script').forEach(function(old) {
        const s = document.createElement('script');
        s.textContent = old.textContent;
        document.body.appendChild(s);
        document.body.removeChild(s);
      });

      // Remove duplicate schema nodes (same logic as schema_explorer.js)
      var seen = new Set();
      schemaMount.querySelectorAll('.node.schema-node').forEach(function(node) {
        var name = node.innerText.toLowerCase().replace('schema:', '').split('(')[0].trim();
        if (!name || seen.has(name)) {
          if (node.nextElementSibling && node.nextElementSibling.classList.contains('panel')) node.nextElementSibling.remove();
          node.remove();
        } else { seen.add(name); }
      });

      schemaLoaded = true;
      checkAllLoaded();
    }

    function formatCount(num) {
      if (num === 0) return "—";
      if (num >= 1_000_000) return Math.floor(num / 1_000_000) + "M";
      if (num >= 1_000) return Math.floor(num / 1_000) + "K";
      return num.toString();
    }

    // Apply row counts and binary logic (aligned with schema_explorer.js)
    function applySchemaRowCounts(tableCountsRaw) {
      if (!tableCountsRaw) return;

      setTimeout(function() {
        let tableMap = {};
        try {
          const dataStr = typeof tableCountsRaw === 'string'
            ? tableCountsRaw.replace(/\(/g, '[').replace(/\)/g, ']').replace(/'/g, '"').replace(/,\s*]/g, ']')
            : JSON.stringify(tableCountsRaw);
          const parsed = JSON.parse(dataStr);
          const list = parsed.table_counts || (Array.isArray(parsed) ? parsed : []);
          list.forEach(function(entry) {
            tableMap[entry[0].toLowerCase().trim()] = parseInt(entry[1]) || 0;
          });
        } catch(e) {
          console.error('Approval: table-counts parse error', e);
          return;
        }

        schemaMount.querySelectorAll('.node.schema-node').forEach(function(schemaNode) {
          const panel = schemaNode.nextElementSibling;
          if (!panel) return;

          const schemaName = schemaNode.innerText.toLowerCase().replace('schema:', '').split('(')[0].trim();
          let schemaTotal = 0;

          panel.querySelectorAll('.node.table-node').forEach(function(tableNode) {
            const tableName = tableNode.innerText.toLowerCase().replace('table:', '').split('(')[0].trim();
            const key = schemaName + '.' + tableName;
            const count = tableMap[key] || 0;
            schemaTotal += count;

            const tablePanel = tableNode.nextElementSibling;

            // DDL and Binary logic
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

            // Table Count Display
            const spanId = schemaName + '.' + tableName + '_c';
            const span = tableNode.querySelector('#' + CSS.escape(spanId));
            if (span) {
              span.textContent = formatCount(count);
              span.style.cssText = 'color:#10b981; font-weight:bold; margin-left:auto;';
            }
          });

          // Update Schema name span
          let schemaSpan = schemaNode.querySelector('span');
          if (schemaSpan) {
            schemaSpan.textContent = formatCount(schemaTotal);
            schemaSpan.style.cssText = 'color: #6366f1; font-weight: bold; margin-left: auto;';
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

        schemaMount.querySelectorAll('.panel table tr').forEach(tr => {
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

            const tablePanel = tr.closest('.panel');
            if (tablePanel) {
              const tableNode = tablePanel.previousElementSibling;
              if (tableNode && tableNode.classList.contains('table-node')) {
                unmatchedTables.add(tableNode);
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

        schemaMount._unmatchedTables = unmatchedTables;
        schemaMount._unmatchedSchemas = unmatchedSchemas;
      }, 600);
    }

    window.toggle = function (el) {
      const panel = el.nextElementSibling;
      if (panel) {
        panel.style.display = (panel.style.display === 'none' || panel.style.display === '') ? 'block' : 'none';
      }
    };

    window.expandAll = function (expand) {
      schemaMount.querySelectorAll('.node.schema-node').forEach(schemaNode => {
        const schemaPanel = schemaNode.nextElementSibling;
        if (schemaPanel) schemaPanel.style.display = expand ? 'block' : 'none';
        schemaPanel?.querySelectorAll('.node.table-node').forEach(tableNode => {
          const tablePanel = tableNode.nextElementSibling;
          if (tablePanel) tablePanel.style.display = 'none';
        });
      });
    };

    // Always fetch schema from API
    console.log('Fetching schema from API for db_id:', dbId);
    fetch(SCHEMA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ db_id: dbId })
    })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      injectSchemaHtml(html);
    })
    .catch(function(err) {
      console.error('Schema API error:', err);
      schemaStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color:#dc2626"></i> Failed to load schema.';
    });

    // ── 2. Binary API ──────────────────────────────────────────────────────
    fetch(BINARY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ db_id: dbId })
    })
  
    .then(r => r.json())
    .then(function(data) {
  binaryStatus.style.display = 'none';

  const binCols = data.bin_cols || [];

  if (!binCols.length) {
    binaryMount.innerHTML = '<p style="color:#94a3b8;font-size:13px;">No binary columns found for this database.</p>';
    binaryLoaded = true;
    checkAllLoaded();
    return;
  }

  let rowsHtml = '';
  binCols.forEach(function(col) {
    rowsHtml += `
      <tr>
        <td>${col.schema || '—'}.${col.table || '—'}</td>
        <td>${col.column_name || '—'}</td>
        <td>${col.binary_type || '—'}</td>
        <td><span class="badge-green">${col.mapping_column || '—'}</span></td>
      </tr>`;
  });

  binaryMount.innerHTML = `
    <div style="border:1px solid rgba(120,110,220,0.15);border-radius:12px;overflow:hidden;">
      <table class="binary-table">
        <thead>
          <tr>
            <th>Table</th>
            <th>Binary Column</th>
            <th>Type</th>
            <th>Mapped To</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;

  binaryLoaded = true;
  checkAllLoaded();
})
    .catch(function(err) {
      console.error('Binary API error:', err);
      binaryStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color:#dc2626"></i> Failed to load binary mappings.';
    });

    // ── Status Reader — row counts ─────────────────────────────────────────
    const STATUS_READER_URL = 'https://f3pt5mhs4renqnqqcf24q4hudy0mkdpx.lambda-url.ap-south-1.on.aws';

    fetch(STATUS_READER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        db_id:   dbId,
        user_id: userId,
        db_name: dbName,
        entity:  entity,
        db_type: dbType
      })
    })
    .then(function(r) {
      const text = r.text();
      return text;
    })
    .then(function(text) {
      console.log('Status reader raw response:', text);
      let res;
      try {
        res = JSON.parse(text);
      } catch(e) {
        console.error('Status reader returned non-JSON:', text);
        return;
      }
      return res;
    })
    .then(function(res) {
      if (!res) return;
      console.log('Approval status_reader response:', res);

      if (!res || !res.status || !Array.isArray(res.status)) return;

      const items = res.status;
      const typeStats = new Map();
      const icons = {
        tables: 'fa-table',
        views: 'fa-eye',
        functions: 'fa-code',
        sequences: 'fa-list-ol',
        unknown: 'fa-database'
      };

      items.forEach(function(item) {
        const type = (item.type || 'unknown').toLowerCase();
        if (!typeStats.has(type)) typeStats.set(type, { total: 0, extracted: 0 });
        typeStats.get(type).total++;
        if (item.status && item.status.includes('Extracted') && !item.status.includes('in Progress')) {
          if (type !== 'sequences') typeStats.get(type).extracted++;
          else typeStats.get(type).extracted++;
        } else if (type === 'sequences') {
          typeStats.get(type).extracted++;
        }
      });

      // Top stats bar is populated below

      // Render all 4 type stats into one purple band
      const band = document.getElementById('topStatBand');
      if (band) {
        band.innerHTML = '';
        typeStats.forEach(function(stats, type) {
          const iconClass = icons[type] || icons.unknown;
          const displayCount = type === 'sequences' ? stats.total : stats.extracted;
          const item = document.createElement('div');
          item.className = 'd-flex align-items-center gap-2';
          item.innerHTML =
            '<i class="fa-solid ' + iconClass + ' text-white" style="font-size:13px;"></i>' +
            '<span class="text-white fw-bold" style="font-size:13px;">' + displayCount + ' ' + type.charAt(0).toUpperCase() + type.slice(1) + '</span>';
          // Add a subtle divider between items (except last)
          if (band.children.length > 0) {
            const divider = document.createElement('span');
            divider.className = 'text-white-50';
            divider.style.cssText = 'font-size:16px;font-weight:300;margin:0 2px;';
            divider.textContent = '|';
            band.appendChild(divider);
          }
          band.appendChild(item);
        });
        band.style.removeProperty('display');
        band.style.display = 'flex';
      }

      // parse table counts 
      if (res['table-counts']) {
        try {
          const cleaned = res['table-counts']
            .replace(/'/g, '"').replace(/\(/g, '[').replace(/\)/g, ']')
            .replace(/\bNone\b/g, 'null').replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false');
          const parsed = JSON.parse(cleaned);
          const tableCounts = parsed.table_counts || [];
          let grandTotal = 0;
          tableCounts.forEach(function(e) { grandTotal += (Number(e[1]) || 0); });
          console.log('Approval grand total rows:', grandTotal);

          // Display grand total 
          const displayDbName = dbName || dbId || 'DB';
          dbIdChip.innerHTML = '<b>' + displayDbName + '</b>: ' + grandTotal.toLocaleString() + ' total rows';

          // Apply per-schema row counts to schema nodes
          applySchemaRowCounts(res['table-counts']);
        } catch(e) {
          console.warn('Failed to parse table-counts in approval:', e);
          dbIdChip.textContent = 'Row counts unavailable';
        }
      } else {
        dbIdChip.textContent = 'No row count data';
      }
    })
    .catch(function(err) {
      console.error('Status reader error in approval:', err);
    });

    //Approve button 
    approveBtn.addEventListener('click', function() {
      approveBtn.disabled = true;
      approveBtn.innerHTML = '<i class="fa-solid fa-circle-check" style="margin-right:8px;"></i>Approving...';

      const approvePayload = {
        user_id:        userId,
        db_id:          dbId,
        db_name:        dbName,
        entity:         entity,
        db_type:        dbType,
        //approver_email: approverEmail,
        action:         'Approve'
      };
      console.log('Approving with payload:', approvePayload);

      $.ajax({
        url: 'https://su3rzuuudmlk7cqzgegv5jwcfm0xiigk.lambda-url.ap-south-1.on.aws/',
        type: 'POST',
        data: approvePayload,
        dataType: 'json',
        success: function(response) {
          console.log('Approve response:', response);
          approveBtn.innerHTML = '<i class="fa-solid fa-circle-check" style="margin-right:8px;"></i>Approved';
          approveBtn.style.background = '#94a3b8';
        },
        error: function(xhr) {
          console.error('Approve error:', xhr.responseText);
          approveBtn.disabled = false;
          approveBtn.innerHTML = '<i class="fa-solid fa-check" style="margin-right:8px;"></i>Approve';
          alert('Failed to approve. Please try again.');
        }
      });
    });

    document.getElementById('rejectBtn').addEventListener('click', function() {
      const rejectBtn = document.getElementById('rejectBtn');
      rejectBtn.disabled = true;
      approveBtn.disabled = true;
      rejectBtn.innerHTML = '<i class="fa-solid fa-circle-xmark" style="margin-right:8px;"></i>Rejected';
      rejectBtn.style.background = '#94a3b8';

      const rejectPayload = {
        user_id:        userId,
        db_id:          dbId,
        db_name:        dbName,
        entity:         entity,
        db_type:        dbType,
        //approver_email: approverEmail,
        action:         'Reject'
      };
      console.log('Rejecting with payload:', rejectPayload);

      $.ajax({
        url: 'https://su3rzuuudmlk7cqzgegv5jwcfm0xiigk.lambda-url.ap-south-1.on.aws/',
        type: 'POST',
        data: rejectPayload,
        dataType: 'json',
        success: function(response) {
          console.log('Reject response:', response);
          rejectBtn.innerHTML = '<i class="fa-solid fa-circle-xmark" style="margin-right:8px;"></i>Rejected';
          rejectBtn.style.background = '#94a3b8';
        },
        error: function(xhr) {
          console.error('Reject error:', xhr.responseText);
          rejectBtn.disabled = false;
          approveBtn.disabled = false;
          rejectBtn.innerHTML = '<i class="fa-solid fa-xmark" style="margin-right:8px;"></i>Reject';
          alert('Failed to reject. Please try again.');
        }
      });
    });
}
} 
}