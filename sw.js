// 툴바 아이콘 / Alt+P. 유튜브 뮤직이 아닌 탭이면 유튜브 뮤직 탭으로 데려가고, 맞으면 창을 열고 닫는다.
chrome.action.onClicked.addListener(async tab => {
  if (!tab.url?.startsWith('https://music.youtube.com/')) {
    const [ytm] = await chrome.tabs.query({ url: 'https://music.youtube.com/*' });
    if (!ytm) return chrome.tabs.create({ url: 'https://music.youtube.com/' });
    chrome.tabs.update(ytm.id, { active: true });
    chrome.windows.update(ytm.windowId, { focused: true });
    return;
  }
  const target = { tabId: tab.id };
  // 확장 설치 전부터 열려 있던 탭엔 content script 가 없으니 그때만 주입
  const [{ result: ready }] = await chrome.scripting.executeScript({ target, func: () => !!window.__ytmPipToggle });
  if (!ready) await chrome.scripting.executeScript({ target, files: ['pip.bundle.js'] });
  chrome.scripting.executeScript({ target, func: () => window.__ytmPipToggle() });
});

// PiP 창의 '유튜브 뮤직으로' 버튼
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg.focus || !sender.tab) return;
  chrome.tabs.update(sender.tab.id, { active: true });
  chrome.windows.update(sender.tab.windowId, { focused: true });
});
