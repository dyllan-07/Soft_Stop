(function () {
  var host = window.location.hostname.replace(/^www\./, '');

  chrome.storage.sync.get(['distractions', 'pauseUntil', 'snoozeMins', 'loadOnPageStart', 'headingText', 'paintingGenre'], function (data) {
    if (data.pauseUntil && data.pauseUntil > Date.now()) return;
    var sites = data.distractions || [];
    var isDistraction = false;

    for (var i = 0; i < sites.length; i++) {
      if (host === sites[i] || host.endsWith('.' + sites[i])) {
        isDistraction = true;
        break;
      }
    }

    if (!isDistraction) return;

    var FALLBACK_GRADIENT = 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)';

    var SNOOZE_MS = (data.snoozeMins || 5) * 60 * 1000;
    var HEADING_TEXT = (data.headingText && data.headingText.trim()) || 'Take a Deep Breath';
    var PAINTING_GENRE = data.paintingGenre || 'romantic';

    function showOverlay() {
      chrome.storage.local.get(['bgImages', 'distractionSnooze'], function (data) {
        var snooze = data.distractionSnooze || {};
        var remaining = (snooze[host] || 0) - Date.now();
        if (remaining > 0) {
          setTimeout(showOverlay, remaining);
          return;
        }
        buildOverlay(data.bgImages || []);
      });
    }

    function buildOverlay(images) {
      var filtered = images.filter(function (p) { return p.genre === PAINTING_GENRE; });
      if (!filtered.length) filtered = images;
      var painting = filtered.length ? filtered[Math.floor(Math.random() * filtered.length)] : null;
      var imageUrl = painting ? chrome.runtime.getURL('images/' + painting.file) : null;

      var overlay = document.createElement('div');
      overlay.id = 'tab-nudge-focus-overlay';

      var bg = document.createElement('div');
      bg.id = 'tab-nudge-focus-bg';
      bg.style.setProperty('--tn-bg', FALLBACK_GRADIENT);

      var bgImg = document.createElement('div');
      bgImg.id = 'tab-nudge-focus-img';

      if (imageUrl) {
        var img = new Image();
        img.onload = function () {
          bgImg.style.setProperty('--tn-img', 'url(' + imageUrl + ')');
          bgImg.classList.add('tab-nudge-img-visible');
        };
        img.src = imageUrl;
      }

      var content = document.createElement('div');
      content.id = 'tab-nudge-focus-content';

      var heading = document.createElement('h1');
      heading.id = 'tab-nudge-focus-heading';
      heading.textContent = HEADING_TEXT;

      var sub = document.createElement('p');
      sub.id = 'tab-nudge-focus-sub';
      sub.textContent = 'Are you intending to be here?';

      var btnYes = document.createElement('button');
      btnYes.id = 'tab-nudge-focus-btn';
      btnYes.textContent = 'Yes, I\u2019m here intentionally';

      var btnNo = document.createElement('button');
      btnNo.id = 'tab-nudge-focus-btn-no';
      btnNo.textContent = 'No, show me the painting!';

      var btnRow = document.createElement('div');
      btnRow.id = 'tab-nudge-focus-btns';
      btnRow.appendChild(btnNo);
      btnRow.appendChild(btnYes);

      var caption = document.createElement('div');
      caption.id = 'tab-nudge-caption';
      if (painting) {
        var captionTitle = document.createElement('span');
        captionTitle.id = 'tab-nudge-caption-title';
        captionTitle.textContent = painting.title;
        var captionMeta = document.createElement('span');
        captionMeta.id = 'tab-nudge-caption-meta';
        captionMeta.textContent = painting.artist + ', ' + painting.year;
        caption.appendChild(captionTitle);
        caption.appendChild(captionMeta);
      }

      var snoozeMsg = document.createElement('p');
      snoozeMsg.id = 'tab-nudge-snooze-msg';

      var textWrapper = document.createElement('div');
      textWrapper.id = 'tab-nudge-text-wrapper';
      textWrapper.appendChild(heading);
      textWrapper.appendChild(sub);

      content.appendChild(textWrapper);
      content.appendChild(btnRow);
      content.appendChild(snoozeMsg);
      overlay.appendChild(bg);
      overlay.appendChild(bgImg);
      overlay.appendChild(content);
      overlay.appendChild(caption);
      document.body.appendChild(overlay);

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          overlay.classList.add('tab-nudge-focus-visible');

          // 3s fade-in + 2s breath pause, then crossfade to the question
          setTimeout(function () {
            heading.classList.add('tab-nudge-faded');
            setTimeout(function () {
              sub.classList.add('tab-nudge-reveal');
              btnRow.classList.add('tab-nudge-reveal');
            }, 800);
          }, 9000);
        });
      });

      btnNo.addEventListener('click', function () {
        content.classList.add('tab-nudge-fade-out');
        bgImg.classList.add('tab-nudge-painting-mode');
        setTimeout(function () {
          content.remove();
          caption.classList.add('tab-nudge-caption-visible');
        }, 1500);
      });

      btnYes.addEventListener('click', function () {
        btnYes.disabled = true;

        var minutes = Math.round(SNOOZE_MS / 60000);
        var duration = minutes > 1 ? minutes + ' minutes' : minutes === 1 ? '1 minute' : Math.round(SNOOZE_MS / 1000) + ' seconds';
        snoozeMsg.textContent = duration + ' until next check-in.';

        btnRow.classList.add('tab-nudge-fade-out');
        setTimeout(function () {
          snoozeMsg.classList.add('tab-nudge-reveal');
        }, 400);

        // Snooze this domain across all tabs
        chrome.storage.local.get(['distractionSnooze'], function (stored) {
          var snooze = stored.distractionSnooze || {};
          snooze[host] = Date.now() + SNOOZE_MS;
          chrome.storage.local.set({ distractionSnooze: snooze });
        });

        setTimeout(function () {
          overlay.classList.remove('tab-nudge-focus-visible');
          setTimeout(function () {
            overlay.remove();
            setTimeout(showOverlay, SNOOZE_MS);
          }, 3000);
        }, 10000);
      });
    }

    if (data.loadOnPageStart !== false) {
      setTimeout(showOverlay, 1000);
    } else {
      setTimeout(showOverlay, SNOOZE_MS);
    }
  });
})();
