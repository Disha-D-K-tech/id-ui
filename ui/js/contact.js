if (sessionStorage.getItem("isLoggedIn") !== "1") {
  location.replace("lvd.html");
}

function parseUserJson(str) {
  if (!str || typeof str !== "string") return null;
  try {
    return JSON.parse(str.replace(/'/g, '"'));
  } catch (e) {
    return null;
  }
}

const userJson = parseUserJson(sessionStorage.getItem("userJson")) || {};
const fullName =
  userJson.name ||
  [userJson.firstname, userJson.lastname].filter(Boolean).join(" ") ||
  userJson.email ||
  "Welcome";

const email =
  sessionStorage.getItem("email") ||
  userJson.email ||
  (userJson.user && userJson.user.email) ||
  "";

const phone =
  sessionStorage.getItem("phone") ||
  userJson.phone ||
  "N/A";

$(function () {
  const contactForm = $(".contact-form-card form");
  const queryPopup = $("#querySuccessPopup");

  function showQuerySuccess() {
    queryPopup.addClass("show");
    setTimeout(function () {
      queryPopup.removeClass("show");
    }, 4000);
  }

  contactForm.on("submit", function (event) {
    event.preventDefault();

    const subject = $("#contactSubject").val().trim();
    const message = $("#contactMessage").val().trim();

    const formattedMessage =
      "Email: " + email +
      "<br><br>Subject: " + subject +
      "<br><br>Message: " + message;

    const payload = {
      name: fullName,
      email: email,
      phone: phone,
      subject: subject,
      message: formattedMessage,
      msg:
        "<h3>Name: " + fullName + "</h3>" +
        "<p><strong>Email:</strong> " + email + "</p>" +
        "<p><strong>Phone:</strong> " + phone + "</p>" +
        "<h4>Subject: " + subject + "</h4>" +
        "<p><strong>Message:</strong><br>" + message + "</p>"
    };

    console.log("Contact payload:", payload);
    $.ajax({
      url: "https://dsmswg6acqfs4tbacgleljmv7a0xubiy.lambda-url.ap-south-1.on.aws/",
      type: "POST",
      data: payload,
      dataType: "json",
      success: function (response) {
        console.log("Contact message sent:", response);
        contactForm[0].reset();
        showQuerySuccess();
      },
      error: function (xhr, status, error) {
        console.log("Contact error:", status, error);
        alert("Unable to send message. Please try again later.");
      }
    });
  });
});
