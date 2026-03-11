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
function parseUserJson(str) {
    if (!str || typeof str !== 'string') return null;
    try {
      return JSON.parse(str.replace(/'/g, '"'));
    } catch (e) {
      return null;
    }
  }
$(document).on('click', '.logout-btn', function(e) {
  

    e.preventDefault();
    showOverlay("loging out...")
    console.log("Logout button clicked!");

    const userJson = parseUserJson(sessionStorage.getItem("userJson")) || {};
    const fullName =
     userJson.name ||
    [userJson.firstname, userJson.lastname].filter(Boolean).join(" ") ||
    userJson.email ||
      "Welcome";
   // const logoutMessage = "<h3>User Logout</h3><p>User logged out successfully</p>";
    var payload = {
        token: sessionStorage.getItem("token") || sessionStorage.getItem("secret"),
        
    };

    console.log(payload.token);
    console.log("Logout payload:", payload);
    
    $.ajax({
        url: 'https://zzb3uv2hditbigv3rs54rsgvaq0uwvst.lambda-url.ap-south-1.on.aws',
        type: 'POST',
        data: payload,
        dataType: 'json',
        success: function(response) {

            console.log("Logout success:", response);

            sessionStorage.clear();
            localStorage.clear();

            hideOverlay();
            window.location.replace("lvd.html");
        },
        error: function(xhr, status, error) {

            console.log("Logout error:", error);

            sessionStorage.clear();
            localStorage.clear();

            hideOverlay();
            window.location.replace("lvd.html");
        }
    });

});