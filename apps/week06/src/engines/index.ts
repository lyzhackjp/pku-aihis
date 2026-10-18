import models from './models.json';
export {models};
export const runNDL=async(...args:Parameters<typeof import('./ndl').ndl>)=>(await import('./ndl')).ndl(...args);
export const runPaddle=async(...args:Parameters<typeof import('./paddle').paddle>)=>(await import('./paddle')).paddle(...args);
export const runFlorence=async(...args:Parameters<typeof import('./florence').florence>)=>(await import('./florence')).florence(...args);
