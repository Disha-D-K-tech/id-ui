/************* CONFIG SESSION DETAILS *************/
const userid = sessionStorage.getItem("userid");
const subscription = sessionStorage.getItem("subscription");
const secret = sessionStorage.getItem("secret");
const email = sessionStorage.getItem("email");

function showOverlay(message) {
  document.getElementById('messageContent').textContent = message;
  document.getElementById('overlay').style.display = 'block';
  document.getElementById('messageBox').style.display = 'block';
}

function hideOverlay() {
  document.getElementById('messageContent').textContent = "";
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('messageBox').style.display = 'none';
}

function showDashboardLoadOverlay() {
  showOverlay('Loading your databases...');
}

let dbHistoryRecords = [];

function parseUserJson(str) {
  if (!str || typeof str !== 'string') return null;
  try {
    return JSON.parse(str.replace(/'/g, '"'));
  } catch (e) {
    return null;
  }
}


/************* USER / COMPANY DISPLAY *************/
$(document).ready(async function () {
  const user = sessionStorage.getItem("userJson");
  const userJson = parseUserJson(user) || {};

  const username = userJson.name ||
    [userJson.firstname, userJson.lastname].filter(Boolean).join(' ') ||
    userJson.email ||
    "Welcome";
  const company = userJson.company || userJson.company_name || sessionStorage.getItem("company") || "Welcome";

  const displayText = company ? company : "Welcome";
  const displayText2 = username ? username : "Welcome";

  $('#userName').text(displayText2);
  if (displayText2.length > 0) {
    $('.profile-icon').html(`
      <div style="
        width:100%;
        height:100%;
        background-color:#6A5ACD;
        color:white;
        font-weight:bold;
        font-size:18px;
        border-radius:50%;
        display:flex;
        align-items:center;
        justify-content:center;
        text-transform:uppercase;
        font-family:Arial,sans-serif;
      ">
        ${displayText2[0]}
      </div>
    `);
  }
  $('#companyName').text(displayText);
  $('#companyName1').text(displayText);
});

/************* MODAL & TAB SETUP *************/
const addDbModal = new bootstrap.Modal(document.getElementById('addDbModal'));
const sourceTabBtn = document.getElementById('nav-home-tab');
const targetTabBtn = document.getElementById('nav-profile-tab');
const targetTabWrap = document.getElementById('targetTabWrap');
const sourceTab = bootstrap.Tab.getOrCreateInstance(sourceTabBtn);
const targetTab = bootstrap.Tab.getOrCreateInstance(targetTabBtn);

document.getElementById("addDbModal").addEventListener("hide.bs.modal", function () {
  if (document.activeElement) document.activeElement.blur();
});
document.getElementById("addDbModal").addEventListener("hidden.bs.modal", function () {
  document.getElementById("startMigrationBtn").focus();
});

let sourceDetailsLocked = false;

/************* HELPER FUNCTIONS *************/
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
  return ($('#companyName').text() || sessionStorage.getItem("company") || 'Welcome').trim();
}

function isCompanyEmail(email) {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  const free = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'live.com'];
  return !free.some(d => lower.endsWith('@' + d));
}

function getBuApiHeaders() {
  const apiKey =
    window.BU_API_KEY ||
    sessionStorage.getItem('bu_api_key') ||
    localStorage.getItem('bu_api_key') ||
    '';
  return apiKey ? { 'x-api-key': apiKey } : {};
}

