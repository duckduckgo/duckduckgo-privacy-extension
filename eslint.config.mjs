import ddgConfig from '@duckduckgo/eslint-config'
import globals from 'globals'

export default [
    ...ddgConfig,

    {
        ignores: ['shared/js/content-scope/sjcl.js', 'unit-test/data/reference-tests/'],
    },

    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.webextensions,
                ...globals.browser,
                ...globals.jasmine,
                ...globals.jquery,
            },
        },

        rules: {
            'no-shadow': ['error'],

            'no-restricted-syntax': [
                'error',
                {
                    selector: ':matches(ImportNamespaceSpecifier, ExportAllDeclaration, ExportNamespaceSpecifier)',
                    message: 'Prefer explicit named imports over wildcard (import * as x)',
                },
            ],
        },
    },

    {
        files: ['packages/ddg2dnr/**/*.js'],
        rules: {
            'generator-star-spacing': [
                'error',
                {
                    before: false,
                    after: true,
                },
            ],
        },
    },

    {
        files: ['packages/privacy-grade/**/*.js'],
        rules: {
            'object-shorthand': 0,
        },
    },
]
