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
// PIPELINE
const PIPELINE_STEPS = [
  { id: 'run-assessment',  label: 'Run Assessment' },
  { id: 'start-migration', label: 'Start Migration' },
  { id: 'ddl-extraction',  label: 'DDL Extraction' },
  { id: 'data-loading',    label: 'Data Loading' },
  { id: 'validation',      label: 'Validation' },
  { id: 'success',         label: 'Success' },
];

const SCHEMA_EXPLORER_API_URL = 'https://dpm44skvaxno5gkzadi3kpodyu0vfzct.lambda-url.ap-south-1.on.aws';
const SCHEMA_EXPLORER_STORAGE_KEY = 'schemaExplorerResults';
const schemaExplorerPage = 'schema_explorer.html';

function getPipelineStepStateClass(stepId, phase) {
  return `state-${stepId}-${phase}`;
}

function cloneTemplateElement(templateId) {
  const template = document.getElementById(templateId);
  if (!template || !template.content.firstElementChild) return null;
  return template.content.firstElementChild.cloneNode(true);
}

function buildPipelineElement(cardIdx) {
  const pipeline = cloneTemplateElement('previousDbPipelineTemplate');
  if (!pipeline) return document.createElement('div');

  pipeline.id = `pipeline-${cardIdx}`;
  pipeline.dataset.cardIdx = String(cardIdx);

  PIPELINE_STEPS.forEach(function(step, i) {
    const stepNode = cloneTemplateElement('previousDbPipelineStepTemplate');
    const button = stepNode.querySelector('.pipeline-btn');
    const icon = stepNode.querySelector('i');
    const label = stepNode.querySelector('[data-step-label]');
    const isFirst = i === 0;

    button.classList.add(getPipelineStepStateClass(step.id, 'pending'));
    button.dataset.step = step.id;
    button.dataset.stepIdx = String(i);
    button.dataset.card = String(cardIdx);
    button.title = step.label;
    if (!isFirst) button.setAttribute('aria-disabled', 'true');

    icon.className = step.icon;
    label.textContent = step.label;
    pipeline.appendChild(stepNode);

    if (i < PIPELINE_STEPS.length - 1) {
      const arrow = cloneTemplateElement('previousDbPipelineArrowTemplate');
      arrow.id = `arrow-${cardIdx}-${i}`;
      pipeline.appendChild(arrow);
    }
  });

  return pipeline;
}
const pipelineStates = {};

function initPipelineState(cardIdx) {
  pipelineStates[cardIdx] = { currentStep: 0, running: false, timer: null };
}

function setPipelineStepState(cardIdx, stepIdx, state) {
  const container = document.getElementById('pipeline-' + cardIdx);
  if (!container) return;
  const btns = container.querySelectorAll('.pipeline-btn');
  if (btns[stepIdx]) btns[stepIdx].className = 'pipeline-btn ' + state;
}

function setArrowState(cardIdx, arrowIdx, state) {
  const arrow = document.getElementById('arrow-' + cardIdx + '-' + arrowIdx);
  if (arrow) arrow.className = 'pipeline-arrow ' + state;
}

function setCardTransferState(cardIdx, transferState) {
  const pipeline = document.getElementById('pipeline-' + cardIdx);
  const card = pipeline ? pipeline.closest('[data-prev-db-card]') : null;
  if (!card) return;

  card.classList.toggle('is-transferring', transferState === 'running');
  card.classList.toggle('is-transfer-complete', transferState === 'complete');
}

function getCardDbId(cardIdx) {
  const pipeline = document.getElementById('pipeline-' + cardIdx);
  const card = pipeline ? pipeline.closest('[data-prev-db-card]') : null;
  if (!card) return '';
  return String(card.dataset.dbId || '').trim();
}

function showSchemaExplorerButton(cardIdx) {
  const pipeline = document.getElementById('pipeline-' + cardIdx);
  const card = pipeline ? pipeline.closest('[data-prev-db-card]') : null;
  if (!card) return;
  const button = card.querySelector('[data-schema-explorer-btn]');
  if (!button) return;
  button.hidden = false;
  button.textContent = 'Schema Explorer';
  button.removeAttribute('aria-busy');
  button.removeAttribute('aria-disabled');
}

