// session-expiry.js
(function () {
  const WARNING_AFTER_MS = 25 * 60 * 1000; // 25 minutes of inactivity
  const LOGOUT_AFTER_MS  = 30 * 60 * 1000; // 30 minutes of inactivity

  const LS_KEY_ACTIVITY = 'lastActivity';
  const LS_KEY_EXPIRED  = 'sessionExpired';
  const LS_KEY_WARN     = 'sessionWarn';

  let warningTimer = null;
  let logoutTimer  = null;

  function clearTimers() {
    if (warningTimer) { clearTimeout(warningTimer); warningTimer = null; }
    if (logoutTimer)  { clearTimeout(logoutTimer);  logoutTimer  = null; }
  }

  function updateActivity(source = 'local') {
    try {
      localStorage.setItem(LS_KEY_ACTIVITY, Date.now());
    } catch (e) {}

    if (source === 'local') {
      scheduleFromLastActivity();
    }
  }

  var LOGOUT_URL = 'https://Onzzb3uv2hditbigv3rs54rsgvaq0uwvst.lambda-url.ap-south-1.on.aws';

  function clearAllSessionAndRedirect() {
    try { sessionStorage.removeItem('sessionPingSent'); } catch (e) {}
    try { sessionStorage.removeItem('userid'); } catch (e) {}
    try { sessionStorage.removeItem('subscription'); } catch (e) {}
    try { sessionStorage.removeItem('isLoggedIn'); } catch (e) {}
    try { sessionStorage.removeItem('secret'); } catch (e) {}
    try { sessionStorage.removeItem('email'); } catch (e) {}
    try { sessionStorage.removeItem('sessionData'); } catch (e) {}
    try { localStorage.removeItem('sessionStart'); } catch (e) {}
    try { localStorage.setItem(LS_KEY_EXPIRED, '1'); } catch (e) {}
    try { localStorage.removeItem(LS_KEY_ACTIVITY); } catch (e) {}
    try { localStorage.removeItem(LS_KEY_WARN); } catch (e) {}
    location.replace('lvd.html');
  }

  function doLogout(source = 'local') {
    if (localStorage.getItem(LS_KEY_EXPIRED) === '1' && source !== 'local') return;

    try { localStorage.setItem(LS_KEY_EXPIRED, '1'); } catch (e) {}
    clearTimers();

    var token = sessionStorage.getItem('secret');
    var userId = sessionStorage.getItem('userid');
    alert('Your session has expired due to inactivity.');
    if (token || userId) {
      var payload = {
        action: 'logout',
        user_id: userId || '',
        token: token || '',
        email: sessionStorage.getItem('email') || '',
        subscription: sessionStorage.getItem('subscription') || '',
        session_data: sessionStorage.getItem('sessionData') || '',
        session_start: localStorage.getItem('sessionStart') || '',
        logout_at: Date.now()
      };
      fetch(LOGOUT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(clearAllSessionAndRedirect).catch(clearAllSessionAndRedirect);
    } else {
      clearAllSessionAndRedirect();
    }
  }

  function showWarning(minutesLeft = 5) {
    try { localStorage.setItem(LS_KEY_WARN, Date.now()); } catch (e) {}

    if (window.Notification && Notification.permission === 'granted') {
      new Notification('Session warning', {
        body: `You will be logged out in ${minutesLeft} minutes due to inactivity.`
      });
    } else {
      alert(`You will be logged out in ${minutesLeft} minutes due to inactivity.`);
    }
  }

  function scheduleFromLastActivity() {
    clearTimers();

    const lastActivity = Number(localStorage.getItem(LS_KEY_ACTIVITY));
    if (!lastActivity || isNaN(lastActivity)) return;

    const now = Date.now();
    const inactiveFor = now - lastActivity;

    const remainingToLogout  = LOGOUT_AFTER_MS - inactiveFor;
    const remainingToWarning = WARNING_AFTER_MS - inactiveFor;

    if (remainingToLogout <= 0) {
      doLogout('expired');
      return;
    }

    if (remainingToWarning > 0) {
      warningTimer = setTimeout(() => showWarning(5), remainingToWarning);
    } else {
      showWarning(5);
    }

    logoutTimer = setTimeout(() => doLogout('timer'), remainingToLogout);
  }

  function initActivityListeners() {
    const events = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart'
    ];

    events.forEach(evt =>
      window.addEventListener(evt, () => updateActivity(), { passive: true })
    );
  }

  function init() {
    if (localStorage.getItem(LS_KEY_EXPIRED) === '1') {
      doLogout('init-expired');
      return;
    }

    if (!localStorage.getItem(LS_KEY_ACTIVITY)) {
      updateActivity('init');
    }

    scheduleFromLastActivity();
    initActivityListeners();
  }

  window.addEventListener('storage', function (e) {
    if (e.key === LS_KEY_ACTIVITY && e.newValue) {
      scheduleFromLastActivity();
    }

    if (e.key === LS_KEY_WARN) {
      showWarning(5);
    }

    if (e.key === LS_KEY_EXPIRED && e.newValue === '1') {
      clearTimers();
      alert('You have been logged out (another tab).');
      location.replace('lvd.html');
    }
  });

  init();
})();
