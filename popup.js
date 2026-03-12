// Settings navigation
var popupRoot = document.getElementById('popup-root');
var btnSettings = document.getElementById('btn-settings');
var btnBack = document.getElementById('btn-back');

btnSettings.addEventListener('click', function () {
  popupRoot.classList.add('settings-open');
});

btnBack.addEventListener('click', function () {
  popupRoot.classList.remove('settings-open');
});

var snoozeOpts = document.querySelectorAll('#snooze-opts .settings-opt');

function updateSnoozeUI(mins) {
  snoozeOpts.forEach(function (btn) {
    btn.classList.toggle('active', parseInt(btn.dataset.mins) === mins);
  });
}

chrome.storage.sync.get(['snoozeMins'], function (data) {
  updateSnoozeUI(data.snoozeMins || 5);
});

snoozeOpts.forEach(function (btn) {
  btn.addEventListener('click', function () {
    var mins = parseInt(btn.dataset.mins);
    chrome.storage.sync.set({ snoozeMins: mins }, function () {
      updateSnoozeUI(mins);
    });
  });
});

var genreOpts = document.querySelectorAll('#genre-opts .settings-opt');

function updateGenreUI(val) {
  genreOpts.forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.val === val);
  });
}

chrome.storage.sync.get(['paintingGenre'], function (data) {
  updateGenreUI(data.paintingGenre || 'romantic');
});

genreOpts.forEach(function (btn) {
  btn.addEventListener('click', function () {
    var val = btn.dataset.val;
    chrome.storage.sync.set({ paintingGenre: val }, function () {
      updateGenreUI(val);
    });
  });
});

var loadOpts = document.querySelectorAll('#load-opts .settings-opt');

function updateLoadUI(val) {
  loadOpts.forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.val === String(val));
  });
}

chrome.storage.sync.get(['loadOnPageStart'], function (data) {
  updateLoadUI(data.loadOnPageStart !== false);
});

loadOpts.forEach(function (btn) {
  btn.addEventListener('click', function () {
    var val = btn.dataset.val === 'true';
    chrome.storage.sync.set({ loadOnPageStart: val }, function () {
      updateLoadUI(val);
    });
  });
});

// Load paintings metadata from paintings.json and cache in storage
function refreshImageList() {
  fetch(chrome.runtime.getURL('paintings.json'))
    .then(function (r) { return r.json(); })
    .then(function (paintings) {
      chrome.storage.local.set({ bgImages: paintings });
    })
    .catch(function () {
      chrome.storage.local.set({ bgImages: [] });
    });
}

refreshImageList();

// Pause logic
var pauseStatus = document.getElementById('pause-status');
var btnTakeBreak = document.getElementById('btn-take-break');
var pauseOptions = document.getElementById('pause-options');
var pauseReason = document.getElementById('pause-reason');
var pauseReasonInput = document.getElementById('pause-reason-input');
var pauseCharCount = document.getElementById('pause-char-count');
var btnPauseConfirm = document.getElementById('btn-pause-confirm');
var pendingPauseUntil = null;
var MIN_CHARS = 30;

function formatResumeTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function resetPauseFlow() {
  pauseOptions.classList.add('hidden');
  pauseReason.classList.add('hidden');
  pauseReasonInput.value = '';
  pauseCharCount.textContent = '0 / ' + MIN_CHARS;
  btnPauseConfirm.disabled = true;
  pendingPauseUntil = null;
}

function updatePauseUI() {
  chrome.storage.sync.get(['pauseUntil'], function (data) {
    var remaining = (data.pauseUntil || 0) - Date.now();
    if (remaining > 0) {
      pauseStatus.textContent = 'Paused \u00b7 resumes at ' + formatResumeTime(data.pauseUntil);
      btnTakeBreak.textContent = 'Resume now';
    } else {
      pauseStatus.textContent = '';
      btnTakeBreak.textContent = 'Pause Extension';
    }
    resetPauseFlow();
  });
}

btnTakeBreak.addEventListener('click', function () {
  chrome.storage.sync.get(['pauseUntil'], function (data) {
    if ((data.pauseUntil || 0) > Date.now()) {
      chrome.storage.sync.set({ pauseUntil: 0 }, updatePauseUI);
    } else {
      pauseOptions.classList.toggle('hidden');
      pauseReason.classList.add('hidden');
    }
  });
});

document.querySelectorAll('.pause-opt').forEach(function (btn) {
  btn.addEventListener('click', function () {
    if (btn.dataset.rest) {
      var midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      pendingPauseUntil = midnight.getTime();
    } else {
      pendingPauseUntil = Date.now() + parseInt(btn.dataset.mins) * 60000;
    }
    pauseOptions.classList.add('hidden');
    pauseReason.classList.remove('hidden');
    pauseReasonInput.focus();
  });
});

pauseReasonInput.addEventListener('input', function () {
  var len = pauseReasonInput.value.length;
  pauseCharCount.textContent = len + ' / ' + MIN_CHARS;
  pauseCharCount.classList.toggle('pause-char-met', len >= MIN_CHARS);
  btnPauseConfirm.disabled = len < MIN_CHARS;
});

btnPauseConfirm.addEventListener('click', function () {
  chrome.storage.sync.set({ pauseUntil: pendingPauseUntil }, updatePauseUI);
});

updatePauseUI();

// Distraction list
var dListEl = document.getElementById('distraction-list');
var dForm = document.getElementById('distraction-form');
var dInput = document.getElementById('input-distraction');
var dAddBtn = document.getElementById('btn-add-distraction');

function isValidDomain(val) {
  var cleaned = val.trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '');
  return /^[a-z0-9][a-z0-9\-\.]*\.[a-z]{2,}$/.test(cleaned);
}

dAddBtn.disabled = true;