/************* FETCH & DISPLAY PREVIOUS DATABASES *************/
function fetchPreviousDatabases() {
  const userId = getSafeUserId();

  if (!userId) {
    hideOverlay();
    return;
  }
// Show loading state
  $('#previousDbSection').show();
  $('#previousDbCards').html(`
    <div class="text-center py-4">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="muted mt-2">Loading previous databases...</p>
    </div>
  `);

  $.ajax({
    url: 'https://dkg2bnh5lu4vregv4of3sbbite0arjgx.lambda-url.ap-south-1.on.aws/',
    type: 'POST',
    data: { user_id: userId },
    dataType: 'json',
    success: function(response) {
    // response can be in various formats
      let records = [];
      const raw = Array.isArray(response?.databases) ? response.databases
        : Array.isArray(response) ? response
        : Array.isArray(response?.data) ? response.data
        : [];

      const normalized = raw
        .map(normalizePreviousDatabaseRecord)
        .filter(Boolean);

// Pairing logic: iterate over normalized records and match SRC with TGT based on srcName and srcType
      normalized.forEach(function(item) {
        if (item.recordType === 'SRC') {
          records.push({ source: item, target: null });
          return;
        }

        if (item.recordType === 'TGT') {
          const openSourceRecord = [...records].reverse().find(function(entry) {
          if (item.srcName && item.srcType && entry.source) {
             return entry.source.name === item.srcName
                         && entry.source.type === item.srcType
                         && !entry.target;
          }
          if (item.srcName && entry.source) {
            return entry.source.name === item.srcName && !entry.target;
          }
          return entry.source && !entry.target;
        });

          if (openSourceRecord) {
            openSourceRecord.target = item;
          } else {
            records.push({ source: null, target: item });
          }
        }
      });

      hideOverlay();

      if (!records.length) {
        dbHistoryRecords = [];
        updateDashboardVisualsFromHistory([]);
        updateStartMigrationPlacement(false);
        // Show empty state
        $('#previousDbCards').html(`
          <div class="history-empty">
            <strong>No database history yet</strong>
            <span>Start migrating to create your first source and target record.</span>
          </div>
        `);
        return;
      }

      dbHistoryRecords = records;
      updateDashboardVisualsFromHistory(records);
      updateStartMigrationPlacement(true);
      renderPreviousDbCards(records);
    },
    error: function(xhr) {
      hideOverlay();
      dbHistoryRecords = [];
      updateDashboardVisualsFromHistory([]);
      updateStartMigrationPlacement(false);
      $('#previousDbCards').html(`<p class="muted text-center py-3">Could not load previous databases.</p>`);
    }
  });
}


function dbDetailRow(label, value) {
  if (!value || value === '' || value === 'undefined' || value === 'null') return '';
  return `
    <div class="prev-db-row">
      <span class="prev-db-label">${label}</span>
      <span class="prev-db-value">${value}</span>
    </div>`;
}

// Returns an HTML string with the appropriate database type icon 
function getDbTypeIcon(type) {
  const t = String(type || '').toLowerCase().trim();
  if (t.includes('postgresql') || t.includes('postgres')) {
    return '<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg" style="width:18px;height:18px;vertical-align:middle;margin-right:5px;">';
  }
  if (t.includes('mysql')) {
    return '<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg" style="width:18px;height:18px;vertical-align:middle;margin-right:5px;">';
  }
  if (t.includes('sql server') || t.includes('sqlserver') || t.includes('mssql')) {
    return '<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/microsoftsqlserver/microsoftsqlserver-plain.svg" style="width:18px;height:18px;vertical-align:middle;margin-right:5px;">';
  }
  if (t.includes('snowflake')) {
    return '<i class="fa-solid fa-snowflake" style="color:#29B5E8;margin-right:5px;font-size:15px;vertical-align:middle;"></i>';
  }
  if (t.includes('databricks')) {
    return '<img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/databricks.svg" style="width:18px;height:18px;vertical-align:middle;margin-right:5px;filter:invert(36%) sepia(93%) saturate(1352%) hue-rotate(346deg) brightness(97%) contrast(97%);">';
  }
  if (t.includes('fabric') || t.includes('onelake')) {
    return '<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/azure/azure-original.svg" style="width:18px;height:18px;vertical-align:middle;margin-right:5px;">';
  }
  return '<i class="fa-solid fa-database" style="margin-right:5px;font-size:15px;vertical-align:middle;color:var(--lv-indigo);"></i>';
}

//normalizes a single database record from the history 
function normalizePreviousDatabaseRecord(row) {
  if (!row) return null;

  if (Array.isArray(row)) {
    const recordType = String(row[0] || '').trim().toUpperCase();
    if (recordType !== 'SRC' && recordType !== 'TGT') return null;

    return {
      recordType,
      id: row[1] || '—',
      type: row[2] || '—',
      name: row[3] || '—',
      host: row[4] || '—',
      status: row[5] || '—',
      // parse out the actual description and source info 
      desc: (function() {
          const raw = row[6] || '';
          return raw.includes('|||') ? raw.split('|||')[0] : raw;
          })(),
      srcType: (function() {
          const raw = row[6] || '';
          return raw.split('|||')[1] || '';
        })(),
      srcName: (function() {
          const raw = row[6] || '';
          return raw.split('|||')[2] || '';
        })(),

    };
  }

  if (typeof row === 'object') {
    const recordType = String(
      row.recordType ||
      row.type_flag ||
      row.source_target ||
      row.db_side ||
      row.record_type ||
      ''
    ).trim().toUpperCase();

    if (recordType !== 'SRC' && recordType !== 'TGT') return null;

    return {
      recordType,
      id: row.id || row.bu_id || row.db_id || '—',
      type: row.db_type || row.type || '—',
      name: row.db_name || row.name || '—',
      host: row.db_host || row.host_url || row.host || '—',
      status: row.status || (recordType === 'TGT' ? 'NEW' : '—'),
      approver1: row.approver_email1 || '',
      approver2: row.approver_email2 || '',
      desc: row.description || '',
      role: row.role || '',
      warehouse: row.warehouse || ''
    };
  }

  return null;
}

