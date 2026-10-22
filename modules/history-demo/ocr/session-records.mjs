// Session choices are bound to the actual image bytes, never just a material name.
export function sessionRecordChoices(records,image,selected=''){
 const choices=records.flatMap((record,index)=>image?.sha256&&record.image.sha256===image.sha256?[{value:String(index),record}]:[]);
 const current=choices.find(x=>x.value===selected);
 const fallback=choices.filter(x=>!x.record.engine.params?.experiment).at(-1)||choices.at(-1);
 return {choices,selected:(current||fallback)?.value||''};
}
