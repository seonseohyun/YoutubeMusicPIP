chrome.action.onClicked.addListener(tab => {
  if (!tab.url?.startsWith('https://music.youtube.com/')) return;
  chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['pip.bundle.js'] });
});
