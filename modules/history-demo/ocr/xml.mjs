// Small non-network XML tree reader. Reject declarations that can expand external entities.
export function parseXML(xml) {
  if (typeof xml !== 'string' || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw Error('不接受 DTD／实体声明');
  const root = { name: '#document', attrs: {}, children: [], content: [], text: '', start: 0 }, stack = [root];
  const decode = s => s.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, x) => x[0] === '#' ? String.fromCodePoint(parseInt(x.slice(x[1] === 'x' ? 2 : 1), x[1] === 'x' ? 16 : 10)) : ({ amp:'&', lt:'<', gt:'>', quot:'"', apos:"'" })[x]);
  const tokens = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<[^>]+>|[^<]+/g;
  for (const m of xml.matchAll(tokens)) {
    const t = m[0], parent = stack.at(-1);
    if (t.startsWith('<!--') || t.startsWith('<?')) continue;
    if (t.startsWith('<![CDATA[')) { parent.text += t.slice(9,-3); parent.content.push(t.slice(9,-3)); continue; }
    if (t.startsWith('</')) {
      const name = t.slice(2,-1).trim().split(':').at(-1);
      if (stack.length === 1 || parent.name !== name) throw Error('XML 标签未配对：' + name);
      parent.raw = xml.slice(parent.start,m.index+t.length); stack.pop(); continue;
    }
    if (t.startsWith('<')) {
      const match = t.match(/^<([\w:.-]+)/); if (!match) throw Error('XML 标签无效');
      const node = { name: match[1].split(':').at(-1), attrs: {}, children: [], content: [], text: '', start: m.index };
      for (const a of t.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) node.attrs[a[1].split(':').at(-1)] = decode(a[2] ?? a[3]);
      parent.children.push(node); parent.content.push(node);
      if (/\/\s*>$/.test(t)) node.raw = t; else stack.push(node);
    } else { parent.text += decode(t); parent.content.push(decode(t)); }
  }
  if (stack.length !== 1 || root.children.length !== 1) throw Error('XML 不完整或包含多个根节点');
  return root.children[0];
}
export const descendants = (node, name) => node.children.flatMap(n => [...(n.name === name ? [n] : []), ...descendants(n,name)]);
