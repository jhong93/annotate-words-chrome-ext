/* Code to modify the DOM */

const MAX_ANNOTATIONS = 200;

const DICT_EXCL_KEY = 'EXCLUDED_TERMS';
const ANNOTATION_DENSITY_KEY = 'ANNOTATION_DENSITY';

const ELEM_TO_RECURSE = [
  'P', 'BODY', 'MAIN', 'SPAN', 'ARTICLE', 'SECTION', 'DIV', 'TABLE',
  'TBODY', 'TR', 'TD', 'UL', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'
];

const ALREADY_REPLACED = new Set();

var DICT_ROOT = null;

class DictNode {
  constructor(value, next) {
    this.next = next;
    this.value = value;
  }

  get hasValue() {
    return this.value != null;
  }

  get hasNext() {
    return this.next != null;
  }
}

class Translation {
  constructor(text, sound, tooltip_lines) {
    this.text = text;
    this.sound = sound;
    this.tooltip = tooltip_lines;
  }
}

function addToDictExclusions(term) {
  chrome.storage.local.get([DICT_EXCL_KEY], function(state) {
    let excl_terms = state.hasOwnProperty(DICT_EXCL_KEY) ? state[DICT_EXCL_KEY] : [];
    if (excl_terms.indexOf(term) < 0) {
      excl_terms.push(term);
      let tmp = {};
      tmp[DICT_EXCL_KEY] = excl_terms;
      chrome.storage.local.set(tmp, function() {
        console.log(`Excluding "${term}" from the dictionary.`);
      });
    }
  });
}

function makeTextNode(tokens, pad_left, pad_right) {
  var result = pad_left ? ' ' : '';
  result += tokens.join(' ');
  result = pad_right ? result + ' ' : result;
  return document.createTextNode(result);
}

function makeMatchNode(tokens, match) {
  let div = document.createElement('DIV');
  div.classList.add('replacement-text');
  div.onclick = function() {
    div.replaceWith(makeTextNode(tokens, true, true));
    addToDictExclusions(tokens.join(' '));
  };

  let orig = document.createElement('SPAN');
  orig.classList.add('orig-text');
  orig.innerText = tokens.join(' ');
  div.appendChild(orig);

  let text = document.createElement('SPAN');
  text.classList.add('new-text');
  text.innerText = match.text;
  div.appendChild(text);

  if (match.sound) {
    let sound = document.createElement('SPAN');
    sound.classList.add('sound-text');
    sound.classList.add('rightmost-text');
    sound.innerText = match.sound;
    div.appendChild(sound);
  } else {
    text.classList.add('rightmost-text');
  }

  if (match.tooltip && match.tooltip.length > 0) {
    let tool = document.createElement('DIV');
    tool.classList.add('tooltip-text');
    match.tooltip.forEach(x => {
      let e = document.createElement('SPAN');
      e.classList.add('tooltip-text-entry');
      e.innerHTML = x;
      tool.appendChild(e);
    });
    div.appendChild(tool);
  }
  return div;
}

function handleText(node, state) {
  let trimmed_str = node.nodeValue.trim();
  if (trimmed_str.length == 0) {
    return;
  }
  let has_left_pad = node.nodeValue[0] == ' ';
  let has_right_pad = node.nodeValue[node.nodeValue.length - 1] == ' ';

  var new_nodes = null;
  var output_idx = 0;

  let tokens = trimmed_str.split(' ');
  let tokens_lower = tokens.map(t => t.toLowerCase());
  var i = 0;
  while (i < tokens.length) {
    var match;
    var match_len = 0;

    var dict_ptr = DICT_ROOT;
    for (j = 0; j < tokens.length - i; j++) {
      if (dict_ptr.hasNext) {
        dict_ptr = dict_ptr.next[tokens_lower[i + j]];
        if (dict_ptr == undefined) {
          break;
        }

        if (dict_ptr.hasValue) {
          match = dict_ptr.value;
          match_len = j + 1;
        }
      } else {
        break;
      }
    }

    if (match_len > 0) {
      let match_str = tokens.slice(i, i + match_len).join(' ').toLowerCase();
      if (!ALREADY_REPLACED.has(match_str)) {
        if (state.count == 0 || Math.random() * 100 <= state.density) {
          console.log('Matched:', match_str);
          if (new_nodes == null) {
            new_nodes = [];
          }
          if (output_idx < i) {
            new_nodes.push(makeTextNode(
              tokens.slice(output_idx, i), output_idx > 0 || has_left_pad, true));
          }
          new_nodes.push(makeMatchNode(tokens.slice(i, i + match_len), match));
          output_idx = i + match_len;
          ALREADY_REPLACED.add(match_str);
          state.count += 1;
        } else {
          console.log('Skipped match (density):', match_str);
        }
      } else {
        match_len = 0;
      }
    }
    i += Math.max(match_len, 1);
  }

  if (new_nodes != null) {
    new_nodes.push(makeTextNode(tokens.slice(output_idx), true, has_right_pad));
    node.replaceWith(...new_nodes);
  }
}

