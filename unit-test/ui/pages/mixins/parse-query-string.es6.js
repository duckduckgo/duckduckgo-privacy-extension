let parseQueryString = require('../../../../shared/js/ui/pages/mixins/parse-query-string.es6')
parseQueryString = parseQueryString.parseQueryString

const tests = [
    { input: '?foo=bar&bar=baz', expected: { foo: 'bar', bar: 'baz' } },
    { input: 'foo=bar&bar=baz', expected: { foo: 'bar', bar: 'baz' } },
    { input: '?foo=1&', expected: { foo: '1' } },
    { input: '?foo=1&bar=', expected: { foo: '1' } },
    { input: '?foo=1&bar=0', expected: { foo: '1', bar: '0' } }
]

describe('parseQueryString', () => {
    tests.forEach((test) => {
        it(`should parse ${test.input} correctly`, () => {
            expect(parseQueryString(test.input)).toEqual(test.expected)
        })
    })
})