function showBinaryExplorerButton(cardIdx) {
  const pipeline = document.getElementById('pipeline-' + cardIdx);
  const card = pipeline ? pipeline.closest('[data-prev-db-card]') : null;
  if (!card) return;
  const button = card.querySelector('[data-binary-explorer-btn]');
  if (!button) return;
  button.hidden = false;
}

function readSchemaExplorerStore() {
  try {
    return JSON.parse(sessionStorage.getItem(SCHEMA_EXPLORER_STORAGE_KEY) || '{}');
  } catch (error) {
    return {};
  }
}

function writeSchemaExplorerStore(store) {
  sessionStorage.setItem(SCHEMA_EXPLORER_STORAGE_KEY, JSON.stringify(store));
}

function storeSchemaExplorerResult(dbId, payload) {
  if (!dbId) return;
  const store = readSchemaExplorerStore();
  store[String(dbId)] = payload;
  writeSchemaExplorerStore(store);
}

function fetchSchemaExplorerAssessment(dbId) {
  return new Promise(function(resolve) {
    if (!dbId) {
      resolve(null);
      return;
    }

    const requestPayload = { db_id: dbId };
    console.log('Schema Explorer request payload:', requestPayload);

    $.ajax({
      url: SCHEMA_EXPLORER_API_URL,
      type: 'POST',
      data: requestPayload,
      dataType: 'json',
      success: function(response) {
        console.log('Schema Explorer API response:', response);
        const payload = {
          db_id: dbId,
          fetched_at: new Date().toISOString(),
          ok: true,
          request: requestPayload,
          response: response
        };
        storeSchemaExplorerResult(dbId, payload);
        resolve(payload);
      },
      error: function(xhr) {
        let responsePayload = xhr.responseText || '';
        try {
          responsePayload = responsePayload ? JSON.parse(responsePayload) : responsePayload;
        } catch (error) {
          // Keep raw response text when it is not JSON.
        }

        console.error('Schema Explorer API error:', responsePayload || xhr.statusText || 'Unknown error');
        const payload = {
          db_id: dbId,
          fetched_at: new Date().toISOString(),
          ok: false,
          request: requestPayload,
          response: responsePayload || xhr.statusText || 'Unknown error'
        };
        storeSchemaExplorerResult(dbId, payload);
        resolve(payload);
      }
    });
  });
}

function openSchemaExplorerPage(dbId) {
  if (!dbId) return;

  showOverlay('Loading Schema Explorer...');

  $.ajax({
    url: SCHEMA_EXPLORER_API_URL,
    type: 'POST',
    data: { db_id: String(dbId) },
    success: function(htmlResponse) {
  console.log('Schema Explorer success:', htmlResponse);
  hideOverlay();
  const store = readSchemaExplorerStore();
  store[String(dbId)] = { db_id: dbId, fetched_at: new Date().toISOString(), ok: true, html: htmlResponse };
  writeSchemaExplorerStore(store);
  console.log('Schema Explorer stored payload:', store[String(dbId)]);
  window.location.href = `${schemaExplorerPage}?db_id=${encodeURIComponent(dbId)}`;
},
error: function(xhr) {
  console.log('Schema Explorer error status:', xhr.status);
  console.log('Schema Explorer error responseText:', xhr.responseText);
  hideOverlay();
  const store = readSchemaExplorerStore();
  store[String(dbId)] = { db_id: dbId, fetched_at: new Date().toISOString(), ok: true, html: xhr.responseText || null };
  writeSchemaExplorerStore(store);
  console.log('Schema Explorer stored payload:', store[String(dbId)]);
  window.location.href = `${schemaExplorerPage}?db_id=${encodeURIComponent(dbId)}`;
}
  });
}

