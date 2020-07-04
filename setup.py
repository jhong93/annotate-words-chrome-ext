#!/usr/bin/env python3
"""
This script generates a vocab.json file used by the extension.
"""

import argparse
import json
import csv
from collections import namedtuple, Counter

from py import ecdict, ejdict


VOCAB_FILE = 'extension/vocab.json'
MAX_N_GRAM_LEN = 3
MAX_DEF_LEN = 10


Translation = namedtuple(
    'Translation', ['source', 'target', 'sound', 'tooltip'])


def get_args():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        'vocab_file', type=str,
        help='Either a pre-defined vocab file or a CSV file with replacements')
    return parser.parse_args()


def save_vocab(vocab):
    with open(VOCAB_FILE, 'w') as fp:
        json.dump([
            (t.source, t.target, t.sound, t.tooltip)
            for t in vocab
        ], fp)


def is_english(s):
    try:
        s.encode(encoding='utf-8').decode('ascii')
    except UnicodeDecodeError:
        return False
    return True


def load_stopwords():
    result = set()
    with open('datasets/stopwords.txt') as fp:
        for line in fp:
            line = line.strip()
            if line:
                result.add(line.lower())
    return result


def load_ecdict_vocab(include_extra=False):
    stopwords = load_stopwords()
    data = ecdict.parse_ecdict('datasets/ecdict.txt', include_extra)
    translations = []
    for line in data:
        en_tokens = line.en.split(' ')
        if len(en_tokens) == 1 and en_tokens[0].lower() in stopwords:
            continue
        if en_tokens[0] == 'a' or en_tokens[0] == 'the':
            en_tokens = en_tokens[1:]
        if len(en_tokens) > MAX_N_GRAM_LEN:
            continue
        chosen_zh = line.zh[0]

        # If the first one is too long, choose the shortest
        if len(chosen_zh[1]) >= 5:
            for zh in line.zh:
                if len(zh[1]) < len(chosen_zh[1]):
                    chosen_zh = zh

        translations.append(Translation(
            ' '.join(en_tokens),    # English
            chosen_zh[1],           # Chinese
            chosen_zh[2],           # Pinyin
            ['[{}] {} {}'.format(*d) for d in line.zh
             if len(d[1]) <= MAX_DEF_LEN]))
    # Remove ambiguous words
    all_src_words = Counter(x.source for x in translations)
    return [t for t in translations if all_src_words[t.source] == 1]


def load_ejdict_vocab():
    stopwords = load_stopwords()
    data = ejdict.parse_ejdict('datasets/ejdict.txt')
    raise NotImplementedError()


def load_custom_vocab(fname):
    """
    Custom vocabularies are specified as a CSV, with 4 columns:
        match_text,new_text,sound_text,tooltip_text

    Multiple lines can be displayed in the tooltip. These are delimited by ;s.
    """
    result = []
    with open(fname) as fp:
        reader = csv.reader(fp)
        header = next(reader)
        assert len(header) == 4, 'Invalid header'
        for row in reader:
            assert len(row) == 4, row
            row = [r.strip() for r in row]
            tooltip_lines = [x.strip() for x in row[3].split(';')]
            src, tgt, sound = row[:3]
            result.append(Translation(src, tgt, sound, tooltip_lines))
    result.sort(key=lambda x: x.source)
    return result


def main(vocab_file):
    print('Loading: {}'.format(vocab_file))
    if vocab_file == 'countries':
        vocab = load_custom_vocab('datasets/countries.csv')
    elif vocab_file == 'ecdict':
        vocab = load_ecdict_vocab()
    elif vocab_file == 'ecdict-full':
        vocab = load_ecdict_vocab(include_extra=True)
    elif vocab_file == 'ejdict':
        vocab = load_ejdict_vocab()
    else:
        vocab = load_custom_vocab(vocab_file)
    print('Found {} translations'.format(len(vocab)))
    save_vocab(vocab)
    print('Done!')


if __name__ == '__main__':
    main(**vars(get_args()))