// Renders the previous database cards based on the paired records
function renderPreviousDbCards(records) {
  let html = '';

  records.forEach(function(record, idx) {
    const src = record.source;
    const tgt = record.target;
    const hasSource = !!src;
    const hasTarget = !!tgt;
    const s = hasSource ? src : {
      id: '—',
      type: '—',
      name: '—',
      host: '—',
      status: '—',
      approver1: '',
      approver2: '',
      desc: ''
    };
    const t = hasTarget ? tgt : null;
    const summaryName = hasSource ? s.name : (hasTarget ? t.name : 'Database Pair');
    const summaryMeta = hasTarget
      ? `${s.type} to ${t.type}`
      : `${s.type} source`;
    const isNewStatus = [s.status, hasTarget ? t.status : '']
      .some(function(status) { return String(status || '').trim().toUpperCase() === 'NEW'; });
    
      // Card HTML
    html += `
    <div class="prev-db-card" data-prev-db-card>
      <button type="button" class="prev-db-toggle" data-prev-db-toggle aria-expanded="false">
        <div class="prev-db-toggle-main">
          <div class="prev-db-toggle-icon-round"><i class="fa-solid fa-database"></i></div>
          <div>
            <p class="prev-db-toggle-title">${summaryName}</p>
            <div class="prev-db-toggle-meta">Database ${idx + 1} • ${summaryMeta}</div>
          </div>
        </div>
        <div class="prev-db-toggle-side">
          ${isNewStatus ? `<span class="prev-db-status-pill">NEW</span>` : ''}
          <span class="prev-db-toggle-icon" aria-hidden="true">
            <i class="fa-solid fa-chevron-down"></i>
          </span>
        </div>
      </button>
      <div class="prev-db-content">
      <div class="prev-db-inner">

        <!-- SOURCE SIDE -->
        <div class="prev-db-side prev-db-source">
          <div class="prev-db-side-header">
            <span class="prev-db-badge src-badge"><i class="fa-solid fa-database"></i> Source</span>
            <span class="prev-db-type-pill">${getDbTypeIcon(s.type)}${s.type}</span>
          </div>
        


          
        ${dbDetailRow('DB Type',  s.type)}
        ${dbDetailRow('DB Name',  s.name)}
        ${dbDetailRow('Host',     s.host)}
        ${dbDetailRow('Status',   s.status)}
        ${dbDetailRow('Approver 1', s.approver1)}
        ${s.approver2 ? dbDetailRow('Approver 2', s.approver2) : ''}
        ${s.desc      ? dbDetailRow('Description', s.desc)     : ''}
        </div>

        <!-- DIVIDER -->
        <div class="prev-db-divider">
          <div class="prev-db-flow-arrows" aria-hidden="true">
            <i class="fa-solid fa-angle-right"></i>
            <i class="fa-solid fa-angle-right"></i>
            <i class="fa-solid fa-angle-right"></i>
          </div>
        </div>

        <!-- TARGET SIDE -->
        <div class="prev-db-side prev-db-target ${!hasTarget ? 'prev-db-target-empty' : ''}">
          ${hasTarget ? `
          <div class="prev-db-side-header">
            <span class="prev-db-badge tgt-badge"><i class="fa-solid fa-cloud-arrow-up"></i> Target</span>
            <span class="prev-db-type-pill">${getDbTypeIcon(t.type)}${t.type}</span>
          </div>
        
        ${dbDetailRow('DB Type',  t.type)}
        ${dbDetailRow('DB Name',  t.name)}
        ${dbDetailRow('Host',     t.host)}
        ${dbDetailRow('Status',   t.status)}
        ${t.desc ? dbDetailRow('Description', t.desc) : ''}
          ` : `
          <div class="prev-db-no-target">
            <i class="fa-solid fa-clock-rotate-left fa-2x" style="color:#c4b5fd;margin-bottom:10px"></i>
            <p style="margin:0;color:var(--muted);font-size:13px;font-weight:600">Target not configured yet</p>
          </div>
          `}
        </div>

      </div>
      ${isNewStatus ? `
      <div class="prev-db-actions">
        <button type="button" class="prev-db-action-btn" data-history-start>Start Migration</button>
      </div>
      ` : ''}
      </div>
    </div>`;
  });

  $('#previousDbCards').html(html);
  bindPreviousDbToggles();
  bindHistoryStartButtons();
}

function bindPreviousDbToggles() {
  $('[data-prev-db-toggle]').off('click').on('click', function () {
    const $toggle = $(this);
    const $card = $toggle.closest('[data-prev-db-card]');
    const isOpen = $card.hasClass('is-open');

    $card.toggleClass('is-open', !isOpen);
    $toggle.attr('aria-expanded', String(!isOpen));
  });
}

