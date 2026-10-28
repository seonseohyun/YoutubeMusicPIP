// 본체. build.js 가 __HTML__ 을 pip.html(+pip.css 인라인) 문자열로 바꿔서 pip.bundle.js / bookmarklet.html 을 만든다.
// 확장: 유튜브 뮤직 페이지(앱 창 포함)에 content script 로 미리 깔리고, 툴바 아이콘 · 미디어 컨트롤의 PiP 버튼 · 탭 전환 시 자동으로 창이 뜬다.
// 북마클릿: build.js 가 끝에 __ytmPipToggle() 호출을 붙여서 누르는 즉시 뜬다.
(() => {
  if (location.host !== 'music.youtube.com') { alert('music.youtube.com 탭에서 눌러주세요'); return; }
  if (window.__ytmPipToggle) return;   // 이미 깔려 있음 (content script + executeScript 중복 주입)

  const HTML = __HTML__;
  // 페이지에 video 가 여러 개일 수 있어서(미리보기 등) 실제로 재생 중인 것 → 곡이 걸린 것 순으로 고른다. 곡 전환 때 갈아끼워질 수 있어 매번 새로 찾음
  const video = () => {
    const vs = [...document.querySelectorAll('video')];
    return vs.find(v => !v.paused && !v.ended) || vs.find(v => v.currentSrc && v.duration) || vs[0];
  };
  const yt = s => document.querySelector('ytmusic-player-bar ' + s);
  // 커스텀 엘리먼트 껍데기 대신 안쪽 진짜 button 을 누른다 (클릭은 껍데기까지 버블링되니 어느 쪽 핸들러든 받음)
  const press = (...sels) => {
    for (const s of sels) {
      const el = yt(s);
      if (el) { (el.matches('button') ? el : el.querySelector('button') || el).click(); return true; }
    }
    return false;
  };
  const likeBtn = () => yt('#button-shape-like button') || yt('.like button');

  const ctl = {
    play() {
      if (press('#play-pause-button')) return;
      const v = video(); if (v) v.paused ? v.play() : v.pause();
    },
    next() {
      if (press('.next-button', '[aria-label="다음 곡"]', '[aria-label="Next"]')) return;
      const v = video(); if (v?.duration) v.currentTime = v.duration;   // 버튼을 못 찾으면 곡 끝으로 → 자동재생이 다음 곡
    },
    prev() {
      if (press('.previous-button', '[aria-label="이전 곡"]', '[aria-label="Previous"]')) return;
      const v = video(); if (v) v.currentTime = 0;
    },
    like() { likeBtn()?.click(); },
    seek(t) { const v = video(); if (v?.duration) v.currentTime = Math.max(0, Math.min(v.duration - .5, t)); },
  };

  // 곡 정보: 플레이어바 DOM 이 제일 빨리 바뀌고, mediaSession 은 백업
  const meta = () => {
    const m = navigator.mediaSession?.metadata;
    const title = yt('.title')?.textContent.trim() || m?.title || '';
    const by = yt('.byline')?.textContent.trim().replace(/\s+/g, ' ')
      || [m?.artist, m?.album].filter(Boolean).join(' • ');
    let art = m?.artwork?.[m.artwork.length - 1]?.src;
    const img = yt('.thumbnail-image-wrapper img, img.image')?.src;
    if (img && (!art || m?.title !== title)) art = img.replace(/=w\d+-h\d+/, '=w544-h544');   // mediaSession 이 아직 이전 곡이면 DOM 썸네일
    return { title, by, art };
  };

  let win = null, lastToggle = 0;

  async function open() {
    if (win && !win.closed) { win.focus(); return; }
    if (!video()) return;
    win = await documentPictureInPicture.requestWindow({ width: 360, height: 150 });
    const doc = win.document;
    // YTM 은 Trusted Types 강제라 정책 없이는 innerHTML 이 막힘
    const tt = window.trustedTypes;
    if (tt) window.__ytmPolicy ??= tt.createPolicy('ytmpip', { createHTML: s => s });  // 같은 이름 두 번 만들면 throw
    doc.documentElement.innerHTML = tt ? window.__ytmPolicy.createHTML(HTML) : HTML;

    const $ = s => doc.querySelector(s);
    $('.play').onclick = ctl.play;
    $('.prev').onclick = ctl.prev;
    $('.next').onclick = ctl.next;
    $('.like').onclick = () => { ctl.like(); setTimeout(render, 150); };
    $('.tab').onclick = () => globalThis.chrome?.runtime?.id ? chrome.runtime.sendMessage({ focus: true }) : window.focus();

    // 진행바: 클릭 + 드래그. 드래그 중에는 화면만 움직이고 놓을 때 탐색
    const bar = $('.bar');
    let drag = null;
    const ratio = e => { const r = bar.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); };
    bar.onpointerdown = e => { bar.setPointerCapture(e.pointerId); drag = ratio(e); render(); };
    bar.onpointermove = e => { if (drag != null) { drag = ratio(e); render(); } };
    bar.onpointerup = e => { if (drag != null) { ctl.seek(ratio(e) * (video()?.duration || 0)); drag = null; render(); } };
    bar.onpointercancel = () => { drag = null; };

    const card = $('.card');
    card.onpointermove = e => { const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', e.clientX - r.left + 'px'); card.style.setProperty('--my', e.clientY - r.top + 'px'); };

    doc.addEventListener('keydown', e => {
      const v = video();
      if (e.code === 'Space') ctl.play();
      else if (e.code === 'ArrowRight') e.shiftKey ? ctl.next() : ctl.seek((v?.currentTime ?? 0) + 5);
      else if (e.code === 'ArrowLeft') e.shiftKey ? ctl.prev() : ctl.seek((v?.currentTime ?? 0) - 5);
      else if (e.code === 'KeyL') ctl.like();
      else return;
      e.preventDefault(); setTimeout(render, 50);
    });

    // YTM → 화면. PiP 창은 항상 보이니 그 창의 타이머로 돌려야 YTM 탭이 백그라운드여도 느려지지 않음
    let lastArt, lastTitle;
    const [playIco, pauseIco] = $('.play').querySelectorAll('svg');
    function render() {
      const { title, by, art } = meta();
      if (title !== lastTitle) { lastTitle = title; $('.title').textContent = title; doc.title = title || 'YTM PiP'; }
      $('.artist').textContent = by;
      if (art && art !== lastArt) { lastArt = art; doc.body.style.setProperty('--art', `url("${art}")`); }
      const v = video();
      const paused = !v || v.paused || v.ended;
      // svg 엔 .hidden 프로퍼티가 없어서(HTML 엘리먼트 전용) 속성을 직접 켜고 끈다
      playIco.toggleAttribute('hidden', !paused); pauseIco.toggleAttribute('hidden', paused);
      doc.body.classList.toggle('paused', paused);
      const p = drag ?? (v ? v.currentTime / v.duration : 0);
      bar.style.setProperty('--p', (p * 100 || 0) + '%');
      $('.like').classList.toggle('liked', likeBtn()?.getAttribute('aria-pressed') === 'true');
    }
    render();
    const timer = win.setInterval(render, 250);
    win.addEventListener('pagehide', () => { win.clearInterval(timer); win = null; });
  }

  // 연타로 열자마자 닫히지 않게
  window.__ytmPipToggle = () => {
    if (Date.now() - lastToggle < 500) return;
    lastToggle = Date.now();
    if (win && !win.closed) win.close(); else open();
  };

  // 크롬 미디어 컨트롤(툴바 ♪)의 PiP 버튼, 그리고 재생 중 다른 탭/창으로 넘어갈 때 자동 PiP 로 연결
  try { navigator.mediaSession.setActionHandler('enterpictureinpicture', open); } catch {}
})();
