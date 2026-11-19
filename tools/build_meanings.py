"""JMdict_e（EDRDG）から、辞書の語ごとに漢字の書き方（3つまで）と英語（3つまで）を引く。
使い方:
  python3 tools/build_meanings.py JMdict_e.gz words.json meanings.js
  python3 tools/build_meanings.py JMdict_e.gz --repo meanings.js   （HB-011。GitHub Actions の毎日の作り直しで使う）
- JMdict_e.gz：https://www.edrdg.org/pub/Nihongo/JMdict_e.gz（または ftp.edrdg.org）
- words.json：ページの辞書 WORDS（手選び＋dict-ipadic.js＋extra_words）を JSON の配列にしたもの
  （ページを開き、読み込み後の WORDS を書き出す。HB-007 では Playwright で書き出した）
- --repo：words.json の代わりに、リポジトリの index.html の手選び（HAND）と字（KANA）、dict-ipadic.js、
  Supabase の extra_words（config.js の URL と公開キーで読む）から、ページと同じ決まりで WORDS を作る。
  extra_words が読めなければ止まる（読めないまま作ると、足した言葉の意味が消えるため）"""
import gzip, json, os, sys, re, urllib.request
import xml.etree.ElementTree as ET

def repo_words(root='.'):
    """ページの WORDS と同じものを作る（index.html の WORDS と loadExtraWords の決まりをなぞる）"""
    html = open(os.path.join(root, 'index.html'), encoding='utf-8').read()
    kana = set(re.search(r"const KANA=new Set\(\[\.\.\.'([^']+)'\]\)", html).group(1))
    hand = re.search(r"const HAND=new Set\(`([^`]*)`", html).group(1).split()
    ipa = open(os.path.join(root, 'dict-ipadic.js'), encoding='utf-8').read()
    ipadic = json.loads(re.search(r'window\.HB_IPADIC=("(?:[^"\\]|\\.)*")', ipa).group(1)).split()
    ok = lambda w, mx: w and w[0] != 'ー' and 2 <= len(w) <= mx and all(c == 'ー' or c in kana for c in w)
    words = {w for w in hand + ipadic if ok(w, 10**9)}
    cfg = open(os.path.join(root, 'config.js'), encoding='utf-8').read()
    url = re.search(r"url:'([^']+)'", cfg).group(1); key = re.search(r"key:'([^']+)'", cfg).group(1)
    req = urllib.request.Request(url + '/rest/v1/extra_words?select=word&limit=1000', headers={'apikey': key, 'Accept': 'application/json'})
    rows = json.load(urllib.request.urlopen(req, timeout=60))
    if not isinstance(rows, list): raise SystemExit('extra_words を読めなかった: %r' % rows)
    extra = [r.get('word') for r in rows if isinstance(r, dict) and isinstance(r.get('word'), str)]
    added = [w for w in extra if ok(w, 16) and w not in words]
    words |= set(added)
    print('hand+ipadic', len(words) - len(added), 'extra_words', len(extra), 'added', len(added), added[:20])
    return words

src, wordsf, out = sys.argv[1:4]
words = repo_words() if wordsf == '--repo' else set(json.load(open(wordsf, encoding='utf-8')))
# 小さい字の言葉（HB-016, D-043）：辞書には大きい字の形（ちよこ）で入り、見せる形（ちょこ）は dict-ipadic.js の HB_SMALL
_ipa = open('dict-ipadic.js', encoding='utf-8').read()
_m = re.search(r'window\.HB_SMALL=(\{.*?\});', _ipa)
SMALL_SHOW = json.loads(_m.group(1)) if _m else {}
SMALLK = 'ぁぃぅぇぉっゃゅょゎ'
def big(s): return ''.join(chr(ord(c) + 1) if c in SMALLK else c for c in s)
def shown(w): return SMALL_SHOW.get(w, w)
words.discard('るう')  # HB-005 の試し語（extra_words から消す予定）
COMMON = {'news1', 'ichi1', 'spec1', 'spec2', 'gai1'}  # jmdict-simplified の common と同じ定め
SKIP_K = {'sK', 'rK', 'iK', 'oK', 'ik'}               # 検索用・まれ・不規則な書き方は出さない
def hira(s): return ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in s)

# 実体（&n; など）は DTD 内で定義されているので、expat に読ませる前に名前そのものへ置き換える
raw = gzip.open(src, 'rt', encoding='utf-8').read()
body = raw[raw.index('<JMdict>'):]
body = re.sub(r'&([\w-]+);', lambda m: m.group(1) if m.group(1) not in ('lt','gt','amp','quot','apos') else m.group(0), body)
created = re.search(r'<!-- JMdict created: ([\d-]+) -->', raw)
root = ET.fromstring(body)