function bindHistoryStartButtons() {
  $('[data-history-start]').off('click').on('click', function () {
    resetMigrationFlow();
    addDbModal.show();
  });
}

function updateStartMigrationPlacement(hasHistory) {
  const $button = $('#startMigrationBtn');
  const $centerWrap = $('.start');
  const $summarySlot = $('#summaryActionSlot');

  if (!$button.length || !$centerWrap.length || !$summarySlot.length) return;

  $button.detach();

  if (hasHistory) {
    $summarySlot.append($button).show();
    $centerWrap.hide();
    return;
  }

  $centerWrap.append($button).show();
  $summarySlot.hide().empty();
}

// Normalizes BU options from various possible response shapes into a simple array of items
function normalizeBuOptions(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.bu_ids)) return response.bu_ids;
  if (Array.isArray(response?.values)) return response.values;
  return [];
}

function populateBuDropdown(items) {
  const $bu = $('#bu_id');
  $bu.empty();
  $bu.append('<option value="" selected disabled>Select BU ID</option>');

  normalizeBuOptions(items).forEach(function (item) {
    let value = '';
    let label = '';

    if (Array.isArray(item)) {
      value = item[0] ?? '';
      const itemName = item[1] ?? '';
      label = itemName ? String(itemName).trim() : String(value).trim();
    } else if (item && typeof item === 'object') {
      value = item.bu_id || item.id || item.value || item.name || '';
      const itemName = item.label || item.name || item.bu_name || '';
      label = itemName ? String(itemName).trim() : String(value).trim();
    } else {
      value = item;
      label = item;
    }

    if (value) {
      $bu.append($('<option>', {
        value: String(value).trim(),
        text: String(label).trim()
      }));
    }
  });
}

