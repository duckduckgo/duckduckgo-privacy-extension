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
npm run tracker-blocking ../tds.json ../tracker-blocking-ruleset.json [../tracker-domain-by-rule-id.txt]
```

Generate a Tracker Blocking Allowlist ruleset:

```bash
npm run tracker-blocking-allowlist ../extension-config.json ../tracker-blocking-allowlist-ruleset.json \
        [../tracker-domain-and-reason-by-rule-id.json]
```


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
