document.addEventListener('DOMContentLoaded', () => {
  const dbIdChip = document.getElementById('dbIdChip');
  const statusNode = document.getElementById('schemaStatus');
  const fetchedAtNode = document.getElementById('schemaFetchedAt');
  const mount = document.getElementById('schemaHtmlMount');

  const dataStr = sessionStorage.getItem('binaryExplorerData');
  if (!dataStr) {
    if (statusNode) statusNode.textContent = 'No binary data found. Run Assessment first.';
    return;
  }

  let data;
  try { data = JSON.parse(dataStr); }
  catch (e) { if (statusNode) statusNode.textContent = 'Invalid binary data.'; return; }

  if (dbIdChip) dbIdChip.textContent = 'db_id: ' + (data.db_id || '--');
  if (fetchedAtNode) fetchedAtNode.textContent = '';
  if (statusNode) statusNode.textContent = 'Binary columns found: Please provide the Coresponding Mappings.';

  let parsedCols = null;
  const raw = data.binaryCols;
  if (typeof raw === 'string') {
    try { parsedCols = JSON.parse(raw.replace(/'/g, '"')); }
    catch (e) { if (statusNode) statusNode.textContent = 'Failed to parse binary columns.'; return; }
  } else {
    parsedCols = raw;
  }

  if (!parsedCols || Object.keys(parsedCols).length === 0) {
    mount.innerHTML = '<p class="text-muted">No binary columns found.</p>';
    return;
  }

  // Controls
  const controls = document.createElement('div');
  controls.className = 'controls';
  controls.innerHTML = `<button onclick="expandAll(true)">Expand All</button><button onclick="expandAll(false)">Collapse All</button>`;
  mount.appendChild(controls);

  window.expandAll = function (open) {
    mount.querySelectorAll('.node').forEach(function (node) {
      const panel = node.nextElementSibling;
      if (!panel) return;
      if (open) { node.classList.add('active'); panel.style.display = 'block'; }
      else { node.classList.remove('active'); panel.style.display = 'none'; }
    });
  };

  const schemas = {};
  for (const [fullTableName, tablesData] of Object.entries(parsedCols)) {
    const parts = fullTableName.split('.');
    const schemaName = parts.length > 1 ? parts[0] : 'public';
    const tableName = parts.length > 1 ? parts.slice(1).join('.') : fullTableName;
    if (!schemas[schemaName]) schemas[schemaName] = {};
    schemas[schemaName][tableName] = { originalKey: fullTableName, data: tablesData };
  }

  for (const [schemaName, tables] of Object.entries(schemas)) {
    const schemaNode = document.createElement('div');
    schemaNode.className = 'node';
    schemaNode.innerHTML = `<span><i class="fa-solid fa-layer-group me-2"></i>Schema: ${schemaName}</span><span style="font-size:12px;font-weight:600;color:#6b6b80">▼</span>`;

    const schemaPanel = document.createElement('div');
    schemaPanel.className = 'panel';

    schemaNode.addEventListener('click', function () {
      schemaNode.classList.toggle('active');
      schemaPanel.style.display = schemaNode.classList.contains('active') ? 'block' : 'none';
      const arrow = schemaNode.querySelector('span:last-child');
      if (arrow) arrow.textContent = schemaNode.classList.contains('active') ? '▲' : '▼';
    });

    for (const [tableName, tableObj] of Object.entries(tables)) {
      const binaryColumns = tableObj.data;
      const originalKey = tableObj.originalKey;

      const tableNode = document.createElement('div');
      tableNode.className = 'node';
      tableNode.style.background = '#eef2ff';
      tableNode.style.border = '1px solid #c7d2fe';
      tableNode.style.marginTop = '10px';
      tableNode.innerHTML = `<span><i class="fa-solid fa-table me-2"></i>Table: ${tableName}</span><span style="font-size:12px;font-weight:600;color:#6b6b80">▼</span>`;

      const tablePanel = document.createElement('div');
      tablePanel.className = 'panel';
      tablePanel.style.marginBottom = '10px';

      tableNode.addEventListener('click', function (e) {
        e.stopPropagation();
        tableNode.classList.toggle('active');
        tablePanel.style.display = tableNode.classList.contains('active') ? 'block' : 'none';
        const arrow = tableNode.querySelector('span:last-child');
        if (arrow) arrow.textContent = tableNode.classList.contains('active') ? '▲' : '▼';
      });

      const colNames = binaryColumns.binary_columns || [];
      const mapCols = binaryColumns.filename_columns || [];
      const vals = binaryColumns.values || [];

      const tbl = document.createElement('table');
      tbl.innerHTML = `
        <thead>
          <tr><th>Source Binary Column</th><th>Mapping Column</th><th>Value</th></tr>
        </thead>
        <tbody></tbody>
      `;
      const tbody = tbl.querySelector('tbody');

      const tableSelects = [];

      colNames.forEach(function (colName, i) {
        const tr = document.createElement('tr');

        const tdSrc = document.createElement('td');
        tdSrc.style.verticalAlign = 'middle';
        tdSrc.textContent = colName;

        const tdMap = document.createElement('td');
        tdMap.style.verticalAlign = 'middle';
        const select = document.createElement('select');
        select.className = 'form-select form-select-sm mapping-dropdown';
        select.dataset.fulltable = originalKey;
        select.dataset.column = colName;
        
        tableSelects.push(select);

        const defOpt = document.createElement('option');
        defOpt.value = "";
        defOpt.disabled = true;
        defOpt.selected = true;
        defOpt.textContent = "Select mapping";
        select.appendChild(defOpt);

        mapCols.forEach(function (mc, j) {
          const opt = document.createElement('option');
          opt.value = j;
          opt.textContent = mc || '—';
          select.appendChild(opt);
        });
        tdMap.appendChild(select);

        const tdVal = document.createElement('td');
        tdVal.style.verticalAlign = 'middle';
        tdVal.textContent = '—';

        select.addEventListener('change', function () {
          tdVal.textContent = vals[parseInt(this.value)] || '—';
          
          const selectedVals = new Set();
          tableSelects.forEach(function(s) {
            if (s.value !== "") selectedVals.add(s.value);
          });
          
          tableSelects.forEach(function(s) {
            Array.from(s.options).forEach(function(opt) {
              if (opt.value === "") return;
              if (selectedVals.has(opt.value) && s.value !== opt.value) {
                opt.disabled = true;
              } else {
                opt.disabled = false;
              }
            });
          });
        });

        tr.appendChild(tdSrc);
        tr.appendChild(tdMap);
        tr.appendChild(tdVal);
        tbody.appendChild(tr);
      });

      if (colNames.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No binary columns.</td></tr>';
      }

      tablePanel.appendChild(tbl);
      schemaPanel.appendChild(tableNode);
      schemaPanel.appendChild(tablePanel);
    }
    mount.appendChild(schemaNode);
    mount.appendChild(schemaPanel);
  }

  document.getElementById('saveMappingBtn').addEventListener('click', function() {
    const selects = document.querySelectorAll('.mapping-dropdown');
    
    // Group selections by table
    const tableMap = new Map();
    selects.forEach(function(sel) {
      if (sel.value === "") return;
      const tbl = sel.dataset.fulltable;
      const col = sel.dataset.column;
      const mappedName = sel.options[sel.selectedIndex].textContent;
      if (mappedName === '—') return;
      if (!tableMap.has(tbl)) tableMap.set(tbl, []);
      tableMap.get(tbl).push(col + ':' + mappedName);
    });

   
    const binColParts = [];
    tableMap.forEach(function(cols, tbl) {
      binColParts.push(tbl + '::' + cols.join(','));
    });
    const binCol = binColParts.join('|');

    const dataStr = sessionStorage.getItem('binaryExplorerData');
    const data = dataStr ? JSON.parse(dataStr) : {};

    const userJson = sessionStorage.getItem('userJson');
    let userId = '';
    try {
      const parsed = JSON.parse((userJson || '').replace(/'/g, '"'));
      userId = parsed?.userid || parsed?.user_id || parsed?.id || '';
    } catch(e) {}

    const payload = {
      user_id: userId,
      db_id: data.db_id || '',
      db_name: data.db_name || '',
      entity: data.entity || '',
      db_type: data.db_type || '',
      bin_col: binCol
    };

    console.log('Saving binary mapping payload:', payload);
    console.log('bin_col format check:', binCol);

    const formBody = Object.keys(payload)
      .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(payload[k]))
      .join('&');

    $.ajax({
      url: 'https://ifssvg72bkhxbrq5n4ejr247e40eiilx.lambda-url.ap-south-1.on.aws',
      type: 'POST',
      data: payload,
      dataType: 'json',
      success: function(result) {
        console.log('Save response:', result);
        alert('Binary mappings saved successfully!');
        const sendApprovalBtn = document.getElementById('sendApprovalBtn');
        if (sendApprovalBtn) {
          sendApprovalBtn.style.display = 'inline-block';
        }
      },
      error: function(xhr, status, err) {
        console.error('Save error:', xhr.responseText || err);
        alert('Failed to save mappings. Check console.');
      }
    });
  });

  
  document.getElementById('sendApprovalBtn').addEventListener('click', function () {
  const dataStr = sessionStorage.getItem('binaryExplorerData');
  const data = dataStr ? JSON.parse(dataStr) : {};
  const dbId = data.db_id || '';

  const approvalUrl = 'http://127.0.0.1:5501/approval.html?db_id=' + encodeURIComponent(dbId);
  console.log("DB ID:", dbId);
  console.log("Approval Link:", approvalUrl);

  const approverEmail = 'kushi.s@livisionit.com';//add to
  const subject = 'Schema & Binary Mapping Approval Required — DB ID: ' + dbId;
 const message =
  'Please review and approve the schema and binary column mappings for database ID: ' + dbId +
  '\n\nClick the link below:\n' +
  approvalUrl;

  const payload = {
    name:    'Livision DataHub',
    email:   approverEmail,
    subject: subject,
    message: message,
  //   msg:
  // '<h3>Migration Approval Required</h3>' +
  // '<p><strong>DB ID:</strong> ' + dbId + '</p>' +
  // '<p>Click below:</p>' +
  // '<p>' + approvalUrl + '</p>'
  };

  const btn = document.getElementById('sendApprovalBtn');
  btn.textContent = 'Sending...';
  btn.disabled = true;

  $.ajax({
    url: 'https://dsmswg6acqfs4tbacgleljmv7a0xubiy.lambda-url.ap-south-1.on.aws/',
    type: 'POST',
    data: payload,
    dataType: 'json',
    success: function (response) {
      console.log('Approval email sent:', response);
      btn.textContent = 'Approval Sent ✓';
      btn.style.background = '#94a3b8';
    },
    error: function (xhr) {
      console.error('Email error:', xhr.responseText);
      btn.textContent = 'Send for Approval';
      btn.disabled = false;
      alert('Failed to send approval email. Please try again.');
    }
  });
});
});