// Loads BU options from the API 
function loadBuOptions() {
  const entity = getCurrentCompanyName();
  const $bu = $('#bu_id');

  $bu.prop('disabled', true);
  populateBuDropdown([]);
  showOverlay('Loading BU IDs...');

  setTimeout(function () {
    $.ajax({
      url: 'https://czohdy4obk2puhnl3hopinvxne0tuobz.lambda-url.ap-south-1.on.aws',
      type: 'POST',
      data: { entity: entity },
      dataType: 'json',
      async: false,
      success: function (response, textStatus, xhr) {
        hideOverlay();

        // handle both string and object responses
        let parsed = response;
        if (typeof response === 'string') {
          try {
            parsed = JSON.parse(response.replace(/'/g, '"'));
          } catch (e) {
            parsed = [];
          }
        }

        // normalizeBuOptions handles all possible shapes
        const items = normalizeBuOptions(parsed);

        if (items.length === 0) {
          $('#targetModalAlert')
            .removeClass()
            .addClass('alert alert-warning')
            .text('No BU IDs found for your entity. Contact your administrator.')
            .show();
        } else {
          $('#targetModalAlert').hide();
        }

       populateBuDropdown(items);
      $bu.prop('disabled', false);

      
const srcVal = $('#src_bu_id').val();
const srcText = $('#src_bu_id option:selected').text().trim();
if (srcVal) {
  let matched = false;
  $bu.find('option').each(function() {
    if ($(this).val().trim() === srcVal || $(this).text().trim() === srcText) {
      $bu.val($(this).val());
      matched = true;
      return false;
    }
  });
  if (!matched) {
    if ($bu.find(`option[value="${srcVal}"]`).length === 0) {
      $bu.append($('<option>', { value: srcVal, text: srcText }));
    }
    $bu.val(srcVal);
  }
  $bu.prop('disabled', true);
  $bu.css({ 'background': '#f3f0ff', 'color': '#5b3ed6', 'border-color': '#d9cffd', 'pointer-events': 'none' });
}
      },
      error: function (xhr, status, error) {
        hideOverlay();
       
        let message = 'Unable to load BU IDs. Please try again.';

        if (xhr.responseJSON && xhr.responseJSON.error) {
          message = xhr.responseJSON.error;
        } else if (xhr.responseText) {
          try {
            const parsed = JSON.parse(xhr.responseText);
            message = parsed.message || parsed.error || message;
          } catch (e) {
            message = xhr.responseText || message;
          }
        }

      
        if (xhr.status === 409) {
          message = 'Session conflict. Please refresh and try again.';
        }

        $bu.prop('disabled', false);
        $('#targetModalAlert')
          .removeClass()
          .addClass('alert alert-warning')
          .text(message)
          .show();
      }
    });
  }, 1200);  
}

function loadSrcBuOptions() {
  const entity = getCurrentCompanyName();
  const $bu = $('#src_bu_id');

  $bu.prop('disabled', true);
  populateSrcBuDropdown([]);
  showOverlay('Loading BU IDs...');

  setTimeout(function () {
    $.ajax({
      url: 'https://czohdy4obk2puhnl3hopinvxne0tuobz.lambda-url.ap-south-1.on.aws',
      type: 'POST',
      data: { entity: entity },
      dataType: 'json',
      async: false,
      success: function (response) {
        hideOverlay();
        let parsed = response;
        if (typeof response === 'string') {
          try { parsed = JSON.parse(response.replace(/'/g, '"')); } catch (e) { parsed = []; }
        }
        const items = normalizeBuOptions(parsed);
        if (items.length === 0) {
          $('#modalAlert').removeClass().addClass('alert alert-warning')
            .text('No BU IDs found for your entity. Contact your administrator.').show();
        } else {
          $('#modalAlert').hide();
        }
        populateSrcBuDropdown(items);
        $bu.prop('disabled', false);
      },
      error: function (xhr) {
        hideOverlay();
        let message = 'Unable to load BU IDs. Please try again.';
        if (xhr.responseJSON?.error) message = xhr.responseJSON.error;
        if (xhr.status === 409) message = 'Session conflict. Please refresh and try again.';
        $bu.prop('disabled', false);
        $('#modalAlert').removeClass().addClass('alert alert-warning').text(message).show();
      }
    });
  }, 1200);
}

function populateSrcBuDropdown(items) {
  const $bu = $('#src_bu_id');
  $bu.empty();
  $bu.append('<option value="" selected disabled>Select BU ID</option>');
  normalizeBuOptions(items).forEach(function (item) {
    let value = '', label = '';
    if (Array.isArray(item)) {
      value = item[0] ?? '';
      label = item[1] ? String(item[1]).trim() : String(value).trim();
    } else if (item && typeof item === 'object') {
      value = item.bu_id || item.id || item.value || '';
      const name = item.label || item.name || item.bu_name || '';
      label = name ? String(name).trim() : String(value).trim();
    } else {
      value = item;
      label = item;
    }
    if (value) $bu.append($('<option>', { value: String(value).trim(), text: String(label).trim() }));
  });
}

function setTargetTabLocked(isLocked) {
  $('#nav-profile-tab').prop('disabled', isLocked);
  if (targetTabWrap) {
    targetTabWrap.title = isLocked
      ? 'Available only after source database is tested and saved'
      : 'Target database form is ready';
  }
}

function resetSourceForm() {
  $('#modalAlert').hide();
  $('#addDbForm')[0].reset();
  $('#message').removeClass('success error').text('');
  $('#saveDetailsBtn').prop('disabled', true).text('Save Details');
  $('#testConnectionBtn').prop('disabled', true).text('Test Connection');
  $('#src_entity_id').val(getCurrentCompanyName());
  loadSrcBuOptions();
}

function resetTargetForm() {
  $('#targetModalAlert').hide();
  $('#targetDbForm')[0].reset();
  $('#targetMessage').removeClass('success error').text('');
  $('#saveTargetBtn').prop('disabled', false).text('Save Details');
  $('#entity_id').val(getCurrentCompanyName());
  $('#status').val('NEW');
  $('#bu_id').prop('disabled', false).css({ 'background': '', 'color': '', 'border-color': '', 'pointer-events': '' });
  loadBuOptions();
}

function resetMigrationFlow() {
  sourceDetailsLocked = false;
  resetSourceForm();
  resetTargetForm();
  setTargetTabLocked(true);
  sourceTab.show();
}

/************* SYNC BU ID FROM SOURCE TO TARGET *************/
$(document).on('change', '#src_bu_id', function() {
  const selectedText = $('#src_bu_id option:selected').text().trim();
  const selectedVal = $('#src_bu_id option:selected').val().trim();

  const $targetBu = $('#bu_id');
  let matched = false;

  $targetBu.find('option').each(function() {
    if ($(this).text().trim() === selectedText || $(this).val().trim() === selectedVal) {
      $targetBu.val($(this).val());
      matched = true;
      return false;
    }
  });

  if (!matched) {
    if ($targetBu.find(`option[value="${selectedVal}"]`).length === 0) {
      $targetBu.append($('<option>', { value: selectedVal, text: selectedText }));
    }
    $targetBu.val(selectedVal);
  }

  // Lock target BU
  $targetBu.prop('disabled', true);
  $targetBu.css({ 'background': '#f3f0ff', 'color': '#5b3ed6', 'border-color': '#d9cffd', 'pointer-events': 'none' });
});


/************* START MIGRATION BUTTON *************/
$('#startMigrationBtn').on('click', () => {
  resetMigrationFlow();
  addDbModal.show();
});

/************* SOURCE FORM — FIELD VALIDATION *************/
$('#addDbForm input, #addDbForm select').on('input change', function () {
 const required = ['#src_entity_id', '#src_bu_id', '#dbType', '#dbHost', '#dbPort', '#dbUser', '#dbPass', '#approver1'];
  const ok = required.every(sel => $(sel).val() && $(sel).val().toString().trim() !== '');
  $('#testConnectionBtn').prop('disabled', !ok);
  $('#saveDetailsBtn').prop('disabled', true); // re-lock until test passes again
});

/************* TARGET FORM — FIELD VALIDATION *************/
$('#targetDbForm input, #targetDbForm select').on('input change', function () {
  const required = ['#entity_id', '#targetType', '#host_url', '#t_dbPort', '#t_dbUser', '#t_dbPass', '#t_dbName'];
  const buVal = ($('#bu_id').val() || $('#bu_id option:selected').val() || $('#src_bu_id').val() || '').trim();
  const ok = !!buVal && required.every(sel => $(sel).val() && $(sel).val().toString().trim() !== '');
  $('#saveTargetBtn').prop('disabled', !ok);
});

/************* TEST CONNECTION *************/
$('#testConnectionBtn').on('click', function () {
  
  showOverlay("Testing..");

  const messageDiv = $('#message');
  const dbType = $('#dbType option:selected').val();
  const dbHost = $('#dbHost').val().trim();
  const dbPort = $('#dbPort').val().trim();
  const dbName = $('#dbName').val().trim();
  const dbUser = $('#dbUser').val().trim();
  const dbPass = $('#dbPass').val().trim();

  messageDiv.removeClass('success error').text('');
  messageDiv.addClass('success').text('Testing Connection...');

  $.ajax({
    url: 'https://tkwmf35jnmecgphf7axr5gkqaq0qwauy.lambda-url.ap-south-1.on.aws',
    type: 'POST',
    data: {
      action: "test",
      user_id: parseUserJson(sessionStorage.getItem("userJson")).userid,
      db_type: dbType,
      db_version: '',
      db_name: dbName,
      db_host: dbHost,
      db_port: dbPort,
      db_username: dbUser,
      db_password: dbPass,
    },
    dataType: 'json',
    success: function (response) {
      hideOverlay();
      messageDiv.removeClass('error').addClass('success').text('Connection successful!');
      if (!sourceDetailsLocked) {
        $('#saveDetailsBtn').prop('disabled', false).text('Save Details');
      }
    },
    error: function (xhr, status, error) {
      hideOverlay();
      messageDiv.removeClass('success').addClass('error').text("Connection Failed!");
    }
  });
});

/************* SAVE SOURCE DB DETAILS *************/

$('#saveDetailsBtn').on('click', function () {
  showOverlay("saving...");

  const messageDiv = $('#message');
  const dbType = $('#dbType option:selected').val();
  const dbHost = $('#dbHost').val().trim();
  const dbPort = $('#dbPort').val().trim();
  const dbName = $('#dbName').val().trim();
  const dbUser = $('#dbUser').val().trim();
  const dbPass = $('#dbPass').val().trim();
  const dbDesc = $('#dbDesc').val().trim();
  const approver1 = $('#approver1').val().trim();
  const approver2 = $('#approver2').val().trim();

  messageDiv.removeClass('success error').text('');

  // Check for duplicate source database in history
  const dbExists = dbHistoryRecords.some(function(r) {
    return r.source && 
           r.source.name.toLowerCase() === dbName.toLowerCase() && 
           r.source.host.toLowerCase() === dbHost.toLowerCase();
  });

  if (dbExists) {
    hideOverlay();
    $('#modalAlert').removeClass().addClass('alert alert-danger')
      .text('A source database with this Hostname and Database Name already exists.').show();
    return;
  }

  if (!isCompanyEmail(approver1)) {
    hideOverlay();
    $('#modalAlert').removeClass().addClass('alert alert-danger')
      .text('Approver Email 1 must be a company email (not personal)').show();
    return;
  }

  $('#modalAlert').hide();
  messageDiv.addClass('success').text('Saving Connection Details...');

  $.ajax({
    url: 'https://tkwmf35jnmecgphf7axr5gkqaq0qwauy.lambda-url.ap-south-1.on.aws',
    type: 'POST',
    data: {
      action: "save",
      user_id: parseUserJson(sessionStorage.getItem("userJson")).userid,
      entity_id: $('#src_entity_id').val().trim(),  
      bu_id: $('#src_bu_id').val().trim(),            
      db_type: dbType,
      db_version: '',
      db_name: dbName,
      db_host: dbHost,
      db_port: dbPort,
      db_username: dbUser,
      db_password: dbPass,
      approver_email1: approver1,
      approver_email2: approver2,
      description: dbDesc
    },
    dataType: 'json',
    success: function (response) {
      hideOverlay();
      $('#d1').hide();
      messageDiv.removeClass('error').addClass('success').text('Database Saved');
      fetchPreviousDatabases();
      sourceDetailsLocked = true;
      $('#saveDetailsBtn').prop('disabled', true).text('Saved');
      resetTargetForm();
      setTargetTabLocked(false);
      setTimeout(function () {
        targetTab.show();
      }, 200);
    },
    error: function (xhr, status, error) {
      hideOverlay();
      messageDiv.removeClass('success').addClass('error').text("Connection details not saved!");
    }
  });
});



/************* SAVE TARGET DB DETAILS *************/
$('#saveTargetBtn').on('click', function () {
showOverlay("saving target...");
const targetMessageDiv = $('#targetMessage');
const required = ['#entity_id', '#targetType', '#host_url', '#t_dbPort', '#t_dbUser', '#t_dbPass', '#t_dbName'];
const buVal = ($('#bu_id').val() || $('#bu_id option:selected').val() || $('#src_bu_id').val() || '').trim();
const missingRequired = !buVal || required.some(function (sel) {
  const val = $(sel).val();
  return !val || val.toString().trim() === '';
});

  if (missingRequired) {
    hideOverlay();
    $('#targetModalAlert')
      .removeClass()
      .addClass('alert alert-danger')
      .text('Please fill all required target database fields before saving.')
      .show();
    return;
  }

  targetMessageDiv.removeClass('success error').text('');
  $('#targetModalAlert').hide();
  targetMessageDiv.addClass('success').text('Saving Target Database...');
  $('#saveTargetBtn').prop('disabled', true);

  $.ajax({
    url: 'https://kxgefkhovxwvmyoyuwnm2st3bq0mbijb.lambda-url.ap-south-1.on.aws',
    type: 'POST',
    data: {
      user_id: getSafeUserId(),
      entity: $('#entity_id').val().trim() || getCurrentCompanyName(),
      bu_id: buVal,
      type: $('#targetType option:selected').val(),
      host_url: $('#host_url').val().trim(),
      port: $('#t_dbPort').val().trim(),
      username: $('#t_dbUser').val().trim(),
      password: $('#t_dbPass').val().trim(),
      role: $('#role').val().trim(),
      warehouse: $('#warehouse').val().trim(),
      db_name: $('#t_dbName').val().trim(),
      status: $('#status').val().trim(),
      description: ($('#targetDesc').val().trim() ? $('#targetDesc').val().trim() : '')  
             + '|||' + $('#dbType option:selected').val()
             + '|||' + $('#dbName').val().trim()   
    },
    dataType: 'json',
    success: function (response) {
      hideOverlay();
      targetMessageDiv.removeClass('error').addClass('success').text('Target Database Saved');
      fetchPreviousDatabases();
      setTimeout(function () {
        addDbModal.hide();
        resetMigrationFlow();
      }, 500);
    },
    error: function (xhr, status, error) {
      hideOverlay();
      targetMessageDiv.removeClass('success').addClass('error').text("Target database not saved!");
      $('#saveTargetBtn').prop('disabled', false);
    }
  });
});

/************* SAMPLE STATS DATA *************/
let demo = {
  totalDBs: 120,
  active: 96,
  archived: 18,
  pending: 6,
  timeline: {
    labels: ["6d", "5d", "4d", "3d", "2d", "1d", "now"],
    total: [110, 112, 115, 118, 119, 120, 120],
    active: [90, 91, 93, 94, 95, 96, 96],
    pending: [3, 3, 4, 5, 5, 6, 6]
  }
};

function applyStats() {
  $('#statTotal').text(demo.totalDBs);
  $('#statActive').text(demo.active);
  $('#statArchived').text(demo.archived);
  $('#statPending').text(demo.pending);
  $('#dbCount').text(demo.active + " Active");
  $('#dbTablesCount').text((4380).toLocaleString());
  $('#sftpCount').text("7 Connected");
  $('#sftpTransfers').text("128");
}
applyStats();

function updateDashboardVisualsFromHistory(records) {
  const safeRecords = Array.isArray(records) ? records : [];
  const sourceCount = safeRecords.filter(function(record) { return !!record.source; }).length;
  const targetCount = safeRecords.filter(function(record) { return !!record.target; }).length;
  const totalDatabaseCount = sourceCount + targetCount;

  $('#dbCount').text(totalDatabaseCount + ' Active');
  $('#dbTablesCount').text(sourceCount.toLocaleString());
  $('#sftpCount').text(targetCount + ' Connected');
  $('#sftpTransfers').text(sourceCount.toLocaleString());
}

/************* CHARTS — original bootstrap colors preserved *************/
const dbMiniCtx = document.getElementById('dbMiniChart').getContext('2d');
const dbMiniChart = new Chart(dbMiniCtx, {
  type: 'bar',
  data: {
    labels: ['Users', 'Orders', 'Logs', 'Audit'],
    datasets: [{
      data: [120, 90, 140, 60],
      backgroundColor: ['#0d6efd', '#198754', '#ffc107', '#dc3545']  // original bootstrap colors
    }]
  },
  options: {
    plugins: { legend: { display: false } },
    scales: { x: { display: false }, y: { display: false } },
    maintainAspectRatio: false
  }
});


const sftpMiniCtx = document.getElementById('sftpMiniChart').getContext('2d');
const sftpMiniChart = new Chart(sftpMiniCtx, {
  type: 'line',
  data: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    datasets: [{
      data: [4, 5, 3, 7, 6],
      borderColor: '#0dcaf0',                          
      fill: true,
      backgroundColor: 'rgba(13,202,240,0.10)'          
    }]
  },
  options: {
    plugins: { legend: { display: false } },
    scales: { x: { display: false }, y: { display: false } },
    maintainAspectRatio: false
  }
});


const cloudMiniCtx = document.getElementById('cloudMiniChart').getContext('2d');
const cloudMiniChart = new Chart(cloudMiniCtx, {
  type: 'doughnut',
  data: {
    labels: ['AWS', 'GCP', 'Azure'],
    datasets: [{
      data: [45, 30, 25],
      backgroundColor: ['#fd7e14', '#0d6efd', '#198754'],  
      borderWidth: 2,
      borderColor: '#fff'
    }]
  },
  options: {
    plugins: { legend: { display: false } },
    cutout: '68%',
    maintainAspectRatio: false
  }
});


/************* REFRESH CHART DATA *************/
$('#refreshData').on('click', function () {
  $(this).prop('disabled', true).text('Refreshing...');
  setTimeout(() => {
    demo.totalDBs += Math.round(Math.random() * 3);
    demo.active += Math.round(Math.random() * 2);
    demo.pending = Math.max(0, demo.pending + (Math.random() > 0.8 ? 1 : 0));
    const newValTotal = demo.timeline.total[demo.timeline.total.length - 1] + Math.round(Math.random() * 2);
    const newValActive = demo.timeline.active[demo.timeline.active.length - 1] + Math.round(Math.random() * 1);
    const newValPending = demo.timeline.pending[demo.timeline.pending.length - 1] + (Math.random() > 0.85 ? 1 : 0);
    demo.timeline.labels.shift(); demo.timeline.labels.push('now');
    demo.timeline.total.shift(); demo.timeline.total.push(newValTotal);
    demo.timeline.active.shift(); demo.timeline.active.push(newValActive);
    demo.timeline.pending.shift(); demo.timeline.pending.push(newValPending);
    applyStats();
    dbOverviewChart.data.labels = demo.timeline.labels;
    dbOverviewChart.data.datasets[0].data = demo.timeline.total;
    dbOverviewChart.data.datasets[1].data = demo.timeline.active;
    dbOverviewChart.data.datasets[2].data = demo.timeline.pending;
    dbOverviewChart.update();
    $('#refreshData').prop('disabled', false).html('<i class="fa-solid fa-arrows-rotate"></i> Refresh');
  }, 800);
});

/************* INTERACTIVITY *************/
$('.card-compact').css('cursor', 'pointer').on('click', function () {
  $(this).toggleClass('active');
  $(this).find('canvas').each(function () {
    const node = this;
    node.style.opacity = 0.6;
    setTimeout(() => node.style.opacity = 1, 300);
  });
});

// accessibility: Enter opens modal
$('#startMigrationBtn').on('keypress', function (e) {
  if (e.key === 'Enter') $(this).click();
});

//************* SESSION PING + DECORATIVE ANIMATION *************/
$(document).ready(function () {
  showDashboardLoadOverlay();
  $('.card-compact').css('transform', 'translateY(8px)').animate({ opacity: 1 }, 300);

  // Read everything directly from what login flow stored 
  const sessionUserId = getSafeUserId();
  const sessionSecret = sessionStorage.getItem('secret');
  const sessionEmail = sessionStorage.getItem('email');
  const sessionToken = sessionStorage.getItem('token');
  const sessionUserJson = parseUserJson(sessionStorage.getItem('userJson')) || {};
  fetchPreviousDatabases();
});

/************* LOGOUT — END SESSION *************/