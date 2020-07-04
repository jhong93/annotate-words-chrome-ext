chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.action === 'setActiveIcon') {
    chrome.browserAction.setIcon({
      path: 'img/icon-active.png', tabId: sender.tab.id});
  }
});
