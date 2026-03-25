const nameRegex = /^[a-zA-Z\s'-]+$/;

const emailRegex =
/^[a-zA-Z0-9._%+-]+@(?!gmail\.com$)(?!googlemail\.com$)(?!yahoo\.com$)(?!yahoo\.co\.in$)(?!hotmail\.com$)(?!outlook\.com$)(?!live\.com$)(?!icloud\.com$)(?!aol\.com$)(?!protonmail\.com$)(?!proton\.me$)(?!gmx\.com$)(?!zoho\.com$)(?!yandex\.com$)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const phoneRegex = /^\+[1-9]\d{1,14}$/;

//For tracking 30 mins logged in window
localStorage.setItem('sessionStart', String(Date.now()));
localStorage.removeItem('sessionExpired'); // clear old flags



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
  
  function handleClick() {
    showOverlay("Processing... Please wait");

    // simulate API call
    setTimeout(function() {
        hideOverlay();
    }, 3000);
}



var firstname ='';
var lastname = '';
var email = '';
var plan = '';  
var planName = '';  
var trs = '';
var jobTitle = '';
var phone ='';
var company = '';
var businessUnit = '';
var groupEmail = '';  
var otp = '';
var messageDiv = '';


  
$(document).ready(function() {
    // // Initialize intl-tel-input for phone number field
    

    // LOGIN Flow Below

    let isLoginFlow = false;

    // 🔹 Show Login page by default
    $('#signupForm').hide();
    $('#loginForm').show();
    $('#sh').html('Login');
    isLoginFlow = true;

    // LOGIN Flow Below

    $('#loginBtn').on('click', function() {
        $('#loginForm').show();
        $('#signupForm').hide();
        $('#sh').html('Login');
        isLoginFlow = true;
        $('#message').removeClass('success error').text('');
    });

   $('#signupBtn').on('click', function() {
        $('#loginForm').hide();
        $('#signupForm').show();
        $('#sh').html('Create your account');
        isLoginFlow = false;
        $('#message').removeClass('success error').text('');
    });
 
    $('#sendOtpBtn').on('click', function() {
        console.log("Send OTP button clicked!");
        messageDiv = $('#message');
 
        loginEmail = $('#loginEmail').val().trim();  
 
        if ( !emailRegex.test(loginEmail) ) {
            messageDiv.addClass('error').text('Please enter a valid email address.');
            return;
        } 

        messageDiv.removeClass('success error').text(''); // Clear previous messages 
        showOverlay('Sending OTP... ');
        setTimeout(function (){
            $.ajax({
                url: 'https://zizoxhunpuoh5ffjdz3r2hxx2q0ticoh.lambda-url.ap-south-1.on.aws', 
                type: 'POST', 
                data: { 
                    form: "login", email: loginEmail
                },
                dataType: 'json',
                async: false,
                success: function(response) { 
                    $('#d1').hide();
                    messageDiv.addClass('success').text('OTP Sent successfully!');
                    var parsed = (typeof response === 'string')
                        ? (function() { try { return JSON.parse(response.replace(/'/g, '"')); } catch(e) { return {}; } })()
                        : response;
                    secret = parsed.code;
                    userid = parsed.userid;
                    subscription = parsed.subscription;
                    var companyVal = parsed.company || parsed.company_name || (parsed.user && parsed.user.company);
                    if (companyVal && String(companyVal).toLowerCase() !== 'none') {
                        sessionStorage.setItem("company", String(companyVal));
                    }
                    sessionStorage.setItem("userJson", typeof response === 'string' ? response : JSON.stringify(parsed));
                    sessionStorage.setItem("secret", secret);
                    sessionStorage.setItem("userid", userid);
                    sessionStorage.setItem("email", loginEmail);
                    sessionStorage.setItem("subscription", subscription);
                    if (parsed.phone) {
                        sessionStorage.setItem("phone", parsed.phone);
                    }
                    hideOverlay();
                    $('#v2').show();
                    $('#sh').html('You are logged in!');
                },
                error: function(xhr, status, error) { 
                    // console.error('Error:', status);
                    // Handle the error
                    console.log("Error:", error);
                    console.log("XHR Error:", xhr.responseText);

                    if (xhr.status === 409) {
                        let body = {};
                        try {
                            body = JSON.parse(xhr.responseText);
                        } catch (e) {
                            console.log("JSON parse error:", e);
                        }

                        // Check for "already_logged_in"
                        if (body.error === "already_logged_in") {
                            messageDiv.addClass('error')
                                    .text("You are already logged in from another device!");
                        }
                        else if (body.error === "no_user") {
                            messageDiv.addClass('error')
                                    .text("Account with this email does not exist!");
                        }
                        else if (body.error === "user_exists") {
                            messageDiv.addClass('error')
                                    .text("User already exists!");
                        }
                        else {
                            messageDiv.addClass('error')
                                    .text(body.message || "An unknown error occurred");
                        }
                    }
                    hideOverlay();
                }
            });
            // Clear the form fields after successful submission
            // $('#signupForm')[0].reset();
        }, 1700);

        // Mask email
        const maskEmail = (mail) => {
            const [user, domain] = mail.split("@");
            return user[0] + "***" + user[user.length-1] + "@" + domain;
        };

        // alert(email);

        $("#maskedEmail").html("OTP sent to: " + maskEmail(loginEmail));
        // Cooldown
        startCooldown();
    });

    // SIGNUP Flow Below

    const otpInput = $('#otp');
    const verifyOtpBtn = $("#verifyOtpBtn");
    const emailInput = $("#email");
    const resendBtn = $("#resendBtn");
    let secret = null;
    let signupData = null;
    let resendCount = 1;          // how many times user has clicked
    const maxResends = 2;         // maximum allowed resends
    let cooldown;

    $('#signupForm').on('submit', function(event) {
        event.preventDefault(); // Prevent default form submission 
        firstname = $('#firstname').val().trim();
        lastname = $('#lastname').val().trim();
        email = $('#email').val().trim();  
        plan = $('#subscriptionPlan option:selected').val();  
        planName = $('#subscriptionPlan option:selected').text();  
        trs = $('#agree:checked').val();  
        messageDiv = $('#message');

        messageDiv.removeClass('success error').text(''); // Clear previous messages 

        // Basic validation (you would add more robust validation for production)
        if (firstname.length < 3 || !nameRegex.test(firstname)) {
            messageDiv.addClass('error').text('Please enter a valid First name ');
            return;
        }

        if (lastname.length < 2 || !nameRegex.test(lastname)) {
            messageDiv.addClass('error').text('Please enter a valid Last name ');
            return;
        }

        if ( !emailRegex.test(email) ) {
            messageDiv.addClass('error').text('Please enter a valid email address.');
            return;
        } 

        if (!plan) {
            messageDiv.addClass('error').text('Subscroption must be Selected.');
            return;
        }

        if (!trs) {
            messageDiv.addClass('error').text('Please Agree Terms.');
            return;
        }

        showOverlay('Verifying... ');
        
        setTimeout(function (){
            $.ajax({
                url: 'https://zizoxhunpuoh5ffjdz3r2hxx2q0ticoh.lambda-url.ap-south-1.on.aws', 
                type: 'POST', 
                data: { 
                    form: "signup", name: firstname + ' ' + lastname, email: email, subscription: plan
                },
                dataType: 'json',
                async: false,
                success: function(response) { 
                    // console.log('Success:', response);
                    // alert(response.text);
                   
                    $('#d1').hide();
                    // If all validation passes (simulate successful signup)
                    messageDiv.addClass('success').text('OTP Sent successfully!'); 
                    const fixed = response.replace(/'/g, '"'); // make it valid JSON
                    const parsed = JSON.parse(fixed);
                    secret = parsed.code;

                    sessionStorage.setItem("secret", secret);
                    
                    hideOverlay();
                    $('#v2').show();
                    $('#sh').html('Complete Your Signup');
                },
                error: function(xhr, status, error) { 
                    // console.error('Error:', status);
                    // Handle the error
                    console.log("Error:", error);
                    if (xhr.status === 409) {
                        messageDiv.addClass('error').text("Account with Email already exists!"); 
                    } 
                    hideOverlay();
                }
            });
            // Clear the form fields after successful submission
            // $('#signupForm')[0].reset();
        }, 1700);
        
        // Mask email
        const maskEmail = (mail) => {
            const [user, domain] = mail.split("@");
            return user[0] + "***" + user[user.length-1] + "@" + domain;
        };

        // alert(email);

        $("#maskedEmail").html("OTP sent to: " + maskEmail(email));
        // Cooldown
        startCooldown();
    }); 

    function startCooldown() {
        clearInterval(cooldown); // ensure only one timer at a time
        let counter = 30;
        resendBtn.prop("disabled", true).text(`Resend OTP (${counter}s)`);

        cooldown = setInterval(() => {
            counter--;
            resendBtn.text(`Resend OTP (${counter}s)`);
            if (counter <= 0) {
            clearInterval(cooldown);
            resendBtn.prop("disabled", false).text("Resend OTP");
            }
        }, 1000);
    }

    otpInput.on("input", function() {
        const val = $(this).val().trim();
        verifyOtpBtn.prop("disabled", val.length !== 6);
    });

    // Verify OTP on click
    verifyOtpBtn.on("click", async function() {
        
        
        const otp = otpInput.val().trim();
        let email = '';

        if (isLoginFlow === true) {
            email = $('#loginEmail').val().trim();  
        } else {
            email = emailInput.val().trim();
        }

        const otpError = $("#otpError");
        const otpSuccess = $("#otpSuccess"); 
        messageDiv = $('#message');

        // Simple validation
        if (otp.length !== 6) {
            otpError.text("Please enter a 6-digit OTP.").show();
            return;
        }

        otpError.hide();
        verifyOtpBtn.prop("disabled", true).text("Verifying...");
        messageDiv.removeClass('success error').text(''); // Clear previous messages 
        
        showOverlay('Verifying OTP... ');
        
        
        try {
            const payload = { email, otp, secret};
            await setTimeout(function (){
                $.ajax({
                    url: 'https://qivvfe7kcvj2djutvrkqkj3n3i0ytgzm.lambda-url.ap-south-1.on.aws', 
                    type: 'POST', 
                    data: { 
                        email: email, otp: otp, secret: secret
                    },
                    dataType: 'json',
                    async: false,
                    success: function(response, textStatus, xhr) { 
                        console.log("FULL RESPONSE:", JSON.stringify(response)); // ← ADD THIS
                        console.log("Status Code:", xhr.status); // e.g. 200
                        console.log("Text Status:", textStatus); // "success"
                        console.log("response: ", response)
                        if (xhr.status === 200) {
                            console.log("✅ Success:", response.msg);
                            messageDiv.addClass('success').text(response.msg || "OTP Verified"); 

                            // Move to next stage
                            $('#v2').hide();
                            $('#d1').hide();


                            if (isLoginFlow === true) {

    $('#d2').hide();

    var resp = (typeof response === 'string')
        ? (function() { try { return JSON.parse(response.replace(/'/g, '"')); } catch(e) { return {}; } })()
        : response;
    var companyVal = resp.company || resp.company_name || (resp.user && resp.user.company);
    if (companyVal && String(companyVal).toLowerCase() !== 'none') {
        sessionStorage.setItem("company", String(companyVal));
    }
   
    sessionStorage.setItem('isLoggedIn', '1');
    const authToken = resp.code || secret || '';
    sessionStorage.setItem("token", authToken);
    sessionStorage.setItem("secret", authToken);
    sessionStorage.setItem("userid", resp.userid);
    sessionStorage.setItem("subscription", resp.subscription);
    hideOverlay();
    
    setTimeout(function () {
        console.log("Stored token:", sessionStorage.getItem("token"));
        console.log("Stored secret:", sessionStorage.getItem("secret"));
        console.log("Session storage:", sessionStorage);
        window.location.href = 'dashboard.html';
    }, 200);
} else {
                                $('#d2').show();
                            }

                            messageDiv.removeClass('success error').text(''); // Clear previous messages 
                        } else {
                            console.warn("⚠️ Non-200 but in success callback:", xhr.status);
                            messageDiv.addClass('error').text(response.msg || "OTP is either expired or invalid"); 
                        }

                        hideOverlay();
                    },
                    error: function(xhr, status, error) { 
                        console.log("XHR:", xhr);
                        console.log("Status:", status);
                        console.log("Error:", error);

                        let message = "An unexpected error occurred.";

                        // Case 1: Lambda / API Gateway returns JSON error body
                        if (xhr.responseJSON && xhr.responseJSON.error) {
                            message = xhr.responseJSON.error;
                        }

                        // Case 2: Server returned raw JSON string (not auto-parsed)
                        else if (xhr.responseText) {
                            try {
                            const parsed = JSON.parse(xhr.responseText);
                            // Check common keys
                            message = parsed.message || parsed.error || JSON.stringify(parsed);
                            } catch (e) {
                            // Not JSON — use plain text
                            message = xhr.responseText;
                            }
                        }

                        // Case 3: Fallback — if nothing else works
                        else if (error) {
                            message = error;
                        }

                        console.error("Error message:", message);

                        // Optionally show on UI
                        messageDiv.addClass('error').text(message.msg || "OTP is either expired or invalid"); 

                        hideOverlay();
                    }
                });
              
            }, 1700);

        } catch (err) {
            console.error("Error verifying OTP:", err);
            otpError.text("An error occurred while verifying. Please try again.").show();
        } finally {
            verifyOtpBtn.prop("disabled", false).text("Verify OTP");
            // hideOverlay();
        }
    });

    // On click: resend OTP logic
  
    resendBtn.on("click", function() {
        if (resendCount >= maxResends) {
            resendBtn.prop("disabled", true).text("Resend limit reached");
            return;
        }
 
        resendCount++;
        sendSignupOtp(); // ✅ no form validation triggered
    });
  
  
    $('#signupFormFinal').on('submit', function(event) {
        event.preventDefault(); // Prevent default form submission 
        firstname = $('#firstname').val().trim();
        lastname = $('#lastname').val().trim();
        email = $('#email').val().trim();  
        phone = $('#phone').val().trim(); 
        countryCode = $('#countryCode option:selected').val();  
        company = $('#company').val().trim();  
        jobTitle = $('#jobTitle').val().trim();  
        businessUnit = $('#businessUnit').val().trim();  
        groupEmail = $('#groupEmail').val().trim();  
        plan = $('#subscriptionPlan option:selected').val();  
        trs = $('#agree:checked').val();  
        messageDiv = $('#message');

        messageDiv.removeClass('success error').text(''); // Clear previous messages 

        // Basic validation (you would add more robust validation for production)
        if (company.length < 3 || !nameRegex.test(company)) {
            messageDiv.addClass('error').text('Please enter a valid Company name.');
            return;
        }

        if (jobTitle.length < 2 || !nameRegex.test(jobTitle)) {
            messageDiv.addClass('error').text('Please enter a valid Job Title.');
            return;
        }

        // Combine them into one string
        const fullNumber = `+${countryCode}${phone}`;

        if ( !phoneRegex.test(fullNumber) ) {
            messageDiv.addClass('error').text('Please enter a valid Phone Number.');
            return;
        } 

        if (businessUnit.length < 2 || !nameRegex.test(businessUnit)) {
            messageDiv.addClass('error').text('Please enter a valid Business Unit.');
            return;
        }

        // if (groupEmail.length < 2 || !emailRegex.test(groupEmail)) {
        //     messageDiv.addClass('error').text('Please enter a valid Group Email.');
        //     return;
        // }

        messageDiv.removeClass('success error').text(''); // Clear previous messages 
        showOverlay('Creating Account...');
        $.ajax({
            url: 'https://jlycg5toy4ze2f5bkt5tkkddz40podud.lambda-url.ap-south-1.on.aws', 
            type: 'POST', 
            data: { 
                firstname: firstname,
                lastname: lastname, 
                email: email,
                phone: fullNumber,
                subscription: plan,
                company: company,
                jobTitle: jobTitle,
                businessUnit: businessUnit,
                groupEmail: groupEmail,
                secret: secret
            },
            dataType: 'json',
            async: false,
            success: function(response) { 
                console.log('Success:', response);
                messageDiv.addClass('success').text('Account created successfully!'); 
                hideOverlay();
                const parsedResponse = (typeof response === 'string')
                    ? (function() {
                        try {
                            return JSON.parse(response.replace(/'/g, '"'));
                        } catch (e) {
                            return {};
                        }
                    })()
                    : (response || {});

                const userPayload = Object.assign({}, parsedResponse, {
                    name: firstname + ' ' + lastname,
                    firstname: firstname,
                    lastname: lastname,
                    email: email,
                    phone: fullNumber,
                    subscription: plan,
                    company: company,
                    company_name: company,
                    jobTitle: jobTitle,
                    businessUnit: businessUnit,
                    groupEmail: groupEmail,
                    userid: parsedResponse.userid || parsedResponse.user_id || sessionStorage.getItem("userid") || '',
                    secret: parsedResponse.secret || parsedResponse.code || secret
                });

                sessionStorage.setItem('isLoggedIn', '1');
                sessionStorage.setItem('email', email);
                //sessionStorage.setItem('userid', userPayload.userid);
                //sessionStorage.setItem('subscription', plan);
                sessionStorage.setItem('company', company);
                const authToken = userPayload.secret || parsedResponse.code || secret || '';
                sessionStorage.setItem('secret', authToken);
                sessionStorage.setItem('token', authToken);
                sessionStorage.setItem('userJson', JSON.stringify(userPayload));

                setTimeout(function() {
                    console.log("Stored token:", sessionStorage.getItem("token"));
                    console.log("Stored secret:", sessionStorage.getItem("secret"));
                    console.log("Session storage:", sessionStorage);
                    window.location.href = 'dashboard.html';
                }, 300);
            },
            error: function(xhr, status, error) { 
                console.error('Error:', error);
                messageDiv.addClass('error').text('Account creation failed!'); 
                hideOverlay();
            }
        });
        
    });
});