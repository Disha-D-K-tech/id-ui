// authentication.js
(function() {
    // check login state
    const loggedIn = sessionStorage.getItem("isLoggedIn");

    if (loggedIn !== "1") {
        // user is NOT logged in
        // redirect them to login page
        location.replace("lvd.html");
    }
})();