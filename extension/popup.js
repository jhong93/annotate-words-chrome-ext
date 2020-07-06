document.getElementById('annotate_btn').onclick = function() {
  chrome.tabs.executeScript({
    code: 'annotate();'
  });
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.browserAction.setIcon({
      path: 'img/icon-active.png', tabId: tabs[0].id
    });
  });
};

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

chrome.storage.local.get(
  [DICT_EXCL_KEY, ANNOTATION_DENSITY_KEY, AUTORUN_DOMAINS_KEY],
  function(state) {
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

    let annotation_density = state.hasOwnProperty(ANNOTATION_DENSITY_KEY) ? state[ANNOTATION_DENSITY_KEY] : DEFAULT_ANNOTATION_DENSITY;
    document.getElementById('annotate_density').value = annotation_density;

    let autorun_domains = state.hasOwnProperty(AUTORUN_DOMAINS_KEY) ? state[AUTORUN_DOMAINS_KEY] : [];
    document.getElementById('autorun_domains_area').value = autorun_domains.join('\n');
  });

document.getElementById('annotate_density').onchange = function() {
  let new_density = parseInt(document.getElementById('annotate_density').value);
  if (new_density > 0 && new_density <= 100) {
    let tmp = {};
    tmp[ANNOTATION_DENSITY_KEY] = new_density;
    chrome.storage.local.set(tmp, function() {
      console.log(`Set annotation density to: ${new_density}`);
    });
  }
}

document.getElementById('autorun_domains_area').onchange = function() {
  let new_domains = document.getElementById(
    'autorun_domains_area').value.split(/[\r\n]+/g).map(
      x => x.trim()).filter(x => x.length > 0);
  let tmp = {}
  tmp[AUTORUN_DOMAINS_KEY] = new_domains;
  chrome.storage.local.set(tmp, function() {
    console.log(`Set autorun domains: ${new_domains.length}`);
  });
}
