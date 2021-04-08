import commonjs from '@rollup/plugin-commonjs';
//import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'shared/js/content-scope/fingerprint.js',
  output: {
    dir: 'build',
    format: 'iife',
    name: 'protections'
  },
  plugins: [/*nodeResolve(),*/ commonjs()]
};