dInput.addEventListener('input', function () {
  dAddBtn.disabled = !isValidDomain(dInput.value);
});

var dListWrap = document.querySelector('.distraction-list-wrap');
var dragSrcIndex = null;

function updateScrollShadow() {
  var hasOverflow = dListEl.scrollHeight > dListEl.clientHeight;
  var atBottom = dListEl.scrollTop + dListEl.clientHeight >= dListEl.scrollHeight - 1;
  dListWrap.classList.toggle('is-scrollable', hasOverflow && !atBottom);
}

dListEl.addEventListener('scroll', updateScrollShadow);

function renderDistractions(sites) {
  dListEl.innerHTML = '';

  if (sites.length === 0) {
    var empty = document.createElement('div');
    empty.className = 'empty-msg';
    empty.textContent = 'No distraction sites added yet.';
    dListEl.appendChild(empty);
    return;
  }

  var DEL_MIN_CHARS = 20;

  sites.forEach(function (site, i) {
    var item = document.createElement('div');
    item.className = 'distraction-item';
    item.draggable = true;

    var topRow = document.createElement('div');
    topRow.className = 'distraction-item-row';

    var handle = document.createElement('span');
    handle.className = 'distraction-handle';
    handle.textContent = '\u22ee\u22ee';

    var label = document.createElement('span');
    label.className = 'distraction-label';
    label.textContent = site;

    var delBtn = document.createElement('button');
    delBtn.className = 'distraction-del';
    delBtn.textContent = '\u2715';

    topRow.appendChild(handle);
    topRow.appendChild(label);
    topRow.appendChild(delBtn);

    item.addEventListener('dragstart', function (e) {
      dragSrcIndex = i;
      e.dataTransfer.effectAllowed = 'move';
      item.classList.add('dragging');
    });

    item.addEventListener('dragend', function () {
      item.classList.remove('dragging');
      document.querySelectorAll('.distraction-item').forEach(function (el) {
        el.classList.remove('drag-over');
      });
    });

    item.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      document.querySelectorAll('.distraction-item').forEach(function (el) {
        el.classList.remove('drag-over');
      });
      if (dragSrcIndex !== i) item.classList.add('drag-over');
    });

    item.addEventListener('drop', function (e) {
      e.preventDefault();
      item.classList.remove('drag-over');
      if (dragSrcIndex === null || dragSrcIndex === i) return;
      chrome.storage.sync.get(['distractions'], function (data) {
        var list = data.distractions || [];
        var moved = list.splice(dragSrcIndex, 1)[0];
        list.splice(i, 0, moved);
        dragSrcIndex = null;
        chrome.storage.sync.set({ distractions: list }, loadDistractions);
      });
    });

    var reasonWrap = document.createElement('div');
    reasonWrap.className = 'del-reason-wrap';

    var reasonInput = document.createElement('input');
    reasonInput.type = 'text';
    reasonInput.className = 'del-reason-input';
    reasonInput.placeholder = 'Why are you removing this?';

    var reasonFooter = document.createElement('div');
    reasonFooter.className = 'del-reason-footer';

    var charCount = document.createElement('span');
    charCount.className = 'del-char-count';
    charCount.textContent = '0 / ' + DEL_MIN_CHARS;

    var confirmBtn = document.createElement('button');
    confirmBtn.className = 'del-confirm-btn';
    confirmBtn.textContent = 'Remove';
    confirmBtn.disabled = true;

    reasonInput.addEventListener('input', function () {
      var len = reasonInput.value.length;
      charCount.textContent = len + ' / ' + DEL_MIN_CHARS;
      charCount.classList.toggle('del-char-met', len >= DEL_MIN_CHARS);
      confirmBtn.disabled = len < DEL_MIN_CHARS;
    });

    confirmBtn.addEventListener('click', function () {
      chrome.storage.sync.get(['distractions'], function (data) {
        var list = data.distractions || [];
        list.splice(i, 1);
        chrome.storage.sync.set({ distractions: list }, loadDistractions);
      });
    });

    delBtn.addEventListener('click', function () {
      var isOpen = item.classList.contains('deleting');
      document.querySelectorAll('.distraction-item.deleting').forEach(function (el) {
        el.classList.remove('deleting');
      });
      if (!isOpen) {
        item.classList.add('deleting');
        reasonInput.focus();
      }
    });

    reasonFooter.appendChild(charCount);
    reasonFooter.appendChild(confirmBtn);
    reasonWrap.appendChild(reasonInput);
    reasonWrap.appendChild(reasonFooter);
    item.appendChild(topRow);
    item.appendChild(reasonWrap);
    dListEl.appendChild(item);
  });

  updateScrollShadow();
}

function loadDistractions() {
  chrome.storage.sync.get(['distractions'], function (data) {
    renderDistractions(data.distractions || []);
  });
}

dForm.addEventListener('submit', function (e) {
  e.preventDefault();
  var raw = dInput.value.trim().toLowerCase();
  if (!raw) return;

  raw = raw.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');

  chrome.storage.sync.get(['distractions'], function (data) {
    var list = data.distractions || [];
    if (list.indexOf(raw) === -1) list.push(raw);
    chrome.storage.sync.set({ distractions: list }, function () {
      dInput.value = '';
      dAddBtn.disabled = true;
      loadDistractions();
    });
  });
});

loadDistractions();

// Heading text
var headingInput = document.getElementById('heading-text-input');
var headingTimer = null;

chrome.storage.sync.get(['headingText'], function (data) {
  headingInput.value = data.headingText || '';
});

headingInput.addEventListener('input', function () {
  clearTimeout(headingTimer);
  headingTimer = setTimeout(function () {
    var val = headingInput.value.trim();
    chrome.storage.sync.set({ headingText: val });
  }, 500);
});
