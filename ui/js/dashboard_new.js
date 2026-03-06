
  // if (sessionStorage.getItem("isLoggedIn") !== "1") {
  //   location.replace("lvd.html");
  // }

  /************* CONFIG SESSION DETAILS *************/
  userid = sessionStorage.getItem("userid");
  subscription = sessionStorage.getItem("subscription");
  secret = sessionStorage.getItem("secret");
  email = sessionStorage.getItem("email");
  /************* SAMPLE DATA *************/


  let demo = {
    totalDBs: 120,
    active: 96,
    archived: 18,
    pending: 6,
    timeline: {
      labels: ["6d","5d","4d","3d","2d","1d","now"],
      total:   [110,112,115,118,119,120,120],
      active:  [90,91,93,94,95,96,96],
      pending: [3,3,4,5,5,6,6]
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

  // /************* CHARTS *************/
  // const dbMiniCtx = document.getElementById('dbMiniChart').getContext('2d');
  // const dbMiniChart = new Chart(dbMiniCtx, {
  //   type: 'bar',
  //   data: { labels: ['Users','Orders','Logs','Audit'], datasets: [{ data: [120,90,140,60], backgroundColor: ['#7c63ff','#8b76ff','#b6a8ff','#dcd7ff'] }] },
  //   options: { plugins:{legend:{display:false}}, scales:{x:{display:false}, y:{display:false}}, maintainAspectRatio:false }
  // });

  // const sftpMiniCtx = document.getElementById('sftpMiniChart').getContext('2d');
  // const sftpMiniChart = new Chart(sftpMiniCtx, {
  //   type: 'line',
  //   data: { labels: ['Mon','Tue','Wed','Thu','Fri'], datasets: [{ data: [4,5,3,7,6], borderColor: '#5b3ed6', fill:true, backgroundColor:'rgba(91,62,214,0.08)' }] },
  //   options: { plugins:{legend:{display:false}}, scales:{x:{display:false}, y:{display:false}}, maintainAspectRatio:false }
  // });

  // const ctxOverview = document.getElementById('dbOverviewChart').getContext('2d');
  // let dbOverviewChart = new Chart(ctxOverview, {
  //   type: 'line',
  //   data: {
  //     labels: demo.timeline.labels,
  //     datasets: [
  //       { label: 'Total DBs', data: demo.timeline.total, borderColor: '#6a5acd', backgroundColor: 'rgba(106,90,205,0.12)', tension:0.35, fill:true },
  //       { label: 'Active', data: demo.timeline.active, borderColor: '#5b3ed6', backgroundColor: 'rgba(91,62,214,0.08)', tension:0.35, fill:true },
  //       { label: 'Pending', data: demo.timeline.pending, borderColor: '#ff8a65', backgroundColor: 'rgba(255,138,101,0.08)', tension:0.35, fill:true }
  //     ]
  //   },
  //   options: {
  //     responsive:true,
  //     maintainAspectRatio:false,
  //     interaction:{ mode:'index', intersect:false },
  //     plugins:{ legend:{ position:'top' } },
  //     scales: { y:{ beginAtZero:true } }
  //   }
  // });

  // // Refresh simulated
  // $('#refreshData').on('click', function(){
  //   $(this).prop('disabled', true).text('Refreshing...');
  //   setTimeout(() => {
  //     demo.totalDBs += Math.round(Math.random()*3);
  //     demo.active += Math.round(Math.random()*2);
  //     demo.pending = Math.max(0, demo.pending + (Math.random()>0.8?1:0));
  //     const newValTotal = demo.timeline.total[demo.timeline.total.length-1] + Math.round(Math.random()*2);
  //     const newValActive = demo.timeline.active[demo.timeline.active.length-1] + Math.round(Math.random()*1);
  //     const newValPending = demo.timeline.pending[demo.timeline.pending.length-1] + (Math.random()>0.85?1:0);
  //     demo.timeline.labels.shift(); demo.timeline.labels.push('now');
  //     demo.timeline.total.shift(); demo.timeline.total.push(newValTotal);
  //     demo.timeline.active.shift(); demo.timeline.active.push(newValActive);
  //     demo.timeline.pending.shift(); demo.timeline.pending.push(newValPending);
  //     applyStats();
  //     dbOverviewChart.data.labels = demo.timeline.labels;
  //     dbOverviewChart.data.datasets[0].data = demo.timeline.total;
  //     dbOverviewChart.data.datasets[1].data = demo.timeline.active;
  //     dbOverviewChart.data.datasets[2].data = demo.timeline.pending;
  //     dbOverviewChart.update();
  //     $('#refreshData').prop('disabled', false).html('<i class="fa-solid fa-arrows-rotate"></i> Refresh');
  //   }, 800);
  // });

  /************* MODAL & FORM *************/
  const addDbModal = new bootstrap.Modal(document.getElementById('addDbModal'));
  $('#addDatabaseBtn').on('click', () => {
    $('#modalAlert').hide();
    $('#addDbForm')[0].reset();
    $('#message').removeClass('success error').text('');
    $('#saveDetailsBtn').prop('disabled', true).text('Save Details');
    $('#testConnectionBtn').prop('disabled', true).text('Test Connection');
    addDbModal.show();
  });

  function isCompanyEmail(email){
    if(!email) return false;
    const lower = email.toLowerCase().trim();
    const free = ['gmail.com','yahoo.com','outlook.com','hotmail.com','live.com'];
    return !free.some(d => lower.endsWith('@'+d));
  }

  // enable submit when required fields valid
  $('#addDbForm input, #addDbForm select').on('input change', function(){
    const required = ['#dbType','#dbVersion','#dbHost','#dbPort','#dbUser','#dbPass'];
    const ok = required.every(sel => $(sel).val() && $(sel).val().toString().trim() !== '');
    $('#testConnectionBtn').prop('disabled', !(ok));
  });

  // $('#addDbForm').on('submit', async function(e){
  //   e.preventDefault();
  //   $('#modalAlert').hide();
  //   $('#saveDetailsBtn').prop('disabled', true).text('Submitting...');

  //   const payload = {
  //     dbType: $('#dbType').val(),
  //     version: $('#dbVersion').val(),
  //     host: $('#dbHost').val(),
  //     port: $('#dbPort').val(),
  //     username: $('#dbUser').val(),
  //     password: $('#dbPass').val(),
  //     approver1: $('#approver1').val(),
  //     approver2: $('#approver2').val(),
  //     description: $('#dbDesc').val(),
  //     timestamp: new Date().toISOString()
  //   };

  //   if(!isCompanyEmail(payload.approver1)){
  //     $('#modalAlert').removeClass().addClass('alert alert-danger').text('Approver Email 1 must be a company email (not personal)').show();
  //     $('#saveDetailsBtn').prop('disabled', false).text('Save Details');
  //     return;
  //   }

  //   // Dummy POST to Lambda (replace LAMBDA_ENDPOINT with real URL)
  //   try {
  //     const res = await fetch(LAMBDA_ENDPOINT, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify(payload)
  //     });

  //     if(!res.ok){
  //       const txt = await res.text().catch(()=>res.statusText);
  //       throw new Error(txt || 'Server error ' + res.status);
  //     }

  //     $('#modalAlert').removeClass().addClass('alert alert-success').text('Migration request submitted.').show();
  //     setTimeout(()=> { addDbModal.hide(); }, 900);

  //   } catch(err) {
  //     $('#modalAlert').removeClass().addClass('alert alert-danger').text('Failed to submit migration: ' + err.message).show();
  //   } finally {
  //     $('#saveDetailsBtn').prop('disabled', false).text('Save Details');
  //   }
  // });


//Test connection
$('#testConnectionBtn').on('click', function(event) {
    console.log("Test DB Connection button clicked!");
    
    messageDiv = $('#message');

    dbType = $('#dbType option:selected').val(); 
    dbVersion = $('#dbVersion').val().trim();
    dbHost = $('#dbHost').val().trim();
    dbPort = $('#dbPort').val().trim();
    dbName = $('#dbName').val().trim();
    dbUser = $('#dbUser').val().trim();
    dbPass = $('#dbPass').val().trim();
    dbDesc = $('#dbDesc').val().trim();

    approver1 = $('#approver1').val().trim();
    approver2 = $('#approver2').val().trim();

    messageDiv.removeClass('success error').text(''); // Clear previous messages 
    messageDiv.addClass('success').text('Testing Connection...'); 
    setTimeout(function (){
        $.ajax({
            url: 'https://tkwmf35jnmecgphf7axr5gkqaq0qwauy.lambda-url.ap-south-1.on.aws', 
            type: 'POST', 
            data: { 
                action: "test", 
                user_id: userid, 
                db_type: dbType, 
                db_version: dbVersion, 
                db_name: dbName, 
                db_host: dbHost, 
                db_port: dbPort, 
                db_username: dbUser, 
                db_password: dbPass
            },
            dataType: 'json',
            async: false,
            success: function(response) { 
                console.log('Success:', response);
              
                // If all validation passes (simulate successful signup)
                messageDiv.addClass('success').text('Connection successful!'); 

                $('#saveDetailsBtn').prop('disabled', false).text('Save Details');
            },
            error: function(xhr, status, error) { 
                // console.error('Error:', status);
                // Handle the error
                console.log("Error:", error);
                messageDiv.addClass('error').text("Connection Failed!"); 
            }
        });
        // Clear the form fields after successful submission
        // $('#signupForm')[0].reset();
    }, 1700);
  });



    //Save connection details
    $('#saveDetailsBtn').on('click', function() {
        console.log("Save DB Details button clicked!");
        messageDiv = $('#message');

        dbType = $('#dbType option:selected').val(); 
        dbVersion = $('#dbVersion').val().trim();
        dbHost = $('#dbHost').val().trim();
        dbPort = $('#dbPort').val().trim();
        dbName = $('#dbName').val().trim();
        dbUser = $('#dbUser').val().trim();
        dbPass = $('#dbPass').val().trim();
        dbDesc = $('#dbDesc').val().trim();

        approver1 = $('#approver1').val().trim();
        approver2 = $('#approver2').val().trim();

        messageDiv.removeClass('success error').text(''); // Clear previous messages 

        if(!isCompanyEmail(approver1)){
          $('#modalAlert').removeClass().addClass('alert alert-danger').text('Approver Email 1 is required').show();
          return;
        }

        $('#modalAlert').hide();
        messageDiv.addClass('success').text('Saving Connection Details...'); 
        setTimeout(function (){
            $.ajax({
                url: 'https://tkwmf35jnmecgphf7axr5gkqaq0qwauy.lambda-url.ap-south-1.on.aws', 
                type: 'POST', 
                data: { 
                    action: "save", 
                    user_id: userid, 
                    db_type: dbType, 
                    db_version: dbVersion, 
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
                async: false,
                success: function(response) { 
                    console.log('Success:', response);
                    // alert(response.text);
                    $('#d1').hide();
                    // If all validation passes (simulate successful signup)
                    messageDiv.addClass('success').text('Connection details saved successful!'); 
                },
                error: function(xhr, status, error) { 
                    // console.error('Error:', status);
                    // Handle the error
                    console.log("Error:", error);
                    messageDiv.addClass('error').text("Connection details not saved!"); 
                }
            });
            // Clear the form fields after successful submission
            // $('#signupForm')[0].reset();
        }, 1700);
    });

    // Logout is handled by js/logout.js (all tokens sent, redirect to lvd.html)

  /************* INTERACTIVITY *************/
  $('.card-compact').css('cursor','pointer').on('click', function(){
    $(this).toggleClass('active');
    $(this).find('canvas').each(function(){
      const node = this;
      node.style.opacity = 0.6;
      setTimeout(()=> node.style.opacity = 1, 300);
    });
  });

  // accessibility: Enter opens modal
  $('#startMigrationBtn').on('keypress', function(e){ if(e.key === 'Enter') $(this).click(); });

  // initial decorative animation
  $(document).ready(function() {
    $('.card-compact').css('transform','translateY(8px)').animate({opacity:1},300);

    try {
      if (sessionStorage.getItem('sessionPingSent') === '1') return;

      setTimeout(function (){
        $.ajax({
          url: 'https://tnvb3jqjm2cbyoqi35xe2t7zxa0mwqzk.lambda-url.ap-south-1.on.aws',
          type: 'POST',
          async: true,
          data: { 
            action: "login", 
            user_id: sessionStorage.getItem("userid"), 
            secret: secret, 
            email: email,
            login_at: Date.now(), 
            last_active: Date.now() 
          },
          dataType: 'json', // optional, depends on your API response
          success: function(response, textStatus, xhr) {
            console.log('Session saved (jQuery):', response);
            sessionStorage.setItem('sessionPingSent', '1');
          },
          error: function(xhr, textStatus, errorThrown) {
            console.error('Session save failed:', textStatus, errorThrown, xhr.responseText);
            // Optionally retry later — do not set sessionPingSent so it can be retried
          }
        });
      }, 1700);
    } catch (e) {
      console.error('sendSessionOnce_jquery error:', e);
    }

  });