hits = {}  # word -> list of (common, seq, kanji[], glosses[])
for e in root.iter('entry'):
    seq = int(e.findtext('ent_seq'))
    kebs = []
    for k in e.findall('k_ele'):
        inf = {x.text for x in k.findall('ke_inf')}
        if inf & SKIP_K: continue
        kebs.append((k.findtext('keb'), any(p.text in COMMON for p in k.findall('ke_pri'))))
    for r in e.findall('r_ele'):
        reb = r.findtext('reb'); rh = hira(reb); w = big(rh)
        if w not in words: continue
        if rh != shown(w): continue   # 読みが見せる形と同じ項目だけ（しよう は 使用、ちよこ は ちょこ。しょう・ちよこ違いを混ぜない）
        if {x.text for x in r.findall('re_inf')} & SKIP_K: continue
        pri = [p.text for p in r.findall('re_pri')]
        rcommon = any(p in COMMON for p in pri)   # よく使うかは、この読みに付いた印だけで見る（嘴の印は「くちばし」の読みのもの）
        nf = min([int(p[2:]) for p in pri if p.startswith('nf')] or [99])  # 新聞での頻度の段（小さいほどよく使う）
        restr = {x.text for x in r.findall('re_restr')}
        if r.find('re_nokanji') is not None: ks = []
        else: ks = [k for k in kebs if not restr or k[0] in restr]
        ks.sort(key=lambda k: not k[1])
        kanji = [k[0] for k in ks]
        if not kanji and reb != rh: kanji = [reb]   # かなだけの語でカタカナの書き方があれば出す（ヨーヨー）
        senses = []
        for s in e.findall('sense'):
            stagr = {x.text for x in s.findall('stagr')}
            if stagr and reb not in stagr: continue
            g = [x.text for x in s.findall('gloss') if x.text]
            if g: senses.append(g)
        if not senses: continue
        hits.setdefault(w, []).append((rcommon, nf, seq, kanji, senses))

out_map = {}
for w, es in hits.items():
    es.sort(key=lambda x: (not x[0], x[1], x[2]))   # よく使う項目を先に。次に nf の段、同じなら JMdict の順
    kanji = []
    for _, _, _, ks, _ in es:
        for k in ks:
            if k not in kanji and len(kanji) < 3: kanji.append(k)
    # 英語：項目ごとに一つ目の意味から順に、項目をまたいで交互に取る（はし＝bridge・chopsticks・edge）
    glosses, rounds = [], [ [sv[0] for sv in x[4]] for x in es ]
    i = 0
    while len(glosses) < 3 and any(i < len(r) for r in rounds):
        for r in rounds:
            if i < len(r) and r[i] not in glosses and len(glosses) < 3: glosses.append(r[i])
        i += 1
    out_map[w] = ['・'.join(kanji), '; '.join(glosses)]

notice = f'''/* 投げた言葉の意味（漢字の書き方・英語）。HB-007（D-028）
   出典：JMdict（The Electronic Dictionary Research and Development Group, EDRDG）
   https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project
   使用したファイル：JMdict_e（{created.group(1) if created else '日付不明'} 作成）
   JMdict は Creative Commons Attribution-ShareAlike 4.0（CC BY-SA 4.0）で提供されている。
   https://creativecommons.org/licenses/by-sa/4.0/
   このファイルは JMdict から抜き出して並べ替えたもの（改変物）で、同じく CC BY-SA 4.0 で提供する。
   形：{{ ひらがなの言葉: [漢字の書き方（・区切り、3つまで）, 英語（; 区切り、3つまで）] }} */
'''
src_js = notice + 'window.HB_MEANINGS_NOTICE=' + json.dumps('意味（漢字・英語）は JMdict（EDRDG, https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project）から。CC BY-SA 4.0（https://creativecommons.org/licenses/by-sa/4.0/）。意味のデータ（meanings.js）も同じ条件で使える。JMdict_e ' + (created.group(1) if created else '') + ' 作成版。', ensure_ascii=False) + ';\n'
src_js += 'window.HB_MEANINGS=' + json.dumps(dict(sorted(out_map.items())), ensure_ascii=False, separators=(',', ':')) + ';\n'
open(out, 'w', encoding='utf-8').write(src_js)
print('words', len(words), 'with', len(out_map), 'without', len(words) - len(out_map))
print('small words with meaning', sum(1 for w in out_map if w in SMALL_SHOW), 'of', len(SMALL_SHOW))
for t in ['ちよこ', 'しよう', 'すつぱい', 'もつたいない', 'まつくろい', 'はし', 'よーよー', 'つよい', 'すこ', 'あほ', 'すめし', 'いき', 'はこね', 'めーる', 'しし']:
    print(t, out_map.get(t))
