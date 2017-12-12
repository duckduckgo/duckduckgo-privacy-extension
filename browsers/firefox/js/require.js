function require(module) {
      return require.scopes[module];
}
require.scopes = {};
