/**
 * Type declaration for the vendored js-sha1 library (sha1.js), which exports
 * itself via a conditional `module.exports` that TypeScript cannot detect.
 */
declare function sha1(message: string | ArrayBuffer | ArrayLike<number>): string;
export = sha1;
