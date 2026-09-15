
(async () => {
  if (location.host !== 'music.youtube.com') { alert('music.youtube.com 탭에서 눌러주세요'); return; }
  if (window.__ytmPip && !window.__ytmPip.closed) { window.__ytmPip.focus(); return; }
  const video = document.querySelector('video');
  if (!video) { alert('재생 중인 곡이 없어요'); return; }

  const win = await documentPictureInPicture.requestWindow({ width: 360, height: 150 });
  window.__ytmPip = win;
  const doc = win.document;

  const tt = window.trustedTypes;
  const HTML = "\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<title>YTM PiP</title>\n<style>:root {\n  --spring: cubic-bezier(.34, 1.56, .64, 1);\n  --text: rgba(255,255,255,.96);\n  --sub: rgba(255,255,255,.62);\n  --r: clamp(14px, 4vmin, 24px);\n  --pad: clamp(10px, 2.5vmin, 16px);\n  --btn: clamp(26px, 7vmin, 36px);\n  --art-size: clamp(48px, 100vh - 130px, 120px);   /* 가로 모드: 높이에 맞춰 */\n  --mx: 50%; --my: 50%;\n}\n* { box-sizing: border-box; margin: 0; }\n[hidden] { display: none !important; }\nhtml, body { height: 100%; }\nbody {\n  overflow: hidden; background: #0a0a12; color: var(--text);\n  font: 13px/1.3 -apple-system, \"SF Pro Text\", \"Segoe UI\", Pretendard, sans-serif;\n  -webkit-font-smoothing: antialiased; user-select: none;\n  padding: clamp(6px, 1.5vmin, 10px);\n}\n\n/* 앨범아트를 크게 깔고 블러 → 유리가 굴절할 대상 */\n.bg { position: fixed; inset: -30%; z-index: -1; background: var(--art) center/cover;\n  filter: blur(50px) saturate(1.6) brightness(.7); animation: breathe 20s ease-in-out infinite alternate; }\n@keyframes breathe { to { transform: scale(1.15) rotate(3deg); } }\n\n/* Liquid Glass 카드 */\n.card {\n  position: relative; width: 100%; height: 100%; padding: var(--pad);\n  border-radius: var(--r);\n  background: linear-gradient(135deg, rgba(255,255,255,.16), rgba(255,255,255,.03) 60%);\n  backdrop-filter: blur(30px) saturate(1.8); -webkit-backdrop-filter: blur(30px) saturate(1.8);\n  box-shadow: 0 24px 60px rgba(0,0,0,.35);\n  display: grid; gap: clamp(6px, 2vmin, 12px) clamp(10px, 3vmin, 16px);\n  grid-template-columns: auto 1fr;\n  grid-template-rows: 1fr auto auto;\n  grid-template-areas: \"art meta\" \"ctrl ctrl\" \"bar bar\";\n  animation: pop .6s var(--spring) both;\n}\n@keyframes pop { from { transform: scale(.9); opacity: 0; } }\n/* 마우스 따라오는 광택 */\n.card::after { content: \"\"; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;\n  background: radial-gradient(260px circle at var(--mx) var(--my), rgba(255,255,255,.2), transparent 60%);\n  transition: opacity .4s; opacity: 0; }\n.card:hover::after { opacity: 1; }\n\n.art { grid-area: art; width: var(--art-size); aspect-ratio: 1; border-radius: calc(var(--r) * .55); align-self: center;\n  background: var(--art) center/cover;\n  box-shadow: 0 10px 30px rgba(0,0,0,.45);\n  transition: transform .5s var(--spring); }\n.card:hover .art { transform: scale(1.02); }\n\n.meta { grid-area: meta; min-width: 0; align-self: center; }\n.title { font-weight: 600; font-size: clamp(14px, 3.5vmin, 18px); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.artist { color: var(--sub); font-size: clamp(11px, 2.8vmin, 14px); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }\n\n/* 컨트롤: 배경 없는 플랫 아이콘 */\n.ctrl { grid-area: ctrl; display: flex; align-items: center; justify-content: space-evenly; }\n.ctrl button { all: unset; cursor: pointer; display: grid; place-items: center; color: var(--text); opacity: .8;\n  width: var(--btn); aspect-ratio: 1;\n  transition: transform .45s var(--spring), opacity .2s; }\n.ctrl button:hover { opacity: 1; transform: scale(1.15); }\n.ctrl button:active { transform: scale(.8); transition-duration: .1s; }\n.ctrl svg { width: 60%; fill: currentColor; filter: drop-shadow(0 1px 2px rgba(0,0,0,.35)); }\n.ctrl .play { opacity: 1; }\n.ctrl .play svg { width: 85%; transition: transform .4s var(--spring); }\n.ctrl .play:active svg { transform: scale(.7); }\n.ctrl .liked { color: #ff5c8a; opacity: 1; }\n\n/* 진행바 */\n.bar { grid-area: bar; position: relative; height: 12px; cursor: pointer; display: flex; align-items: center; }\n.bar .track { width: 100%; height: 3px; border-radius: 3px; background: rgba(255,255,255,.22); overflow: hidden; transition: height .3s var(--spring); }\n.bar:hover .track { height: 6px; }\n.bar .fill { height: 100%; width: var(--p, 0%); background: #fff; box-shadow: 0 0 10px rgba(255,255,255,.8); border-radius: inherit; }\n.bar .thumb { position: absolute; left: var(--p, 0%); width: 12px; height: 12px; border-radius: 50%; background: #fff;\n  transform: translateX(-50%) scale(0); box-shadow: 0 0 0 3px rgba(255,255,255,.25), 0 2px 8px rgba(0,0,0,.3);\n  transition: transform .35s var(--spring); }\n.bar:hover .thumb { transform: translateX(-50%) scale(1); }\n\n/* 1) 미니: 아트 + 제목만. 호버하면 제목 자리에 컨트롤이 떠오르고 바닥에 진행바 */\n@media (max-height: 110px) {\n  :root { --art-size: clamp(32px, 100vh - 56px, 64px); --btn: 26px; }   /* 위아래 최소 10px 씩 */\n  .card { grid-template-rows: 1fr; grid-template-areas: \"art meta\"; }\n  .meta, .ctrl { grid-area: meta; align-self: center; transition: opacity .2s, transform .4s var(--spring); }\n  .ctrl { opacity: 0; transform: translateY(8px); pointer-events: none; }\n  .card:hover .ctrl { opacity: 1; transform: none; pointer-events: auto; }\n  .card:hover .meta { opacity: 0; transform: translateY(-8px); pointer-events: none; }\n  .bar { position: absolute; left: var(--pad); right: var(--pad); bottom: 2px; height: 8px; opacity: 0; transition: opacity .2s; }\n  .card:hover .bar { opacity: 1; }\n}\n/* 3) 세로형: 아트 위로, 가운데 정렬. 높이가 남으면 아트가 가로 꽉 차게 자람 (= 4단계) */\n@media (min-height: 200px) and (max-aspect-ratio: 2/1) {\n  :root { --art-size: min(100%, max(72px, 100vh - 170px)); }\n  .card { grid-template-columns: 1fr; grid-template-rows: auto auto auto auto; align-content: center;\n    grid-template-areas: \"art\" \"meta\" \"ctrl\" \"bar\"; justify-items: center; text-align: center; }\n  .meta { width: 100%; }\n  .ctrl { width: 100%; }\n}\n@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }\n</style>\n</head>\n\n<body style=\"--art: url(https://picsum.photos/seed/surfin/800)\">\n  <div class=\"bg\"></div>\n\n  <div class=\"card\">\n    <div class=\"art\"></div>\n    <div class=\"meta\">\n      <div class=\"title\">Surfin' Boy</div>\n      <div class=\"artist\">Red Velvet • Velvet Summer - Summer Mini Album</div>\n    </div>\n    <div class=\"ctrl\">\n      <button class=\"like\" title=\"좋아요\"><svg viewBox=\"0 0 24 24\"><path d=\"M12 21s-7-4.6-9.3-9A5.4 5.4 0 0 1 12 6.3 5.4 5.4 0 0 1 21.3 12C19 16.4 12 21 12 21z\"/></svg></button>\n      <button class=\"prev\" title=\"이전\"><svg viewBox=\"0 0 24 24\"><path d=\"M6 5h2v14H6zM20 5v14L9 12z\"/></svg></button>\n      <button class=\"play\" title=\"재생/일시정지\">\n        <svg viewBox=\"0 0 24 24\"><path d=\"M6 4v16l14-8z\"/></svg>\n        <svg viewBox=\"0 0 24 24\" hidden><path d=\"M6 4h4v16H6zM14 4h4v16h-4z\"/></svg>\n      </button>\n      <button class=\"next\" title=\"다음\"><svg viewBox=\"0 0 24 24\"><path d=\"M16 5h2v14h-2zM4 5v14l11-7z\"/></svg></button>\n      <button class=\"tab\" title=\"유튜브 뮤직 탭으로\"><svg viewBox=\"0 0 24 24\"><path d=\"M14 3h7v7h-2V6.4l-9.3 9.3-1.4-1.4L17.6 5H14zM5 5h6v2H7v10h10v-4h2v6H5z\"/></svg></button>\n    </div>\n    <div class=\"bar\" style=\"--p:38%\"><div class=\"track\"><div class=\"fill\"></div></div><div class=\"thumb\"></div></div>\n  </div>\n\n\n</body>\n";
  if (tt) window.__ytmPolicy ??= tt.createPolicy('ytmpip', { createHTML: s => s });  // 같은 이름 두 번 만들면 throw
  doc.documentElement.innerHTML = tt ? window.__ytmPolicy.createHTML(HTML) : HTML;

  const $ = s => doc.querySelector(s);
  const yt = s => document.querySelector('ytmusic-player-bar ' + s);
  const likeBtn = () => yt('#button-shape-like button');

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
