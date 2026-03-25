
(function () {
  'use strict';

  /* ---- 1. Sidebar collapse toggle ---- */
  var toggleBtn = document.getElementById('sidebarToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      document.body.classList.toggle('sidebar-collapsed');
    });
  }

  
 
  var dropdowns = [
    { parentId: 'navRdbms',  subId: 'submenu-rdbms'  },
    { parentId: 'navCloud',  subId: 'submenu-cloud'   }
  ];

  dropdowns.forEach(function (pair) {
    var parent = document.getElementById(pair.parentId);
    var sub    = document.getElementById(pair.subId);
    if (!parent || !sub) return;

    var arrow = parent.querySelector('.nav-arrow');

    /* Start collapsed */
    sub.classList.remove('is-open');
    if (arrow) {
      arrow.classList.remove('is-open');
      arrow.setAttribute('aria-expanded', 'false');
    }

    
    if (arrow) {
      arrow.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleSub(sub, arrow);
      });
    }

    
    parent.addEventListener('click', function (e) {
      if (document.body.classList.contains('sidebar-collapsed')) return;
     
      if (e.target === arrow || arrow && arrow.contains(e.target)) return;
      toggleSub(sub, arrow);
    });
  });

  function toggleSub(sub, arrow) {
    var opening = !sub.classList.contains('is-open');
    sub.classList.toggle('is-open', opening);
    if (arrow) {
      arrow.classList.toggle('is-open', opening);
      arrow.setAttribute('aria-expanded', opening ? 'true' : 'false');
    }
  }

})();