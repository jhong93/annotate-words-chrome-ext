import csv
import re
from collections import namedtuple
import pinyin


BLACKLIST_TYPES = {'num', 'abbr', 'vt', 'vi', 'adv', 'prep', 'aux', 'pron'}

Item = namedtuple('Item', ['en', 'zh'])


def _remove_parens(s):
    while '(' in s:
        a, _, b = s.partition('(')
        _, _, b = b.partition(')')
        s = a + b
    return s


def _parse_zh_definitions(s, include_extra):
    result = []
    added = set()
    for line in s.split('\\n'):
        line = line.strip()
        if '人名' in line or '<' in line or '=' in line or '...' in line:
            return None

        if '[' in line:
            if not include_extra:
                continue
            _, _, d = line.partition('[')
            t, _, d = d.strip().partition(']')
        elif '.' in line:
            t, _, d = line.partition('.')
        else:
            t = 'u'
            d = line
        d = d.strip()

        if t in BLACKLIST_TYPES:
            return None

        for ins in re.split('[,;]', d):
            ins = _remove_parens(ins.strip())
            if ins in added:
                continue
            added.add(ins)
            result.append((t, ins, pinyin.get(ins)))
    return result


def _isascii(s):
    return len(s) == len(s.encode())


def _count_en(s):
    n = 0
    for t in s.split('\\n'):
        if '.' in t:
            t = t.partition('.')[2]
        for c in t:
            if _isascii(c) and c.isalpha():
                n += 1
    return n


def _remove_weird_characters(s):
    s = s.replace('（', '(').replace('）', ')')
    s = s.replace('；', ';').replace('|', '').replace('│', '')
    s = s.replace('，', ', ').replace('…', '')
    return s


def parse_ecdict(fname, include_extra):
    items = []
    with open(fname) as fp:
        reader = csv.reader(fp)
        header = next(reader)
        for row in reader:
            if len(row) != len(header):
                print('Skipping invalid line:', row)

            en = row[0].strip()
            if en.startswith('-') or en.endswith('-'):
                continue
            en = en.replace('-', ' ')

            zh = _remove_weird_characters(row[3])
            if '...' in en or en[0] == '-' or en.isnumeric():
                continue
            if len(zh) == 0 or _count_en(zh) > 0:
                continue

            defs = _parse_zh_definitions(zh, include_extra)
            if defs is not None and len(defs) > 0:
                items.append(Item(en, defs))
    return items
