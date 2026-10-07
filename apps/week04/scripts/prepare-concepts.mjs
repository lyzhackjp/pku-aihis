import fs from 'node:fs/promises';
import {parseConceptAppendix} from '../src/lib/concept-appendix.ts';
const source=await fs.access('../../docs/week04/concept-appendix.md').then(()=> '../../docs/week04/concept-appendix.md',()=> 'src/assets/data/concept-appendix.md');
const text=await fs.readFile(source,'utf8');
await fs.writeFile('src/assets/data/glossary.json',JSON.stringify(parseConceptAppendix(text),null,1)+'\n');
await fs.writeFile('src/assets/data/concept-appendix.md',text);
