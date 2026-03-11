// Handle queries modal form submit
    $(function() {
      const queryForm = $('#queriesModalForm');
      const queryPopup = $('#querySuccessPopup');

      function showQuerySuccess() {
        queryPopup.addClass('show');
        setTimeout(function() {
          queryPopup.removeClass('show');
        }, 4000);
      }

      queryForm.on('submit', function(event) {
        event.preventDefault();

        const firstName = $('#queryFirstName').val().trim();
        const lastName = $('#queryLastName').val().trim();
        const fullName = [firstName, lastName].filter(Boolean).join(' ');
        const email = $('#queryEmail').val().trim();
        const phone = $('#queryPhone').val().trim();
        const subject = $('#querySubject').val().trim();
        const message = $('#queryMessage').val().trim();
        const formattedMessage =
          'Email: ' + $('<div>').text(email).html() + '<br><br>' +
          'Subject: ' + $('<div>').text(subject).html() + '<br><br>' +
          'Message: ' + $('<div>').text(message).html() + '<br><br>' +
          'Phone: ' + $('<div>').text(phone || 'N/A').html();

        const payload = {
          name: fullName,
          email: email,
          phone: phone,
          subject: subject,
          message: formattedMessage,
          msg:
            '<h3>Name: ' + $('<div>').text(fullName).html() + '</h3>' +
            '<p><strong>Email:</strong> ' + $('<div>').text(email).html() + '</p>' +
            '<h4>Subject: ' + $('<div>').text(subject).html() + '</h4>' +
            '<p><strong>Phone:</strong> ' + $('<div>').text(phone || 'N/A').html() + '</p>' +
            '<p><strong>Message:</strong><br>' + $('<div>').text(message).html() + '</p>'
        };

        showOverlay('Submitting your message...');

        $.ajax({
          url: 'https://dsmswg6acqfs4tbacgleljmv7a0xubiy.lambda-url.ap-south-1.on.aws/',
          type: 'POST',
          data: payload,
          dataType: 'json',
          success: function(response) {
            console.log('Query submitted:', response);
            hideOverlay();
            showQuerySuccess();
            queryForm[0].reset();
            $.modal.close();
          },
          error: function(xhr, status, error) {
            console.log('Query submit error:', status, error);
            console.log('XHR Error:', xhr.responseText);
            hideOverlay();
            alert('Unable to submit your message right now. Please try again.');
          }
        });
      });
    });

    if (sessionStorage.getItem('isLoggedIn') === '1') {
        location.replace('dashboard.html');
    }