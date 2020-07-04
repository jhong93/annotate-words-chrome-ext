chrome.tabs.executeScript({
  code: 'annotate();'
});
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  chrome.browserAction.setIcon({
    path: 'img/icon-active.png', tabId: tabs[0].id
  });
})
