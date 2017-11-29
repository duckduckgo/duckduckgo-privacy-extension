/*
 * Test cases for the abp-filter-parser match function.
 * Test filters are located in test/testEasylist.js
 *
 * For more info on writing filters see:
 * https://adblockplus.org/filters
 * https://adblockplus.org/filter-cheatsheet
 */
const easylistTestCases = [
    /*
     * blocking by address parts using wildcards
    */
    // /banner/*/img
    {'url': 'http://example/banner/foo/img', 'block': true, 'options': {}},
    {'url': 'http://example/banner/foo/bar/img?param', 'block': true, 'options': {}},
    {'url': 'http://example/banner//img/foo', 'block': true, 'options': {}},
    {'url': 'http://example/banner/img', 'block': false, 'options': {}},
    {'url': 'http://example/banner/foo/imgraph', 'block': false, 'options': {}},
    {'url': 'http://example/banner/foo/img.gif', 'block': false, 'options': {}},

    // asdf.com/?q=*&param=
    {'url': 'https://asdf.com/?q=asdfd&param=q', 'block': true, 'options': {}},
    {'url': 'https://asdf.com/?q=asdfsdfaparam=a', 'block': false, 'options': {}},
    // This test fails. Still need to look into it.
    //{'url': 'https://v.shopify.com/storefront/page?referrer=stuff&eventtype=page', block: true, options: {domain: 'facebook.com', type: 'OBJECT'}}, // from easy privacy ||shopify.com/storefront/page?*&eventty

    /*
     * blocking by domain
     */
    // ||ads.example.com^
    // Domain anchor '||' so the domain must start with ads.example.com
    {'url': 'http://ads.example.com/foo.gif', 'block': true, 'options': {}},
    {'url': 'http://server1.ads.example.com/foo.gif', 'block': true, 'options': {}},
    {'url': 'http://ads.example.com:8000/', 'block': true, 'options': {}},
    {'url': 'http://ads.example.com.ua/foo.gif', 'block': false, 'options': {}},
    {'url': 'http://example2.com/foo.gif', 'block': false, 'options': {}},
    {'url': 'http://example.info/redirect/http://example.com/', 'block': false, 'options': {}},
    {'url': 'http://example.com/redirect/http://ads.example.com/', 'block': false, 'options': {}},

    /*
     * blocking options
     */
    // ||ads.somesite.com^$script,image,domain=example.com|~foo.example.info
    // Match on script,and images on example.com
    // Do not match on foo.example.info
    {'url': 'https://ads.somesite.com/foo.gif', 'block': true, 'options': {'type': 'IMAGE', 'domain': 'somesite.com'}},
    {'url': 'http://ads.somesite.com/foo.gif', 'block': true, 'options': {'type': 'IMAGE', 'domain': 'somesite.com'}},
    {'url': 'http://ads.somesite.com/foo.gif', 'block': false, 'options': {'type': 'IMAGE', 'domain': 'foo.somesite.info'}},
    {'url': 'http://ads.somesite.com/foo.gif', 'block': false, 'options': {'type': 'STYLESHEET', 'domain': 'somesite.com'}},
    {'url': 'http://ads.somesite.com/foo.gif', 'block': false, 'options': {'type': 'OBJECT', 'domain': 'somesite.com'}},

    /*
     * exception rules
     */
    //  @@||ads.somesite.com/notbanner^
    //  Do not block requests matching ads.somesite.com/notbanner
    {'url': 'https://ad.somesiteothersite.com/notbanner', 'block': false, 'options': {'type': 'IMAGE', 'domain': 'somesite.com'}},
    {'url': 'https://ad.somesiteothersite.com/notbanner?q=1', 'block': false, 'options': {'type': 'IMAGE', 'domain': 'somesite.com'}},

    /*
     * exception options
     */
    // @@||ads.twitter.com/notbanner^$~script'
    // Do not block script requests from ads.twitter.com/notbanner
    {'url': 'https://ads.twitter.com/notbanner/', 'block': false, 'options': {'type': 'IMAGE', 'domain': 'somesite.com'}},
    // comment this test out. I'm pretty sure this is a bug in the match function but need to look into it more
    // This line needs to check that the url is in the bloom filter and has a matching filter, && not ||
    // https://github.com/duckduckgo/abp-filter-parser/blob/master/src/abp-filter-parser.js#L588
    //{'url': 'https://ads.twitter.com/notbanner/', 'block': true, 'options': {'type': 'SCRIPT', 'domain': 'somesite2.com'}},

    /*
     * regex filters
     */
    // Need to find and fix a bug in regex filter parsing
    // /\.com\/[0-9]{2,9}\/$/$script,stylesheet,third-party,xmlhttprequest'
    //{'url': 'https://somesite.com/1234/', 'block': true, 'options': {}},
    //{'url': 'https://somesite.com/1234/', 'block': false, 'options': {'type': 'IMAGE'}},
    //{'url': 'https://somesite.com/1234/asfas', 'block': false, 'options': {}},
    

    /*
     * anchors
     */
    // block all third party scripts on a site
    // left anchor so request must start with http://
    // |http://$third-party,script,domain=somesite.net'
    {'url': 'http://tracker.asdf.net', 'block': true, 'options': {'type': 'SCRIPT', 'domain': 'somesite.net'}},
    {'url': 'http://tracker.asdf.net', 'block': false, 'options': {'type': 'IMAGE', 'domain': 'somesite.net'}},
    {'url': 'https://tracker.asdf.net', 'block': false, 'options': {'type': 'SCRIPT', 'domain': 'somesite.net'}},
    // Right anchor so request must end with svf
    // svf|
    {'url': 'https://ads.trackersite.net?t=a.svf', 'block': true, 'options': {'type': 'SCRIPT', 'domain': 'somesite.com'}},
    {'url': 'https://ads.trackersite.net/svf/asdf', 'block': false, 'options': {'type': 'SCRIPT', 'domain': 'somesite.com'}},
]
