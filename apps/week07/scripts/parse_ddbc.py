# 解析 DDBC 時間規範資料庫 SQL dump（CC BY-SA 3.0）为紧凑 JSON
import re, sys, json
def rows(sql, table):
    out = []
    for m in re.finditer(r"INSERT INTO `%s` VALUES (.*?);\n" % table, sql, re.S):
        body = m.group(1); i = 0; n = len(body)
        while i < n:
            if body[i] != '(': i += 1; continue
            i += 1; vals = []; cur = ''
            while True:
                c = body[i]
                if c == "'":
                    i += 1; s = ''
                    while body[i] != "'":
                        if body[i] == '\\': s += body[i+1]; i += 2
                        else: s += body[i]; i += 1
                    i += 1; cur = s; isstr = True; continue
                if c in ',)':
                    vals.append(cur if not isinstance(cur, str) or cur != '' else None) if False else vals.append(cur)
                    cur = ''
                    i += 1
                    if c == ')': break
                    continue
                cur += c; i += 1
            out.append(vals)
    return out
def load(path):
    sql = open(path, encoding='utf8').read()
    T = {t: rows(sql, t) for t in ['t_dynasty_names','t_emperor','t_emperor_names','t_era','t_era_names','t_month']}
    return T
if __name__ == '__main__':
    T = load(sys.argv[1])
    for k, v in T.items(): print(k, len(v), v[:2])
