import csv
import re
from collections import namedtuple
import pykakasi


Item = namedtuple('Item', ['en', 'ja'])


def _isascii(s):
    return len(s) == len(s.encode())


def _sanitize_defition(s):
    s = s.replace('『', '').replace('』', '')
    return s.replace('(', '').replace(')', '')


def _parse_defintions(s, kks):
    defs = []
    for d in s.split('/'):
        d = d.strip()
        if len(d) == 0:
            continue
        if d[0] == '〈':
            _, _, x = d.partition('〈')
            t, _, x = x.partition('〉')
        elif d[0] == '《':
            _, _, x = d.partition('《')
            t, _, x = x.partition('》')
        elif d[0] == '(':
            _, _, x = d.partition('(')
            t, _, x = x.partition(')')
        else:
            t = 'unk'
            x = d
        t = t.strip()
        for defn in re.split('[,;]', x):
            defn = defn.strip()
            if defn:
                result = kks.convert(_sanitize_defition(defn))
                if len(result) > 0:
                    defs.append(
                        (t, defn, ''.join([r['hepburn'] for r in result])))
    return defs


def parse_ejdict(fname):
    kks = pykakasi.kakasi()
    items = []
    with open(fname) as fp:
        reader = csv.reader(fp, delimiter='\t')
        for row in reader:
            if len(row) != 2:
                print('Skipping invalid line:', row)
            en, ja = row
            if '.' in en or en.isupper():
                continue
            en = en.replace('-', ' ')

            if '=' in ja or _isascii(ja):
                continue

            ja_defs = _parse_defintions(ja, kks)
            if ja_defs:
                for en in set((x.strip() for x in en.split(','))):
                    items.append(Item(en, ja_defs))
    return items
