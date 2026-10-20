export function softmax(values: ArrayLike<number>): number[];
export function probabilityTrace(rows: ArrayLike<number>[],labels:string[],options?:{blank?:number;topK?:number;probes?:string[]}):any;
export function decodeCTCProbabilities(rows:ArrayLike<number>[],labels:string[],blank?:number):any;
