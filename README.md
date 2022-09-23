# ddg2dnr

## Introduction

This is a library and command line utility to generate the [declarativeNetRequest][1]
rulesets necessary for the [DuckDuckGo Privacy Essentials extension][2].


## Setup

Install the dependencies:

```bash
npm install
```

## Usage

### Command line

Generate a Smarter Encryption ruleset:

```bash
npm run smarter-encryption ../list-of-domains.txt ../smarter-encryption-ruleset.json
```

Generate a Tracker Blocking ruleset:

```bash
npm run tds ../tds.json ../tracker-blocking-ruleset.json [../tracker-domain-by-rule-id.txt]
```

Generate the extension configuration ruleset:

```bash
npm run extension-configuration ../extension-config.json ../extension-configuration-ruleset.json \
        [../match-details-by-rule-id.json]
```

Note:
 - Extension configuration ruleset generation is a work in progress. So far,
   only the tracker allowlist is supported.

## Development

Lint the code:

```bash
npm run lint
```

Run the tests:

```bash
npm test
```

[1]: https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/
[2]: https://github.com/duckduckgo/duckduckgo-privacy-extension/
