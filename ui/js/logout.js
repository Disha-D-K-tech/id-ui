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
$(document).on('click', '.logout-btn', function(e) {
  

    e.preventDefault();
    showOverlay("loging out...")
    console.log("Logout button clicked!");

    var token = sessionStorage.getItem("token");

    console.log(token);
    
    $.ajax({
        url: 'https://zzb3uv2hditbigv3rs54rsgvaq0uwvst.lambda-url.ap-south-1.on.aws',
        type: 'POST',
        data: {
            token: token
        },
        dataType: 'json',
        success: function(response) {

            console.log("Logout success:", response);

            sessionStorage.clear();
            localStorage.clear();

            // window.location.replace("lvd.html");
            hideOverlay();
        },
        error: function(xhr, status, error) {

            console.log("Logout error:", error);

            sessionStorage.clear();
            localStorage.clear();

            // window.location.replace("lvd.html");
            hideOverlay();
        }
    });

});
