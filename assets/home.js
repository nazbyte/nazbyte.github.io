  /* nav */
  var burger = document.getElementById('burger'), links = document.getElementById('navlinks');
  burger.addEventListener('click', function () {
    var open = links.classList.toggle('open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  links.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') links.classList.remove('open');
  });

  /* enquiry form.
     ENDPOINT is filled in once the Google Apps Script receiver is deployed.
     While it is empty the form falls back to the visitor's own mail app, so the
     page is never a dead end. */
  var ENDPOINT = "";

  var form = document.getElementById('enquiry'),
      status = document.getElementById('status'),
      send = document.getElementById('send');

  function say(msg, cls) {
    status.textContent = msg;
    status.className = 'status show ' + cls;
  }

  function mailtoFallback(data) {
    var body = 'Name: ' + data.name + '\nEmail: ' + data.email +
               '\nBudget: ' + (data.budget || 'not stated') +
               '\n\n' + data.project;
    window.location.href = 'mailto:nazbyte.support@gmail.com'
      + '?subject=' + encodeURIComponent('New project enquiry — ' + data.name)
      + '&body=' + encodeURIComponent(body);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = {
      name:    form.name.value.trim(),
      email:   form.email.value.trim(),
      project: form.project.value.trim(),
      budget:  form.budget.value
    };
    if (!data.name || !data.email || !data.project) {
      say('Please fill in your name, email and what you want built.', 'err');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      say('That email address does not look right.', 'err');
      return;
    }
    if (!ENDPOINT) {
      say('Opening your email app…', 'ok');
      mailtoFallback(data);
      return;
    }
    send.disabled = true;
    say('Sending…', 'ok');
    fetch(ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify(data)
    }).then(function () {
      form.reset();
      say('Thank you — your enquiry has been sent. I reply within one working day.', 'ok');
    }).catch(function () {
      say('The form could not send. Opening your email app instead…', 'err');
      mailtoFallback(data);
    }).then(function () {
      send.disabled = false;
    });
  });
