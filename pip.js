// 북마클릿 본체. build.js 가 __HTML__ 을 pip.html(+pip.css 인라인) 문자열로 바꿔서 bookmarklet.html 을 만든다.
(async () => {
  if (location.host !== 'music.youtube.com') { alert('music.youtube.com 탭에서 눌러주세요'); return; }
  if (window.__ytmPip && !window.__ytmPip.closed) { window.__ytmPip.focus(); return; }
  const video = document.querySelector('video');
  if (!video) { alert('재생 중인 곡이 없어요'); return; }

  const win = await documentPictureInPicture.requestWindow({ width: 360, height: 150 });
  window.__ytmPip = win;
  const doc = win.document;
  // YTM 은 Trusted Types 강제라 정책 없이는 innerHTML 이 막힘
  const tt = window.trustedTypes;
  const HTML = __HTML__;
  if (tt) window.__ytmPolicy ??= tt.createPolicy('ytmpip', { createHTML: s => s });  // 같은 이름 두 번 만들면 throw
  doc.documentElement.innerHTML = tt ? window.__ytmPolicy.createHTML(HTML) : HTML;

  const $ = s => doc.querySelector(s);
  const yt = s => document.querySelector('ytmusic-player-bar ' + s);
  const likeBtn = () => yt('#button-shape-like button');

  // 컨트롤 → YTM
  $('.play').onclick = () => video.paused ? video.play() : video.pause();
  $('.prev').onclick = () => yt('.previous-button')?.click();
  $('.next').onclick = () => yt('.next-button')?.click();
  $('.like').onclick = () => likeBtn()?.click();
  $('.tab').onclick = () => window.focus();
  const bar = $('.bar');
  bar.onclick = e => { video.currentTime = e.offsetX / bar.clientWidth * video.duration; };
  const card = $('.card');
  card.onpointermove = e => { const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', e.clientX - r.left + 'px'); card.style.setProperty('--my', e.clientY - r.top + 'px'); };

  // YTM → 화면. mediaSession 은 변경 이벤트가 없어서 폴링
  let lastArt;
  const render = () => {
    const m = navigator.mediaSession.metadata;
    if (m) {
      $('.title').textContent = m.title;
      $('.artist').textContent = [m.artist, m.album].filter(Boolean).join(' • ');
      const art = m.artwork?.[m.artwork.length - 1]?.src;
      if (art && art !== lastArt) { lastArt = art; doc.body.style.setProperty('--art', `url("${art}")`); }
    }
    const [playIco, pauseIco] = $('.play').querySelectorAll('svg');
    playIco.hidden = !video.paused; pauseIco.hidden = video.paused;
    bar.style.setProperty('--p', (video.currentTime / video.duration * 100 || 0) + '%');
    $('.like').classList.toggle('liked', likeBtn()?.getAttribute('aria-pressed') === 'true');
  };
  render();
  const timer = setInterval(render, 500);
  win.addEventListener('pagehide', () => clearInterval(timer));
})();
