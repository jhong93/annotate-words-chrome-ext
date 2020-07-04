/* Code to modify the DOM */

const MAX_ANNOTATIONS = 100;

const ELEM_TO_RECURSE = [
  'P', 'BODY', 'MAIN', 'SPAN', 'ARTICLE', 'SECTION', 'DIV', 'TABLE',
  'TBODY', 'TR', 'TD'
];

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

function makeTextNode(tokens, pad_left, pad_right) {
  var result = pad_left ? ' ' : '';
  result += tokens.join(' ');
  result = pad_right ? result + ' ' : result;
  return document.createTextNode(result);
}

function makeMatchNode(tokens, match) {
  let div = document.createElement('DIV');
  div.classList.add('replacement-text');

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
      if (!state.already_matched.has(match_str)) {
        console.log('Matched', match_str);
        if (new_nodes == null) {
          new_nodes = [];
        }
        if (output_idx < i) {
          new_nodes.push(makeTextNode(
            tokens.slice(output_idx, i), output_idx > 0 || has_left_pad, true));
        }
        new_nodes.push(makeMatchNode(tokens.slice(i, i + match_len), match));
        output_idx = i + match_len;
        state.already_matched.add(match_str);
        state.count += 1;
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

function load_dict(vocab) {
  let dict_root = new DictNode(null, {});
  vocab.forEach(x => {
    let src = x[0].toLowerCase().split(' ');
    let translation = new Translation(...x.slice(1));
    var dict_ptr = dict_root;
    for (var i = 0; i < src.length; i++) {
      if (!dict_ptr.hasNext || !dict_ptr.next.hasOwnProperty(src[i])) {
        var new_node;
        if (i == src.length - 1) {
          new_node = new DictNode(translation, null);
        } else {
          new_node = new DictNode(null, null);
        }
        if (dict_ptr.next == null) {
          dict_ptr.next = {};
        }
        dict_ptr.next[src[i]] = new_node;
        dict_ptr = new_node;
      } else {
        dict_ptr = dict_ptr.next[src[i]];
        if (i == src.length - 1) {
          dict_ptr.value = translation;
        }
      }
    }
  });
  return dict_root;
}

function annotate() {
  if (DICT_ROOT == null) {
    const url = chrome.runtime.getURL('vocab.json');
    fetch(url).then((response) => response.json()).then((json) => {
      DICT_ROOT = load_dict(json);
      annotate();
    });
  } else {
    walkDOM(document.body, function(node, state) {
      if (state.count > MAX_ANNOTATIONS) {
        return false;
      }
      switch (node.nodeType) {
        case Node.ELEMENT_NODE:
          return (ELEM_TO_RECURSE.indexOf(node.tagName) >= 0
            && node.className != 'replacement-text');
        case Node.DODCUMENT_NODE:
        case Node.DOCUMENT_FRAGMENT_NODE:
          return true;
        case Node.TEXT_NODE:
          handleText(node, state);
        default:
          return false;
      }
    }, {already_matched: new Set(), count: 0});
  }
}
