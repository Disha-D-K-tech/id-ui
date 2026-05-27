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
    `;

    for (const [schemaName, tables] of Object.entries(grouped)) {

      html += `

        <div
          class="node schema-node"
          onclick="toggle(this)"
        >

          <span>

            <i
              class="fa-solid fa-layer-group me-2"
              style="color:var(--lv-indigo)"
            ></i>

            ${schemaName}

          </span>

          <span class="arrow">▼</span>

        </div>

        <div
          class="panel"
          style="display:none; padding:12px 0;"
        >

          <div class="table-responsive">

            <table class="migration-table">

              <thead>

                <tr>
      `;

      const hiddenCols = [
        'src_lower_hash',
        'src_upper_hash',
        'tgt_lower_hash',
        'tgt_upper_hash'
      ];

      data.cols.forEach(col => {

        if (hiddenCols.includes(col)) {
          return;
        }

        let formattedCol =
          col
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());

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
              Source
            </th>

            <th class="target-header">
              Target
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

       const srcLower =
  Number(rowObject.src_lower_hash);

const srcUpper =
  Number(rowObject.src_upper_hash);

const tgtLower =
  Number(rowObject.tgt_lower_hash);

const tgtUpper =
  Number(rowObject.tgt_upper_hash);

const sourceHash =
  !isNaN(srcLower) && !isNaN(srcUpper)
    ? srcLower + srcUpper
    : '-';

const targetHash =
  !isNaN(tgtLower) && !isNaN(tgtUpper)
    ? tgtLower + tgtUpper
    : '-';

        data.cols.forEach((col, index) => {

          if (
            col === 'src_lower_hash' ||
            col === 'src_upper_hash' ||
            col === 'tgt_lower_hash' ||
            col === 'tgt_upper_hash'
          ) {
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

              <td>
                ${cellContent}
              </td>

              <td
                class="source-cell"

                onmouseenter="
                  showHashPopup(
                    event,
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

          if (
            col === 'status' &&
            typeof cellContent === 'string'
          ) {

            if (cellContent.includes('SUCCESS')) {

              cellClass = 'status-success';
            }

            else if (
              cellContent.includes('FAILED') ||
              cellContent.includes('ERROR')
            ) {

              cellClass = 'status-error';
            }

            else if (
              cellContent.includes('IN PROGRESS')
            ) {

              cellClass = 'status-inprogress';
            }
          }

          if (
            col === 'created_at' &&
            typeof cellContent === 'string'
          ) {

            try {

              cellContent =
                new Date(cellContent)
                  .toLocaleString();

            }

            catch (e) {}
          }

          html += `

            <td class="${cellClass}">
              ${cellContent}
            </td>
          `;
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
    srcLower,
    srcUpper,
    tgtLower,
    tgtUpper
  ) {

    const popup =
      document.getElementById('hashPopup');

  popup.innerHTML = `

  <div class="popup-title">
    <i class="fa-solid fa-fingerprint"></i>
    Hash Details
  </div>

  <div class="popup-row">
    <span class="popup-label">
      Src Lower Hash
    </span>

    <span class="popup-value">
      ${srcLower || '-'}
    </span>
  </div>

  <div class="popup-row">
    <span class="popup-label">
      Src Upper Hash
    </span>

    <span class="popup-value">
      ${srcUpper || '-'}
    </span>
  </div>

  <div class="popup-row">
    <span class="popup-label">
      Tgt Lower Hash
    </span>

    <span class="popup-value">
      ${tgtLower || '-'}
    </span>
  </div>

  <div class="popup-row">
    <span class="popup-label">
      Tgt Upper Hash
    </span>

    <span class="popup-value">
      ${tgtUpper || '-'}
    </span>
  </div>
`;

    popup.style.display = 'block';

    popup.style.left =
      (event.pageX + 15) + 'px';

    popup.style.top =
      (event.pageY + 15) + 'px';
  };

  window.hideHashPopup = function () {

    document.getElementById('hashPopup')
      .style.display = 'none';
  };

  loadMigrationStatus();

})();