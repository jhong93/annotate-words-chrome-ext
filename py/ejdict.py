import csv
from collections import namedtuple


Item = namedtuple('Item', ['en', 'jp'])


def _isascii(s):
    return len(s) == len(s.encode())


def _parse_defintions(s):
    defs = []
    for d in s.split('/'):
        raise NotImplementedError()


def parse_ejdict(fname):
    items = []
    with open(fname) as fp:
        reader = csv.reader(fp, delimiter='\t')
        for row in reader:
            if len(row) != 2:
                print('Skipping invalid line:', row)
            en, jp = row
            if '.' in en:
                continue
            en = en.replace('-', ' ')

            if '=' in jp or _isascii(jp):
                continue

            jp_defs = _parse_defintions(jp)
            print(en, jp_defs)
            for en in set((x.strip() for x in en.split(','))):
                items.append(Item(en, jp_defs))
    return items
