const DICT_EXCL_KEY = 'EXCLUDED_TERMS';

chrome.tabs.executeScript({
  code: 'annotate();'
});

chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  chrome.browserAction.setIcon({
    path: 'img/icon-active.png', tabId: tabs[0].id
  });
});

function removeFromDictExclusions(term) {
  chrome.storage.local.get([DICT_EXCL_KEY], function(state) {
    let excl_terms = state.hasOwnProperty(DICT_EXCL_KEY) ? state[DICT_EXCL_KEY] : [];
    if (excl_terms.length > 0) {
      let idx = excl_terms.indexOf(term);
      if (idx >= 0) {
        excl_terms.splice(idx);
        let tmp = {};
        tmp[DICT_EXCL_KEY] = excl_terms;
        chrome.storage.local.set(tmp, function() {
          console.log(`Added "${term}" back to the dictionary.`);
          document.getElementById('num_excl_terms').innerText = excl_terms.length;
        });
      }
    }
  });
}

chrome.storage.local.get([DICT_EXCL_KEY], function(state) {
  let excl_terms = state.hasOwnProperty(DICT_EXCL_KEY) ? state[DICT_EXCL_KEY] : [];
  document.getElementById('num_excl_terms').innerText = excl_terms.length;
  excl_terms.sort();

  let excl_terms_div = document.getElementById('excl_term_div');
  if (excl_terms.length > 0) {
    excl_terms.forEach(t => {
      let entry = document.createElement('SPAN');
      entry.classList.add('excl-term');
      entry.innerText = t;
      entry.onclick = function() {
        removeFromDictExclusions(t);
        entry.remove();
      };
      excl_terms_div.appendChild(entry);
    });
  }
});