function simulateStep(cardIdx, stepIdx) {
  const state = pipelineStates[cardIdx];
  if (!state || !state.running) return;
  setArrowState(cardIdx, stepIdx, 'arrow-moving');
  state.timer = setTimeout(function() {
    if (!pipelineStates[cardIdx]?.running) return;
    setArrowState(cardIdx, stepIdx, 'arrow-done');
    const nextIdx = stepIdx + 1;
    if (nextIdx >= PIPELINE_STEPS.length) {
      setPipelineStepState(cardIdx, PIPELINE_STEPS.length - 1, getPipelineStepStateClass(PIPELINE_STEPS[PIPELINE_STEPS.length - 1].id, 'complete'));
      setCardTransferState(cardIdx, 'complete');
      pipelineStates[cardIdx].running = false;
      return;
    }
    setPipelineStepState(cardIdx, stepIdx, getPipelineStepStateClass(PIPELINE_STEPS[stepIdx].id, 'complete'));
    setPipelineStepState(cardIdx, nextIdx, getPipelineStepStateClass(PIPELINE_STEPS[nextIdx].id, 'active'));
    pipelineStates[cardIdx].currentStep = nextIdx;
    if (nextIdx < PIPELINE_STEPS.length - 1) {
      simulateStep(cardIdx, nextIdx);
    } else {
      state.timer = setTimeout(function() {
        setPipelineStepState(cardIdx, nextIdx, getPipelineStepStateClass(PIPELINE_STEPS[nextIdx].id, 'complete'));
        setCardTransferState(cardIdx, 'complete');
        pipelineStates[cardIdx].running = false;
      }, 1200);
    }
  }, 1800);
}
function handleRunAssessment(cardIdx) {
  const state = pipelineStates[cardIdx];
  if (!state || state.running) return;

  const dbId = getCardDbId(cardIdx);
  state.running = true;

  setPipelineStepState(cardIdx, 0, getPipelineStepStateClass(PIPELINE_STEPS[0].id, 'active'));
  setArrowState(cardIdx, 0, 'arrow-moving');
  //showOverlay('Collecting your databases...');
  setCardTransferState(cardIdx, 'running');
  // Update status pill from NEW → In Progress
  const pipeline = document.getElementById('pipeline-' + cardIdx);
  const card = pipeline ? pipeline.closest('[data-prev-db-card]') : null;
  if (card) {
  const newPill = card.querySelector('[data-new-pill]');
  if (newPill) {
    newPill.textContent = 'In Progress';
    newPill.hidden = false;
    newPill.style.background = '#fff7ed';
    newPill.style.color = '#c2410c';
    newPill.style.borderColor = '#fed7aa';
  }
}

  const srcRecord = (dbHistoryRecords[cardIdx] && dbHistoryRecords[cardIdx].source) || {};
  console.log('full srcRecord:', JSON.stringify(srcRecord));

  let host = srcRecord.host || '';
  let port = srcRecord.port || '';

  if (!port && typeof host === 'string' && host.includes(':') && !host.startsWith('http')) {
    const parts = host.split(':');
    const possiblePort = parts[parts.length - 1];
    if (!isNaN(possiblePort)) {
      port = possiblePort;
      host = parts.slice(0, parts.length - 1).join(':');
    }
  }

  if (!port) {
    const t = String(srcRecord.type || '').toLowerCase();
    if (t.includes('postgres')) port = 5432;
    else if (t.includes('mysql')) port = 3306;
    else if (t.includes('sql server') || t.includes('mssql')) port = 1433;
    else if (t.includes('oracle')) port = 1521;
    else if (t.includes('snowflake') || t.includes('databricks')) port = 443;
  }

  $.ajax({
    url: 'https://tkwmf35jnmecgphf7axr5gkqaq0qwauy.lambda-url.ap-south-1.on.aws',
    type: 'POST',
    data: {
    action: 'start_migration',
    user_id: parseUserJson(sessionStorage.getItem('userJson')).userid,
    entity: getCurrentCompanyName(),
    bu_id: srcRecord.bu_id || '',
    db_type: srcRecord.type || '',
    //db_version: '',
    db_name: srcRecord.name || '',
    db_host: srcRecord.host || '',
    db_port: '23043',
  //db_username: '',
  //db_password: '',
  //approver_email1: srcRecord.approver1 || '',
  //approver_email2: srcRecord.approver2 || '',
  //description: srcRecord.desc || '',
    db_id: dbId
},
    dataType: 'json',
    complete: function(xhr) {
  console.log('Run Assessment — save API response:', xhr.responseJSON || xhr.responseText);

  // Show extraction started overlay for 2s then begin polling status_reader
  showOverlay('Assessment Started...');

  setTimeout(function() {
    showOverlay('Starting Migration...');

    setTimeout(function() {
      showOverlay('Getting Status...');

      setCardTransferState(cardIdx, '');
      setArrowState(cardIdx, 0, 'arrow-done');
      setPipelineStepState(cardIdx, 0, getPipelineStepStateClass(PIPELINE_STEPS[0].id, 'complete'));
      setPipelineStepState(cardIdx, 1, getPipelineStepStateClass(PIPELINE_STEPS[1].id, 'active'));

      // Poll status_reader every 4 seconds
      const pollInterval = setTimeout(function() {
        $.ajax({
        url: 'https://f3pt5mhs4renqnqqcf24q4hudy0mkdpx.lambda-url.ap-south-1.on.aws',
        type: 'POST',
        data: {
          db_id:   dbId,
          user_id: getSafeUserId(),
          db_type: srcRecord.type || '',
          db_name: srcRecord.name || '',
          entity:  getCurrentCompanyName()
        },
        dataType: 'json',
        complete: function(xhr2) {
          console.log('status_reader response:', xhr2.responseJSON || xhr2.responseText);
          hideOverlay();
          const res2 = xhr2.responseJSON;
          
          // Parse table counts
          if (res2 && res2['table-counts']) {
            let tableCountsRaw = res2['table-counts'];
            let tableCounts = [];
            try {
              // Convert Python tuples (...) to JSON arrays [...]
              const cleaned = tableCountsRaw
                .replace(/'/g, '"')
                .replace(/\(/g, '[')
                .replace(/\)/g, ']')
                .replace(/\bNone\b/g, 'null')
                .replace(/\bTrue\b/g, 'true')
                .replace(/\bFalse\b/g, 'false');
              const parsed = JSON.parse(cleaned);
              tableCounts = parsed.table_counts || [];
            } catch(e) {
              console.warn('Failed to parse table-counts:', e);
            }

            if (tableCounts.length > 0) {
              // Build a Map of schema.table -> count
              const countMap = new Map();
              let grandTotal = 0;
              tableCounts.forEach(function(entry) {
                const key = entry[0]; // e.g. "ecommerce.returns"
                const count = entry[1] || 0;
                countMap.set(key, count);
                grandTotal += count;
              });

              //sessionStorage.setItem('tableCountMap_' + dbId, JSON.stringify(Array.from(countMap.entries())));
              //count logic
              // // Show total next to Source heading
              // const pipeline3 = document.getElementById('pipeline-' + cardIdx);
              // const card3 = pipeline3 ? pipeline3.closest('[data-prev-db-card]') : null;
              // if (card3) {
              //   const srcHeading = card3.querySelector('.prev-db-source .prev-db-heading-label');
              //   if (srcHeading && !srcHeading.querySelector('.table-count-badge')) {
              //     const badge = document.createElement('span');
              //     badge.className = 'table-count-badge';
              //     badge.style.cssText = 'margin-left:auto;font-size:11px;font-weight:700;color:#6b7280;border:1px solid #d1d5db;border-radius:999px;padding:2px 8px;background:#f9fafb;';
              //     badge.textContent = grandTotal.toLocaleString() + ' rows';
              //     srcHeading.parentElement.style.display = 'flex';
              //     srcHeading.parentElement.style.justifyContent = 'space-between';
              //     srcHeading.parentElement.style.alignItems = 'center';
              //     srcHeading.parentElement.appendChild(badge);
              //   }

              //   // Show 0 next to Target heading
              //   const tgtHeading = card3.querySelector('.prev-db-target .prev-db-heading-label');
              //   if (tgtHeading && !tgtHeading.querySelector('.table-count-badge')) {
              //     const badge2 = document.createElement('span');
              //     badge2.className = 'table-count-badge';
              //     badge2.style.cssText = 'margin-left:auto;font-size:11px;font-weight:700;color:#6b7280;border:1px solid #d1d5db;border-radius:999px;padding:2px 8px;background:#f9fafb;';
              //     badge2.textContent = '0 rows';
              //     tgtHeading.parentElement.style.display = 'flex';
              //     tgtHeading.parentElement.style.justifyContent = 'space-between';
              //     tgtHeading.parentElement.style.alignItems = 'center';
              //     tgtHeading.parentElement.appendChild(badge2);
              //   }
              // }
            }
          }
          
          if (res2 && res2.status && Array.isArray(res2.status)) {
            const items = res2.status;
            let extractedCount = 0;
            const typeStats = new Map();

            items.forEach(item => {
            const type = item.type || 'unknown';
            if (!typeStats.has(type)) typeStats.set(type, { total: 0, extracted: 0 });
            typeStats.get(type).total++;
            if (item.status && item.status.includes('Extracted') && !item.status.includes('in Progress')) {
            if ((item.type || '').toLowerCase() !== 'sequences') extractedCount++;
            typeStats.get(type).extracted++;
          } else if ((item.type || '').toLowerCase() === 'sequences') {
            typeStats.get(type).extracted++;
            }
           }
        );
            // const typeStats = {};

            // items.forEach(item => {
            //   const type = item.type || 'unknown';
            //   if (!typeStats[type]) typeStats[type] = { total: 0, extracted: 0 };
              
            //   typeStats[type].total++;
              
            //   if (item.status && item.status.includes('Extracted') && !item.status.includes('in Progress')) {
            //     extractedCount++;
            //     typeStats[type].extracted++;
            //   }
            // });
            const nonSeqItems = items.filter(item => (item.type || '').toLowerCase() !== 'sequences');
            const nonSeqExtracted = nonSeqItems.filter(item => item.status === 'DDL - Extracted').length;
            if (nonSeqItems.length > 0 && (nonSeqExtracted / nonSeqItems.length) >= 0.9) {
            setPipelineStepState(cardIdx, 1, getPipelineStepStateClass(PIPELINE_STEPS[1].id, 'complete'));
            setPipelineStepState(cardIdx, 2, getPipelineStepStateClass(PIPELINE_STEPS[2].id, 'active'));
            setArrowState(cardIdx, 1, 'arrow-done');

  // Update status pill → DDL Extracted
            const pipeline2 = document.getElementById('pipeline-' + cardIdx);
            const card2 = pipeline2 ? pipeline2.closest('[data-prev-db-card]') : null;
            if (card2) {
              const newPill = card2.querySelector('[data-new-pill]');
                if (newPill) {
                  newPill.textContent = 'DDL Extracted';
                  newPill.hidden = false;
                  newPill.style.background = '#f0fdf4';
                  newPill.style.color = '#15803d';
                  newPill.style.borderColor = '#bbf7d0';
    }
  }
}

            const pipeline = document.getElementById('pipeline-' + cardIdx);
            const card = pipeline ? pipeline.closest('[data-prev-db-card]') : null;
            if (card) {
              let statsContainer = card.querySelector('.stat-chips-container');
              if (!statsContainer) {
                statsContainer = document.createElement('div');
                statsContainer.className = 'stat-chips-container';
                statsContainer.style.display = 'flex';
                statsContainer.style.flexWrap = 'wrap';
                statsContainer.style.gap = '8px';
                statsContainer.style.padding = '10px 0 0 0';
                statsContainer.style.background = 'none';
                statsContainer.style.justifyContent = 'flex-start';
                card.querySelector('[data-target-details]').appendChild(statsContainer);
              }
              statsContainer.innerHTML = '';
            
              const icons = {
                tables: 'fa-table',
                views: 'fa-eye',
                functions: 'fa-code',
                sequences: 'fa-list-ol',
                unknown: 'fa-database'
              };

              typeStats.forEach(function(stats, type) {
                const iconClass = icons[type.toLowerCase()] || icons.unknown;
                const chip = document.createElement('div');
                chip.title = `${type}: ${stats.total}`;
                chip.style.display = 'inline-flex';
                chip.style.alignItems = 'center';
                chip.style.gap = '5px';
                chip.style.padding = '4px 10px';
                chip.style.borderRadius = '999px';
                chip.style.border = '1px solid #d1d5db';
                chip.style.background = '#fff';
                chip.style.color = '#374151';
                chip.style.fontSize = '12px';
                chip.style.fontWeight = '600';
                chip.style.cursor = 'default';
                const displayCount = type.toLowerCase() === 'sequences' ? stats.total : stats.extracted;
                chip.innerHTML = `
                  <i class="fa-solid ${iconClass}" style="font-size:11px;color:#6b7280;"></i>
                  <span>${displayCount}</span>
                `; 
                statsContainer.appendChild(chip);
              });

              if (dbHistoryRecords[cardIdx]) {
                dbHistoryRecords[cardIdx].typeStats = typeStats;
                if (window.updateGlobalChart) window.updateGlobalChart();
              }
            }
          }

          if (res2 && res2['binary-cols']) {
            const store = readSchemaExplorerStore();
            if (!store[String(dbId)]) store[String(dbId)] = {};
            store[String(dbId)].binaryCols = res2['binary-cols'];
            store[String(dbId)].db_id = dbId;
            writeSchemaExplorerStore(store);
            showBinaryExplorerButton(cardIdx);
          }
        }
      });
    });

    // Store interval so it can be cleared later
    //pipelineStates[cardIdx].pollInterval = pollInterval;

    if (dbId) showSchemaExplorerButton(cardIdx);
    state.running = false;
  }, 1000);
}, 1000);
}
  });
}

// function handleRunAssessment(cardIdx) {
//   const state = pipelineStates[cardIdx];
//   if (!state || state.running) return;
//   const dbId = getCardDbId(cardIdx);
//   state.running = true;
//   showOverlay('Collecting your databases...');
//   setCardTransferState(cardIdx, 'running');
//   fetchSchemaExplorerAssessment(dbId).finally(function() {
//     hideOverlay();
//     setCardTransferState(cardIdx, '');
//     setPipelineStepState(cardIdx, 0, getPipelineStepStateClass(PIPELINE_STEPS[0].id, 'complete'));
//     setPipelineStepState(cardIdx, 1, getPipelineStepStateClass(PIPELINE_STEPS[1].id, 'active'));
//     setArrowState(cardIdx, 0, 'arrow-done');
//     if (dbId) showSchemaExplorerButton(cardIdx);
//     state.running = false;
//   });
// }

$(document).on('click', '.pipeline-btn[data-step="run-assessment"]', function() {
  handleRunAssessment(parseInt($(this).data('card')));
});

$(document).on('click keydown', '[data-schema-explorer-btn]', function(e) {
  if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  e.stopPropagation();

  const $card = $(this).closest('[data-prev-db-card]');
  const dbId = String($card.data('dbId') || '').trim();
  if (!dbId) return;
  openSchemaExplorerPage(dbId);
});

$(document).on('click keydown', '[data-binary-explorer-btn]', function(e) {
  if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  e.stopPropagation();

  const $card = $(this).closest('[data-prev-db-card]');
  const dbId = String($card.data('dbId') || '').trim();
  if (!dbId) return;

  const store = readSchemaExplorerStore();
  const payload = store[String(dbId)];
  if (payload && payload.binaryCols) {
  const srcRec = dbHistoryRecords.find(r => r.source && String(r.source.id) === String(dbId))?.source || {};
  sessionStorage.setItem('binaryExplorerData', JSON.stringify({
  db_id: dbId,
  binaryCols: payload.binaryCols,
  db_name: srcRec.name || '',
  db_type: srcRec.type || '',
  entity: getCurrentCompanyName()
}));
    window.location.href = 'binary_explorer.html';
  }
});

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
      console.log('raw records:', JSON.stringify(raw[0]));
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


function createDbDetailRow(label, value) {
  if (!value || value === '' || value === 'undefined' || value === 'null') return null;
  const row = cloneTemplateElement('previousDbDetailRowTemplate');
  if (!row) return null;

  row.querySelector('[data-detail-label]').textContent = label;
  row.querySelector('[data-detail-value]').textContent = value;
  return row;
}

function getDbTypePresentation(type) {
  const t = String(type || '').toLowerCase().trim();
  if (t.includes('postgresql') || t.includes('postgres')) {
    return {
      displayName: 'PostgreSQL',
      iconKind: 'image',
      iconSrc: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg',
      iconAlt: 'PostgreSQL'
    };
  }
  if (t.includes('mysql')) {
    return {
      displayName: 'MySQL',
      iconKind: 'image',
      iconSrc: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg',
      iconAlt: 'MySQL'
    };
  }
  if (t.includes('sql server') || t.includes('sqlserver') || t.includes('mssql')) {
    return {
      displayName: 'SQL Server',
      iconKind: 'image',
      iconSrc: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/microsoftsqlserver/microsoftsqlserver-plain.svg',
      iconAlt: 'SQL Server'
    };
  }
 
if (t.includes('snowflake')) {
    return {
      displayName: 'Snowflake',
      iconKind: 'image',
      iconSrc:'snowflake-logo.png',
  }
}
  if (t.includes('databricks')) {
    return {
      displayName: 'Databricks',
      iconKind: 'image',
      iconSrc: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/databricks.svg',
      iconAlt: 'Databricks',
      iconFilter: 'invert(36%) sepia(93%) saturate(1352%) hue-rotate(346deg) brightness(97%) contrast(97%)'
    };
  }
if (t.includes('fabric') || t.includes('onelake')) {
    return {
      displayName: 'Fabric OneLake',
      iconKind: 'image',
      iconSrc:'Fabric-onelake.png',
      //iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="width:32px;height:32px"><defs><linearGradient id="fg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#00C9A7"/><stop offset="100%" stop-color="#00897B"/></linearGradient></defs><path d="M15 20 Q15 10 25 10 L60 10 Q80 10 85 30 L85 55 Q85 70 70 75 L45 85 Q30 92 20 80 L15 60 Z" fill="url(#fg)"/><path d="M30 35 Q28 50 35 60 L55 75 Q65 80 72 68 L80 50 Q82 35 70 28 L45 22 Q32 20 30 35Z" fill="rgba(255,255,255,0.25)"/></svg>`
    };
  }
  return {
    displayName: type || '—',
    iconKind: 'icon',
    iconClass: 'fa-solid fa-database',
    iconColor: 'var(--lv-indigo)'
  };
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
      bu_id: row.bu_id || '',
      type: row.db_type || row.type || '—',
      name: row.db_name || row.name || '—',
      host: row.db_host || row.host_url || row.host || '—',
      port: row.db_port || row.port || '',
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
function createDbTypeBlock(type) {
  const block = cloneTemplateElement('previousDbTypeBlockTemplate');
  if (!block) return null;

  const presentation = getDbTypePresentation(type);
  const iconMount = block.querySelector('[data-db-type-icon]');
  const nameMount = block.querySelector('[data-db-type-name]');
  if (presentation.iconKind === 'svg') {
    const wrapper = document.createElement('span');
    wrapper.innerHTML = presentation.iconSvg;
    iconMount.appendChild(wrapper);
    nameMount.textContent = presentation.displayName;
    return block;
  }
  if (presentation.iconKind === 'image') {
    const img = document.createElement('img');
    img.src = presentation.iconSrc;
    img.alt = presentation.iconAlt || presentation.displayName;
    img.style.width = '32px';
    img.style.height = '32px';
    if (presentation.iconFilter) img.style.filter = presentation.iconFilter;
    iconMount.appendChild(img);
  } else {
    const icon = document.createElement('i');
    icon.className = presentation.iconClass;
    icon.style.fontSize = '28px';
    icon.style.color = presentation.iconColor;
    iconMount.appendChild(icon);
  }

  nameMount.textContent = presentation.displayName;
  return block;
}

function appendDbDetails(container, details) {
  details.forEach(function(detail) {
    const row = createDbDetailRow(detail.label, detail.value);
    if (row) container.appendChild(row);
  });
}

// Renders the previous database cards based on the paired records
function renderPreviousDbCards(records) {
  const container = document.getElementById('previousDbCards');
  if (!container) return;

  const fragment = document.createDocumentFragment();

  records.forEach(function(record, idx) {
    const card = cloneTemplateElement('previousDbCardTemplate');
    if (!card) return;

    const src = record.source;
    const tgt = record.target;
    const hasSource = !!src;
    const hasTarget = !!tgt;
    const s = hasSource ? src : { id:'—', type:'—', name:'—', host:'—', status:'—', approver1:'', approver2:'', desc:'' };
    const t = hasTarget ? tgt : null;
    const summaryName = hasSource ? s.name : (hasTarget ? t.name : 'Database Pair');
    const summaryMeta = hasTarget ? `${s.type} to ${t.type}` : `${s.type} source`;
    const isNewStatus = [s.status, hasTarget ? t.status : ''].some(function(status) {
      return String(status || '').trim().toUpperCase() === 'NEW';
    });
    const dbId = String((hasSource && s.id && s.id !== '—' ? s.id : (hasTarget && t ? t.id : '')) || '').trim();

    initPipelineState(idx);
    card.dataset.cardIdx = String(idx);
    card.dataset.dbId = dbId;

    card.querySelector('[data-summary-name]').textContent = summaryName;
    card.querySelector('[data-summary-meta]').textContent = `Database ${idx + 1} • ${summaryMeta}`;

    const newPill = card.querySelector('[data-new-pill]');
    newPill.hidden = !isNewStatus;

    const schemaButton = card.querySelector('[data-schema-explorer-btn]');
    if (schemaButton) {
      schemaButton.hidden = true;
      schemaButton.textContent = 'Schema Explorer';
    }

    const sourceTypeMount = card.querySelector('[data-source-type]');
    const sourceDetailsMount = card.querySelector('[data-source-details]');
    const sourceTypeBlock = createDbTypeBlock(s.type);
    if (sourceTypeBlock) sourceTypeMount.appendChild(sourceTypeBlock);
    appendDbDetails(sourceDetailsMount, [
      { label: 'DB Name', value: s.name },
      { label: 'Host', value: s.host },
      { label: 'Status', value: s.status },
      { label: 'Approver 1', value: s.approver1 },
      { label: 'Approver 2', value: s.approver2 },
      { label: 'Description', value: s.desc }
    ]);

    const targetSide = card.querySelector('[data-target-side]');
    const targetContent = card.querySelector('[data-target-content]');
    const targetEmpty = card.querySelector('[data-target-empty]');
    if (hasTarget) {
      const targetTypeBlock = createDbTypeBlock(t.type);
      if (targetTypeBlock) {
        card.querySelector('[data-target-type]').appendChild(targetTypeBlock);
      }
      appendDbDetails(card.querySelector('[data-target-details]'), [
        { label: 'DB Name', value: t.name },
        { label: 'Host', value: t.host },
        { label: 'Status', value: t.status },
        { label: 'Description', value: t.desc }
      ]);
      targetContent.hidden = false;
      targetEmpty.hidden = true;
    } else {
      targetSide.classList.add('prev-db-target-empty');
      targetContent.hidden = true;
      targetEmpty.hidden = false;
    }

    card.querySelector('[data-pipeline-mount]').appendChild(buildPipelineElement(idx));
    fragment.appendChild(card);
  });

  container.replaceChildren(fragment);
  bindPreviousDbToggles();
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
      data: { entity:  entity },
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

  const srcText = $('#src_bu_id option:selected').text().trim();
  const srcVal  = $('#src_bu_id option:selected').val().trim();
  if (srcVal) {
    $('#bu_id').val(srcText);
    $('#bu_id_value').val(srcVal);
    $('#bu_id')
      .prop('disabled', true)
      .css({ 'background': '#f3f0ff', 'color': '#5b3ed6', 'border-color': '#d9cffd', 'pointer-events': 'none' });
  }
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
  const selectedVal  = $('#src_bu_id option:selected').val().trim();

  // Show the name in the visible input, store the ID in the hidden input
  $('#bu_id').val(selectedText);
  $('#bu_id_value').val(selectedVal);

  // Lock target BU
  $('#bu_id')
    .prop('disabled', true)
    .css({ 'background': '#f3f0ff', 'color': '#5b3ed6', 'border-color': '#d9cffd', 'pointer-events': 'none' });
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
  
  showOverlay("Testing...");

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
  showOverlay("Saving...");

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

  //Check for duplicate source database in history
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
      entity: $('#src_entity_id').val().trim(),  
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
showOverlay("Saving target...");
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
      bu_id: $('#bu_id_value').val() || $('#src_bu_id').val() || '',
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

window.updateGlobalChart = function() {
  const globalStats = new Map();

  dbHistoryRecords.forEach(function(record) {
    if (record && record.typeStats) {
      record.typeStats.forEach(function(stats, type) {
        const typeName = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
        if (!globalStats.has(typeName)) {
          globalStats.set(typeName, 0);
        }
        globalStats.set(typeName, globalStats.get(typeName) + stats.extracted);
      });
    }
  });

  if (globalStats.size === 0) {
    dbMiniChart.data.labels = ['Users', 'Orders', 'Logs', 'Audit'];
    dbMiniChart.data.datasets[0].data = [120, 90, 140, 60];
  } else {
    const labels = Array.from(globalStats.keys());
    const data = Array.from(globalStats.values());
    dbMiniChart.data.labels = labels;
    dbMiniChart.data.datasets[0].data = data;
    
    const bgColors = ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#0dcaf0', '#6610f2', '#fd7e14'];
    dbMiniChart.data.datasets[0].backgroundColor = labels.map(function(_, i) { return bgColors[i % bgColors.length]; });
  }
  
  dbMiniChart.update();
};


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