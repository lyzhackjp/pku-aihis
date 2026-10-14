/**
 * Read-only SQLite reader for the fixed Patchouli backup tables.
 *
 * It parses the documented SQLite file format (header, table B-trees, record
 * format, overflow chains) so that importers can read a course backup in the
 * browser without bundling a native or WASM engine. It supports ordinary rowid
 * tables only; it never writes and refuses WAL-only or non-UTF-8 databases.
 * Reference: https://www.sqlite.org/fileformat.html
 */
const MAGIC = "SQLite format 3\u0000";

export function openSqlite(bytes) {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (buf.length < 100 || new TextDecoder().decode(buf.subarray(0, 16)) !== MAGIC)
    throw Error("不是 SQLite 数据库文件。");
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let pageSize = view.getUint16(16);
  if (pageSize === 1) pageSize = 65536;
  const reserved = buf[20];
  const usable = pageSize - reserved;
  const encoding = view.getUint32(56);
  if (encoding !== 1) throw Error("数据库文本编码不是 UTF-8，暂不支持。");
  if (buf[18] === 2 || buf[19] === 2)
    throw Error("数据库处于 WAL 模式且未合并，请先在原程序中完成备份。");
  const decoder = new TextDecoder("utf-8");
  const pageCount = Math.floor(buf.length / pageSize);

  const page = (n) => {
    if (n < 1 || n > pageCount) throw Error(`数据库页码越界：${n}`);
    return (n - 1) * pageSize;
  };
  function varint(pos) {
    let value = 0n;
    for (let i = 0; i < 9; i++) {
      const byte = buf[pos + i];
      if (i === 8) return [(value << 8n) | BigInt(byte), pos + 9];
      value = (value << 7n) | BigInt(byte & 0x7f);
      if (!(byte & 0x80)) return [value, pos + i + 1];
    }
    return [value, pos + 9];
  }
  // Payload of a table-leaf cell, following the overflow chain when needed.
  function payload(cellStart, isIndex = false) {
    let [size, p] = varint(cellStart);
    if (!isIndex) p = varint(p)[1]; // skip rowid
    size = Number(size);
    const X = usable - 35;
    if (size <= X) return buf.subarray(p, p + size);
    const M = Math.floor(((usable - 12) * 32) / 255) - 23;
    let local = M + ((size - M) % (usable - 4));
    if (local > X) local = M;
    const out = new Uint8Array(size);
    out.set(buf.subarray(p, p + local), 0);
    let written = local,
      next = view.getUint32(p + local);
    while (written < size && next) {
      const o = page(next);
      next = view.getUint32(o);
      const take = Math.min(usable - 4, size - written);
      out.set(buf.subarray(o + 4, o + 4 + take), written);
      written += take;
    }
    if (written < size) throw Error("数据库溢出页链不完整。");
    return out;
  }
  function decodeRecord(rec) {
    const rv = new DataView(rec.buffer, rec.byteOffset, rec.byteLength);
    const readVar = (pos) => {
      let value = 0n;
      for (let i = 0; i < 9; i++) {
        const byte = rec[pos + i];
        if (i === 8) return [(value << 8n) | BigInt(byte), pos + 9];
        value = (value << 7n) | BigInt(byte & 0x7f);
        if (!(byte & 0x80)) return [value, pos + i + 1];
      }
      return [value, pos + 9];
    };
    let [headerSize, p] = readVar(0);
    const types = [];
    while (p < Number(headerSize)) {
      const [t, q] = readVar(p);
      types.push(Number(t));
      p = q;
    }
    let d = Number(headerSize);
    const values = [];
    for (const t of types) {
      if (t === 0) values.push(null);
      else if (t >= 1 && t <= 6) {
        const len = [0, 1, 2, 3, 4, 6, 8][t];
        let v = 0n;
        for (let i = 0; i < len; i++) v = (v << 8n) | BigInt(rec[d + i]);
        const bits = BigInt(len * 8);
        if (v & (1n << (bits - 1n))) v -= 1n << bits;
        values.push(Number(v));
        d += len;
      } else if (t === 7) {
        values.push(rv.getFloat64(d));
        d += 8;
      } else if (t === 8) values.push(0);
      else if (t === 9) values.push(1);
      else if (t >= 12 && t % 2 === 0) {
        const len = (t - 12) / 2;
        values.push(rec.slice(d, d + len));
        d += len;
      } else if (t >= 13) {
        const len = (t - 13) / 2;
        values.push(decoder.decode(rec.subarray(d, d + len)));
        d += len;
      } else throw Error("数据库记录类型无法识别。");
    }
    return values;
  }
  function* walk(root) {
    const stack = [root];
    while (stack.length) {
      const n = stack.pop();
      const o = page(n) + (n === 1 ? 100 : 0);
      const type = buf[o];
      const cells = view.getUint16(o + 3);
      if (type === 0x0d) {
        for (let i = 0; i < cells; i++) {
          const cell = page(n) + view.getUint16(o + 8 + i * 2);
          const [, afterSize] = varint(cell);
          const [rowid] = varint(afterSize);
          yield [Number(rowid), decodeRecord(payload(cell))];
        }
      } else if (type === 0x05) {
        const children = [];
        for (let i = 0; i < cells; i++)
          children.push(view.getUint32(page(n) + view.getUint16(o + 12 + i * 2)));
        children.push(view.getUint32(o + 8));
        for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]);
      } else throw Error(`遇到不支持的数据库页类型 ${type}（只读取普通 rowid 表）。`);
    }
  }
  const master = [...walk(1)].map(([, v]) => ({ type: v[0], name: v[1], table: v[2], root: v[3], sql: v[4] }));
  function columns(sql) {
    const body = sql.slice(sql.indexOf("(") + 1, sql.lastIndexOf(")"));
    const parts = [];
    let depth = 0,
      cur = "";
    for (const ch of body) {
      if (ch === "(") depth++;
      if (ch === ")") depth--;
      if (ch === "," && depth === 0) {
        parts.push(cur);
        cur = "";
      } else cur += ch;
    }
    parts.push(cur);
    return parts
      .map((x) => x.trim())
      .filter((x) => x && !/^(foreign|check|unique|primary|constraint)\b/i.test(x))
      .map((x) => {
        const name = x.match(/^["`[]?([A-Za-z0-9_]+)/)[1];
        return { name, rowidAlias: /^\S+\s+integer\s+primary\s+key/i.test(x) };
      });
  }
  return {
    pageSize,
    tables: master.filter((m) => m.type === "table").map((m) => m.name),
    rows(name) {
      const m = master.find((x) => x.type === "table" && x.name === name);
      if (!m) throw Error(`数据库缺少表 ${name}。`);
      if (/without\s+rowid/i.test(m.sql)) throw Error(`表 ${name} 不是普通 rowid 表。`);
      const cols = columns(m.sql);
      const out = [];
      for (const [rowid, values] of walk(m.root)) {
        const row = {};
        cols.forEach((c, i) => (row[c.name] = c.rowidAlias && values[i] == null ? rowid : (values[i] ?? null)));
        out.push(row);
      }
      return out;
    },
  };
}
