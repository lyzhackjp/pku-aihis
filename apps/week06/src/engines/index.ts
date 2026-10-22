import models from './models.json';
export {models};
export const runNDL=async(...args:Parameters<typeof import('./ndl').ndl>)=>(await import('./ndl')).ndl(...args);
export const runPaddle=async(...args:Parameters<typeof import('./paddle').paddle>)=>(await import('./paddle')).paddle(...args);
export const runFlorence=async(...args:Parameters<typeof import('./florence').florence>)=>(await import('./florence')).florence(...args);
export const runNDLLine=async(...args:Parameters<typeof import('./ndl').ndlLine>)=>(await import('./ndl')).ndlLine(...args);
export const runPaddleLine=async(...args:Parameters<typeof import('./paddle').paddleLine>)=>(await import('./paddle')).paddleLine(...args);
export const preflight=async(...args:Parameters<typeof import('./preflight').preflight>)=>(await import('./preflight')).preflight(...args);