function walkDOM(node, func, state) {
  let recurse = func(node, state);
  if (recurse) {
    node = node.firstChild;
    while (node) {
      walkDOM(node, func, state);
      node = node.nextSibling;
    }
  }
}

function load_dict(vocab, exclusions) {
  let excl_set = new Set(exclusions.map(x => x.toLowerCase()));
  let dict_root = new DictNode(null, {});
  vocab.forEach(x => {
    let src = x[0].trim().toLowerCase();
    if (!excl_set.has(src)) {
      let tokens = src.split(' ');
      let translation = new Translation(...x.slice(1));
      var dict_ptr = dict_root;
      for (var i = 0; i < tokens.length; i++) {
        if (!dict_ptr.hasNext || !dict_ptr.next.hasOwnProperty(tokens[i])) {
          var new_node;
          if (i == tokens.length - 1) {
            new_node = new DictNode(translation, null);
          } else {
            new_node = new DictNode(null, null);
          }
          if (dict_ptr.next == null) {
            dict_ptr.next = {};
          }
          dict_ptr.next[tokens[i]] = new_node;
          dict_ptr = new_node;
        } else {
          dict_ptr = dict_ptr.next[tokens[i]];
          if (i == tokens.length - 1) {
            dict_ptr.value = translation;
          }
        }
      }
    }
  });
  return dict_root;
}

function annotateHelper() {
  chrome.storage.local.get([ANNOTATION_DENSITY_KEY], function(config) {
    let annotate_density = config.hasOwnProperty(ANNOTATION_DENSITY_KEY) ? config[ANNOTATION_DENSITY_KEY] : 100;
    let state = {count: 0, density: annotate_density};
    walkDOM(document.body, function(node, state) {
      if (state.count > MAX_ANNOTATIONS) {
        return false;
      }
      switch (node.nodeType) {
        case Node.ELEMENT_NODE:
          return (ELEM_TO_RECURSE.indexOf(node.tagName) >= 0
            && node.className != 'replacement-text');
        case Node.DOCUMENT_NODE:
        case Node.DOCUMENT_FRAGMENT_NODE:
          return true;
        case Node.TEXT_NODE:
          handleText(node, state);
        default:
          return false;
      }
    }, state);
    if (state.count == 0) {
      alert('No words to annotate! This may be because all annotatable words are annotated already or because the page uses non-standard HTML elements.');
    }
  });
}

function annotate() {
  if (DICT_ROOT == null) {
    // Load dictionary lazily
    let vocab_url = chrome.runtime.getURL('vocab.json');
    fetch(vocab_url).then((response) => response.json()).then((json) => {
      chrome.storage.local.get([DICT_EXCL_KEY], function(state) {
        DICT_ROOT = load_dict(
          json, state.hasOwnProperty(DICT_EXCL_KEY) ? state[DICT_EXCL_KEY] : []
        );
        annotateHelper();
      });
    });
  } else {
    annotateHelper();
  }
}

document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.location === KeyboardEvent.DOM_KEY_LOCATION_RIGHT) {
    annotate();
    chrome.runtime.sendMessage({action: 'setActiveIcon'});
  }
});
