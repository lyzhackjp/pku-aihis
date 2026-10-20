export const COORDINATES:string[][];
export function endpoint(base:string,protocol?:string):string;
export function buildRequest(c:any,messages:any[],options?:any):any;
export function parseResponse(raw:any,protocol:string):any;
export function convertBox(box:number[],kind:string,width:number,height:number):number[];
export function coordinatePrompt(kind:string,width:number,height:number):string;
export function normalizeRegions(text:string,kind:string,width:number,height:number):any;
export function redact(value:any,secrets:string[]):any;
