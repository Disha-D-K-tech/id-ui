(function () {

  console.log('migration-status.js loaded');

  const dbId =
    (sessionStorage.getItem('migrationDbId') || '').trim();

  const responseBox =
    document.getElementById('migrationResponse');

  const loadingBox =
    document.getElementById('migrationLoading');

  function loadMigrationStatus() {

    console.log('Fetching Migration Status for ID:', dbId);

    if (!dbId) {

      loadingBox.innerHTML =
        '<i class="fa-solid fa-circle-exclamation me-2"></i> Missing Database ID. Please select a database from the Dashboard.';

      return;
    }

    fetch(
      'https://eknzie3ujercqevbcx3rhjjtrq0fwgph.lambda-url.ap-south-1.on.aws/',
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },

        body: new URLSearchParams({
          db_id: 128
        })
      }
    )

    .then(r => r.text())

    .then(data => {

      loadingBox.style.display = 'none';

      try {

        const json = JSON.parse(data);

        responseBox.innerHTML =
          buildMigrationTree(json);

      }

      catch (e) {

        responseBox.textContent =
          data || 'No response data received.';
      }
    })

    .catch(err => {

      console.error('FETCH ERROR:', err);

      loadingBox.innerHTML =
        '<i class="fa-solid fa-triangle-exclamation me-2"></i> Connection Error (502). The service may be temporarily unavailable.';

      loadingBox.style.color = '#dc2626';
    });
  }

  function buildMigrationTree(data) {

    if (!data || !data.cols || !data.vals) {

      return `
        <p class="p-4 text-muted">
          No migration data available.
        </p>
      `;
    }

    let parsedVals;

    try {

      parsedVals = JSON.parse(data.vals);

    }

    catch (e) {

      console.error("Error parsing vals:", e);

      return `
        <p class="p-4 text-danger">
          Error parsing migration values.
        </p>
      `;
    }

    const grouped = {};

    parsedVals.forEach(row => {

      const fullTable = row[0] || 'unknown';

      const parts = fullTable.split('.');

      const schemaName =
        parts.length > 1 ? parts[0] : 'public';

      const tableName =
        parts.length > 1
          ? parts.slice(1).join('.')
          : fullTable;

      if (!grouped[schemaName]) {
        grouped[schemaName] = {};
      }

      grouped[schemaName][tableName] = row;
    });

    let html = `
  <div class="tables-container">

    <div class="tables-header">
  <lord-icon
  src="https://cdn.lordicon.com/yrbmguoo.json"
  trigger="loop"
  colors="primary:#5b3ed6,secondary:#7c63ff"
  style="width:28px;height:28px">
</lord-icon>
Tables
</div>

    <div class="tables-body">
`;

    for (const [schemaName, tables] of Object.entries(grouped)) {

      html += `

        <div
          class="node schema-node"
          onclick="toggle(this)"
        >

         <span style="display:flex; align-items:center; gap:8px;">

  <i class="fa-solid fa-database" style="color:#5b3ed6;"></i>

  ${schemaName}

</span>

          <span class="arrow">▼</span>

        </div>

        <div
          class="panel"
          style="display:none; padding:12px 0;"
        >

          <div class="table-wrapper">

            <table class="migration-table">

              <thead>

                <tr>
      `;

     const hiddenCols = [
  'src_lower_hash',
  'src_upper_hash',
  'tgt_lower_hash',
  'tgt_upper_hash',
  'type',
  'message',       
  'created_at'     
];

      data.cols.forEach(col => {

        if (hiddenCols.includes(col)) {
          return;
        }

        let formattedCol =
          col
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());

        if (col === 'name') {
          formattedCol = 'Table';
        }
        if (col === 'created_at') {
          formattedCol = 'Processed at';
        }
        if (col === 'src_count') {
          formattedCol = 'Source #';
        }
        if (col === 'tgt_count') {
          formattedCol = 'Target #';
        }
        if (col === 'mismatch_count') {
          formattedCol = 'Mismatch #';
        }
        if (col === 'message') {
          formattedCol = 'Columns';
        }

        let thClass = '';

        if (col === 'src_count') {
          thClass = 'source-header src-count-header';
        }

        else if (col === 'tgt_count') {
          thClass = 'target-header tgt-count-header';
        }

        html += `
          <th class="${thClass}">
            ${formattedCol}
          </th>
        `;

        if (col === 'name') {

          html += `
            <th class="source-header">
              Source Hash
            </th>

            <th class="target-header">
              Target Hash
            </th>
          `;
        }
      });

      html += `

                </tr>

              </thead>

              <tbody>
      `;

      for (const [tableName, rowData] of Object.entries(tables)) {

        html += `<tr>`;

        const rowObject = {};

        data.cols.forEach((col, idx) => {
          rowObject[col] = rowData[idx];
        });

       let sourceHash = '-';
let targetHash = '-';

// Source Hash (Exact using BigInt)
try {
  if (rowObject.src_lower_hash && rowObject.src_upper_hash) {
    const srcLower = BigInt(rowObject.src_lower_hash);
    const srcUpper = BigInt(rowObject.src_upper_hash);

    sourceHash = (srcLower + srcUpper).toString();
  }
} catch (e) {
  console.error('Source BigInt error:', e);
}

// Target Hash (Exact using BigInt)
try {
  if (rowObject.tgt_lower_hash && rowObject.tgt_upper_hash) {
    const tgtLower = BigInt(rowObject.tgt_lower_hash);
    const tgtUpper = BigInt(rowObject.tgt_upper_hash);

    targetHash = (tgtLower + tgtUpper).toString();
  }
} catch (e) {
  console.error('Target BigInt error:', e);
}

        data.cols.forEach((col, index) => {

          if (hiddenCols.includes(col)) {
            return;
          }

          let cellContent = rowData[index];

          let cellClass = '';

          if (col === 'name') {

            const parts =
              String(cellContent).split('.');

            cellContent =
              parts[parts.length - 1];

            html += `

<td
  class="table-name-cell"

  onmouseenter="
    showTablePopup(
      event,
      '${rowObject.created_at || '-'}'
    )
  "

  onmouseleave="hideHashPopup()"
>
  ${cellContent}
</td>


              <td
                class="source-cell"

                onmouseenter="
                  showHashPopup(
                    event,
                    'source',
                    '${rowObject.src_lower_hash}',
                    '${rowObject.src_upper_hash}',
                    '${rowObject.tgt_lower_hash}',
                    '${rowObject.tgt_upper_hash}'
                  )
                "

                onmouseleave="hideHashPopup()"
              >
                ${sourceHash}
              </td>

              <td
                class="target-cell"

                onmouseenter="
                  showHashPopup(
                    event,
                    'target',
                    '${rowObject.src_lower_hash}',
                    '${rowObject.src_upper_hash}',
                    '${rowObject.tgt_lower_hash}',
                    '${rowObject.tgt_upper_hash}'
                  )
                "

                onmouseleave="hideHashPopup()"
              >
                ${targetHash}
              </td>
            `;

            return;
          }
if (col === 'status' && typeof cellContent === 'string') {

  let statusText = cellContent;

  if (statusText.includes('SUCCESS')) {
    cellClass = 'status-success';
  } else if (statusText.includes('FAILED') || statusText.includes('ERROR')) {
    cellClass = 'status-error';
  } else if (statusText.includes('IN PROGRESS')) {
    cellClass = 'status-inprogress';
  }

  if (col === 'status' && typeof cellContent === 'string') {

  let statusText = cellContent;

  if (statusText.includes('SUCCESS')) {
    cellClass = 'status-success';
  } else if (statusText.includes('FAILED') || statusText.includes('ERROR')) {
    cellClass = 'status-error';
  } else if (statusText.includes('IN PROGRESS')) {
    cellClass = 'status-inprogress';
  }

  
  if (statusText.includes('VALIDATION SUCCESS')) {
  cellContent = `
    <div class="status-wrap">
      
      <div class="status-icon">
        <i class="fa-solid fa-check"></i>
      </div>

      <div class="status-text">
        <div class="status-title">Validation</div>
        <div class="status-sub">Success</div>
      </div>

    </div>
  `;
}
}

}

  if (col === 'message') {

  let msg = String(cellContent || '').trim();

  // Remove "Columns:"
  msg = msg.replace(/^Columns:\s*/i, '');

  // Split source and target
  const parts = msg.split('|');

  let source = (parts[0] || '').trim();
  let target = (parts[1] || '').trim();

  // Convert hyphen separators to commas
  source = source.split('-').join(', ');
  target = target.split('-').join(', ');
    // remove fake empty characters
const cleanSource =
  source.replace(/[,\s-]/g, '').length > 0
    ? source
    : '';

const cleanTarget =
  target.replace(/[,\s-]/g, '').length > 0
    ? target
    : '';
  // Function to check if value is actually empty
  const isMeaningful = (val) => {
    return val.replace(/[,\s-]/g, '').length > 0;
  };

  const hasSource = isMeaningful(source);
  const hasTarget = isMeaningful(target);

  // BOTH EMPTY → show "-"
  if (!hasSource && !hasTarget) {

    cellContent = '-';

  } else {

    cellContent = `
      <div style="line-height:1.5">
        <div>
          <span style="font-weight:400">Source :</span>
          <span>${hasSource ? source : '-'}</span>
        </div>

        <div>
          <span style="font-weight:400">Target :</span>
          <span>${hasTarget ? target : '-'}</span>
        </div>
      </div>
    `;
  }
}

          if (
  col === 'created_at' &&
  typeof cellContent === 'string'
) {
  try {
    cellContent = new Date(cellContent).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false   
    });
  } catch (e) {}
}

          if (col === 'status') {

  html += `

  <td
    class="${cellClass}"

    onmouseenter="
      showColumnsPopup(
        event,
        \`${(rowObject.message || '').replace(/`/g, '')}\`
      )
    "

    onmouseleave="hideHashPopup()"
  >
    ${cellContent}
  </td>
  `;

} else {

  html += `

  <td class="${cellClass}">
    ${cellContent}
  </td>
  `;
}
        });

        html += `</tr>`;
      }

      html += `

              </tbody>

            </table>

          </div>

        </div>
      `;
    }
    html += `
    </div>
  </div>
  `;

    return html;
  }

  window.toggle = function (el) {

    const panel = el.nextElementSibling;

    if (panel) {

      const opening =
        panel.style.display === 'none' ||
        panel.style.display === '';

      panel.style.display =
        opening ? 'block' : 'none';

      el.classList.toggle('active', opening);
    }
  };

  window.expandAll = function (expand) {

    const responseBox =
      document.getElementById('migrationResponse');

    if (!responseBox) return;

    responseBox
      .querySelectorAll('.node.schema-node')

      .forEach(schemaNode => {

        const schemaPanel =
          schemaNode.nextElementSibling;

        if (schemaPanel) {

          schemaPanel.style.display =
            expand ? 'block' : 'none';

          schemaNode.classList.toggle(
            'active',
            expand
          );
        }
      });
  };

  window.showHashPopup = function (
    event,
    type,
    srcLower,
    srcUpper,
    tgtLower,
    tgtUpper
  ) {

    const popup =
      document.getElementById('hashPopup');

      let content = `
`;

if (type === 'source') {

  content += `

    <div class="popup-card">

      <div class="popup-row">

        <div class="popup-left">
          <span class="popup-label">Lower</span>
          <lord-icon
            src="https://cdn.lordicon.com/bqlcwfjd.json"
            trigger="hover"
            colors="primary:#7c63ff"
            style="width:34px;height:34px">
          </lord-icon>

        </div>

        <span class="popup-value">${srcLower || '-'}</span>

      </div>

      <div class="popup-divider"></div>

      <div class="popup-row">

        <div class="popup-left">
         <span class="popup-label">Upper</span>
          <lord-icon
            src="https://cdn.lordicon.com/bqlcwfjd.json"
            trigger="hover"
            colors="primary:#5b3ed6"
            style="width:34px;height:34px">
          </lord-icon>

       

        </div>

        <span class="popup-value">${srcUpper || '-'}</span>

      </div>

    </div>
  `;
}

if (type === 'target') {

  content += `

    <div class="popup-card">

      <div class="popup-row">

        <div class="popup-left">
        <span class="popup-label">Lower</span>
          <lord-icon
            src="https://cdn.lordicon.com/bqlcwfjd.json"
            trigger="hover"
            colors="primary:#3b82f6"
            style="width:34px;height:34px">
          </lord-icon>
        </div>

        <span class="popup-value">${tgtLower || '-'}</span>

      </div>

      <div class="popup-divider"></div>

      <div class="popup-row">

        <div class="popup-left">
         <span class="popup-label">Upper</span>
          <lord-icon
            src="https://cdn.lordicon.com/bqlcwfjd.json"
            trigger="hover"
            colors="primary:#2563eb"
            style="width:34px;height:34px">
          </lord-icon>

        </div>

        <span class="popup-value">${tgtUpper || '-'}</span>

      </div>

    </div>
  `;
}
popup.innerHTML = content;


    popup.style.display = 'block';

    popup.style.left =
      (event.pageX + 15) + 'px';

    popup.style.top =
      (event.pageY + 15) + 'px';
  };
  window.showColumnsPopup = function (
  event,
  message
) {

  const popup =
    document.getElementById('hashPopup');

  let msg = String(message || '').trim();

  msg = msg.replace(/^Columns:\s*/i, '');

  const parts = msg.split('|');

  let source = (parts[0] || '').trim();
  let target = (parts[1] || '').trim();

  source = source.split('-').join(', ');
  target = target.split('-').join(', ');

 // clean invalid values
const cleanSource =
  source.replace(/[,\s-]/g, '').length > 0
    ? source
    : '';

const cleanTarget =
  target.replace(/[,\s-]/g, '').length > 0
    ? target
    : '';

popup.innerHTML = `

<div class="popup-card popup-columns-layout">

  <div class="popup-col">

    <div class="popup-heading source-heading">
      Source
    </div>

    <div class="popup-data">
      ${cleanSource}
    </div>

  </div>

  <div class="popup-col">

    <div class="popup-heading target-heading">
      Target
    </div>

    <div class="popup-data">
      ${cleanTarget}
    </div>

  </div>

</div>
`;
popup.style.display = 'block';

const popupWidth = 320;
const popupHeight = 140;

let left = event.pageX + 15;
let top = event.pageY + 15;

if (left + popupWidth > window.innerWidth) {
  left = window.innerWidth - popupWidth - 20;
}

if (top + popupHeight > window.innerHeight + window.scrollY) {
  top = event.pageY - popupHeight - 20;
}

popup.style.left = left + 'px';
popup.style.top = top + 'px';
};

window.showTablePopup = function (
  event,
  createdAt
) {

  const popup =
    document.getElementById('hashPopup');

  let formatted = '-';

  try {

    formatted = new Date(createdAt)
      .toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

  } catch (e) {}

  popup.innerHTML = `
    <div class="simple-time-popup">
      ${formatted}
    </div>
  `;

  popup.style.display = 'block';
  popup.style.left = (event.pageX + 10) + 'px';
  popup.style.top = (event.pageY + 10) + 'px';
};


  window.hideHashPopup = function () {

    document.getElementById('hashPopup')
      .style.display = 'none';
  };

  loadMigrationStatus();

})();