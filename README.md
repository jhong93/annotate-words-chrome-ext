# Word Annotations Chrome Extension

This extension replaces English words with translations so that you may become
enlightened with random vocabulary.

#### Basic installation

To install, navigate to `chrome://extensions` in a new tab in Chrome. Drag and
drop the `extension` directory in this repository into the Chrome window.

#### Description of code

`extension/replace.js` is run on each page. It traverses the DOM and replaces
words with known translations with the annotations. `extensions/vocab.json`
holds the current vocabulary in use by the extension.

By default, replacement is run on all pages. Edit `"matches": ["<all_urls>"]` in
`extensions/manifest.json` to restrict the domains. Alternatively, set site
access permissions inside Chrome.

#### Changing the vocabulary

Run `unzip datasets.zip` to extract the data sets. Run `python3 setup.py
<vocab_file>` to generate a new `extension/vocab.json` file, with a custom
vocabulary. The default vocabulary is an English-Chinese dictionary generated
by: `python3 setup.py ecdict`.

###### Other options include:
* `countries` (country names in Chinese)
* `ecdict` (English-Chinese)
* `ecdict-full` (English-Chinese; full dictionary)
* `ejdict` (English-Japanese)
* "a custom CSV file" (see `datasets/countries.csv` for an example)
