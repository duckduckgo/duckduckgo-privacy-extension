# Unit tests

This folder contains unit-tests, which test individual components and functions in the source code. These tests
are written using the [Jasmine](https://jasmine.github.io/) testing framework.
Tests are bundled with `esbuild` (with the exception of tests in the `legacy` folder, which still use `browserify`), then run in one of two test environments:
 1. Node: these tests run in a plain node process. Tests placed in the `node` folder will be run in this environment.
 2. Browser: the rest of the tests are run in a headless chrome browser (using `karma`'s test runner).

## Running tests

Tests can be run as follows:
 - `npm test`: Run all tests (both node and browser).
 - `npm run test.unit`: Run only browser-based unit tests.
 - `npm run test.node`: Run only node-based unit tests.

## Notes

- To reduce the amount of noise when running the tests, `console.log()` and
  `console.debug()` output is suppressed. If you need to log something to the
  console while working on the tests use `console.warn()` or `console.error()`
  instead.
