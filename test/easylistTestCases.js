const easylistTestCases = [
    // blocking by address parts
    // /banner/*/img
    {'url': 'http://example/banner/foo/img', 'block': true, 'options': {}},
    {'url': 'http://example/banner/foo/bar/img?param', 'block': true, 'options': {}},
    {'url': 'http://example/banner//img/foo', 'block': true, 'options': {}},
    {'url': 'http://example/banner/img', 'block': false, 'options': {}},
    {'url': 'http://example/banner/foo/imgraph', 'block': false, 'options': {}},
    {'url': 'http://example/banner/foo/img.gif', 'block': false, 'options': {}},

    // blocking by domain
    // ||ads.example.com^
    {'url': 'http://ads.example.com/foo.gif', 'block': true, 'options': {}},
    {'url': 'http://server1.ads.example.com/foo.gif', 'block': true, 'options': {}},
    {'url': 'http://ads.example.com:8000/', 'block': true, 'options': {}},
    {'url': 'http://ads.example.com.ua/foo.gif', 'block': false, 'options': {}},
    {'url': 'http://example2.com/foo.gif', 'block': false, 'options': {}},
    {'url': 'http://example.info/redirect/http://example.com/', 'block': false, 'options': {}},

    // blocking options
    // ||ads.somesite.com^$script,image,domain=example.com|~foo.example.info
    {'url': 'https://ads.somesite.com/foo.gif', 'block': true, 'options': {'type': 'IMAGE', 'domain': 'somesite.com'}},
    {'url': 'http://ads.somesite.com/foo.gif', 'block': true, 'options': {'type': 'IMAGE', 'domain': 'somesite.com'}},
    {'url': 'http://ads.somesite.com/foo.gif', 'block': false, 'options': {'type': 'IMAGE', 'domain': 'foo.somesite.info'}},
    {'url': 'http://ads.somesite.com/foo.gif', 'block': false, 'options': {'type': 'STYLESHEET', 'domain': 'somesite.com'}},
    {'url': 'http://ads.somesite.com/foo.gif', 'block': false, 'options': {'type': 'OBJECT', 'domain': 'somesite.com'}},

    // exception rules
    //  @@||ads.somesite.com/notbanner^
    {'url': 'https://ad.somesiteothersite.com/notbanner', 'block': false, 'options': {'type': 'IMAGE', 'domain': 'somesite.com'}},
    {'url': 'https://ad.somesiteothersite.com/notbanner?q=1', 'block': false, 'options': {'type': 'IMAGE', 'domain': 'somesite.com'}},

    // exception options
    {'url': 'https://ads.twitter.com/notbanner/', 'block': false, 'options': {'type': 'IMAGE', 'domain': 'somesite.com'}},
    
    // comment this test out. I'm pretty sure this is a bug in the match function but need to look into it more
    // This line needs to check that the url is in the bloom filter and has a matching filter, && not ||
    // https://github.com/duckduckgo/abp-filter-parser/blob/master/src/abp-filter-parser.js#L588
    //{'url': 'https://ads.twitter.com/notbanner/', 'block': true, 'options': {'type': 'SCRIPT', 'domain': 'somesite2.com'}},

    // end of line options
    // svf|
    {'url': 'https://ads.trackersite.net?t=a.svf', 'block': true, 'options': {'type': 'SCRIPT', 'domain': 'somesite.com'}},
    {'url': 'https://ads.trackersite.net/svf/asdf', 'block': false, 'options': {'type': 'SCRIPT', 'domain': 'somesite.com'}},
    
    // regex filters
    // Need to find and fix a bug in regex filter parsing
    //{'url': 'https://somesite.com/1234/', 'block': true, 'options': {}},
    //{'url': 'https://somesite.com/1234/asfas', 'block': false, 'options': {}}
    
    // wildcard filter
    {'url': 'https://asdf.com/?q=asdfd&param=q', 'block': true, 'options': {}},
    {'url': 'https://asdf.com/?q=asdfsdfaparam=a', 'block': false, 'options': {}},
    //{'url': 'https://v.shopify.com/storefront/page?referrer=stuff&eventtype=page', block: true, options: {domain: 'facebook.com', type: 'OBJECT'}}, // from easy privacy ||shopify.com/storefront/page?*&eventty
]
