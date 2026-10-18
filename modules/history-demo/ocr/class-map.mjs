// 候选，未经教师确认。Mapping never changes the engine's original class name.
export const CLASSES = ['正文', '标题', '页码', '书口或柱', '注音', '注释', '图', '其他'];
const groups = {
  正文: ['本文', 'line_main', 'Text', 'text', 'paragraph', 'List-item'],
  标题: ['タイトル本文', 'line_title', 'Title', 'Section-header', 'heading'],
  页码: ['ノンブル', 'block_folio', 'Page-footer', 'page-number'],
  书口或柱: ['柱', 'block_pillar', 'Page-header', 'header'],
  注音: ['ルビ', 'block_rubi', 'ruby'],
  注释: ['頭注', '割注', '脚注', '注', 'Footnote', 'Caption', 'line_note', 'line_note_tochu', 'line_caption', 'footnote', 'caption'],
  图: ['図版', '図', 'Picture', 'image', 'block_fig'],
};
export function normalizeClass(original) {
  return Object.entries(groups).find(([, names]) => names.includes(original))?.[0] || '其他';
}
export const CLASS_COLORS = Object.fromEntries(CLASSES.map((c, i) => [c, ['#164ec7','#9b3c9f','#b45b09','#675234','#c32954','#117a73','#397d27','#62676d'][i]]));
