// node build.js → pip.bundle.js (확장용) + bookmarklet.html (북마크바로 드래그해서 설치)
const fs = require('fs');
const css = fs.readFileSync('pip.css', 'utf8');
const html = fs.readFileSync('pip.html', 'utf8')
  .replace('<link rel="stylesheet" href="pip.css">', `<style>${css}</style>`)
  .replace(/<script>[\s\S]*?<\/script>/, '')            // 미리보기용 목업 스크립트 제거
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/^<!doctype html>\s*<html[^>]*>|<\/html>\s*$/gi, '');  // innerHTML 에 넣을 안쪽만
const js = fs.readFileSync('pip.js', 'utf8')
  .replace(/^\s*\/\/.*$/gm, '')                       // 주석 제거 (플레이스홀더 오치환 방지 + 용량)
  .replace('__HTML__', JSON.stringify(html));
fs.writeFileSync('pip.bundle.js', js);                    // 확장이 executeScript 로 주입
const href = 'javascript:' + encodeURIComponent(js);      // 북마클릿

fs.writeFileSync('bookmarklet.html', `<!doctype html><meta charset="utf-8"><title>YTM PiP 설치</title>
<body style="font:15px/1.6 system-ui;padding:40px;max-width:560px;margin:auto">
<h2>YTM Glass PiP</h2>
<p>아래 버튼을 <b>북마크바로 드래그</b>하세요. 그 다음 유튜브 뮤직 탭에서 북마크를 클릭하면 창이 떠요.</p>
<p><a href="${href}" style="display:inline-block;padding:10px 18px;border-radius:12px;background:#111;color:#fff;text-decoration:none;font-weight:600">🎧 YTM PiP</a></p>
<p style="color:#666;font-size:13px">${(href.length / 1024).toFixed(1)} KB · 빌드 ${new Date().toLocaleString('ko-KR')}</p>
`);
console.log('bookmarklet.html', (href.length / 1024).toFixed(1) + 'KB');
