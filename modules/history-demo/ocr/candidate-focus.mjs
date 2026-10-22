// Candidate. Search only decoded positions through the first EOS, never the unused tail.
export const hasVariantCandidate=p=>p?.candidates?.slice(0,5).some(c=>c.text==='德'||c.text==='徳')||false;
export function decodedPositions(trace){const ps=trace?.positions||[];return Number.isInteger(trace?.stop)?ps.slice(0,trace.stop+1):ps;}
export function variantPosition(trace){return decodedPositions(trace).findIndex(hasVariantCandidate);}
export const candidateKey=(region,scope='')=>'position:'+scope+':'+region?.id+':'+region?.text+':'+(region?.recognition_trace?.positions?.length||0);
