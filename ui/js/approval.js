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

    const dbIdChip     = document.getElementById('dbIdChip');
    const schemaStatus = document.getElementById('schemaStatus');
    const schemaMount  = document.getElementById('schemaMount');
    const binaryStatus = document.getElementById('binaryStatus');
    const binaryMount  = document.getElementById('binaryMount');
    const approveBtn   = document.getElementById('approveBtn');

    dbIdChip.textContent = 'Loading row counts...';

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

            // Binary mapping logic from schema_explorer.js
            if (tablePanel && tablePanel.innerHTML.includes('BIN-MAPPED')) {
              schemaNode.dataset.hasBinary = "true";
              if (!tableNode.querySelector('.binary-btn')) {
                const btn = document.createElement('button');
                btn.textContent = 'Show Binary';
                btn.className = 'binary-btn';
                btn.onclick = function(e) {
                  e.stopPropagation();
                  const isOpen = tablePanel.style.display === 'block';
                  if (isOpen) {
                    tablePanel.style.display = 'none';
                    tablePanel.querySelectorAll('tr').forEach(r => r.classList.remove('binary-highlight'));
                  } else {
                    panel.style.display = 'block';
                    tablePanel.style.display = 'block';
                    tableNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    tablePanel.querySelectorAll('tr').forEach(r => {
                      if (r.innerText.includes('BIN-MAPPED')) r.classList.add('binary-highlight');
                    });
                  }
                };

                // RIGHT SIDE BUTTON + COUNT
                const spanId = schemaName + '.' + tableName + '_c';
                const span = tableNode.querySelector('#' + CSS.escape(spanId));

                const rightBox = document.createElement('div');
                rightBox.style.display = 'flex';
                rightBox.style.alignItems = 'center';
                rightBox.style.marginLeft = 'auto';
                rightBox.style.gap = '6px';

                if (span) {
                  span.remove();
                  rightBox.appendChild(btn);
                  rightBox.appendChild(span);
                } else {
                  rightBox.appendChild(btn);
                }
                tableNode.appendChild(rightBox);
              }
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

    // ── Approve button ─────────────────────────────────────────────────────
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
