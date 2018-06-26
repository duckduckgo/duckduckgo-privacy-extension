let normalizeCompanyName = require('../../../../shared/js/ui/models/mixins/normalize-company-name.es6')
normalizeCompanyName = normalizeCompanyName.normalizeCompanyName
const companyNamesTestCases = [
    {
        'name': 'Amazon.com',
        'result': 'amazon'
    },
    {
        'name': 'comScore',
        'result': 'comscore'
    },
    {
        'name': '',
        'result': ''
    },
    {
        'name': 'undefined',
        'result': ''
    },
    {
        'name': 'AOL',
        'result': 'aol'
    }
]

describe('normalizeCompanyName', () => {
    companyNamesTestCases.forEach((test) => {
        it(`should return ${test.result} for company ${test.name}`, () => {
            let result
            if (test.name === 'undefined') {
                result = normalizeCompanyName()
            } else {
                result = normalizeCompanyName(test.name)
            }

            expect(result).toEqual(test.result)
        })
    })
})
