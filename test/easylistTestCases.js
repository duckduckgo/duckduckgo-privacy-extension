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
    {'url': 'http://example.com/stuff', 'block': false, 'options': {}},

    // whitelisted domain anchors with wildcard
    // we block site.bar.com with
    // '||site.bar.com^'
    // then whitelist */test.img for yahoo.com, only for image requests
    // '@@||site.bar.com/*/test.img$image,domain=yahoo.com'
    {'url': 'https://foo.site.bar.com/image.gif', 'block': true, 'options': {}},
    {'url': 'https://foo.site.bar.com/fasfasdf/image.gif', 'block': true, 'options': {}},
    {'url': 'https://foo.site.bar.com/asdf/test.img', 'block': false, 'options': {'type': 'IMAGE', 'domain': 'yahoo.com'}}, // shouldn't block, fits domain and request type
    {'url': 'https://foo.site.bar.com/asdf/test.img', 'block': true, 'options': {'type': 'SCRIPT', 'domain': 'yahoo.com'}}, // block, doesn't match correct request type
    {'url': 'https://foo.site.bar.com/asdf/test.img', 'block': true, 'options': {'type': 'IMAGE', 'domain': 'anydomain.com'}}, // block, doesn't match domain
    {'url': 'https://foo.site.bar.com/test.img', 'block': true, 'options': {'domain': 'anydomain.com'}},

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
    {'url': 'https://ads.twitter.com/notbanner/', 'block': true, 'options': {'type': 'SCRIPT', 'domain': 'somesite2.com'}},

    /*
     * regex filters
     */
    // Need to find and fix a bug in regex filter parsing
    // /\.com\/[0-9]{2,9}\/$/$script,stylesheet,third-party,xmlhttprequest'
    {'url': 'https://somesite.com/1234/', 'block': true, 'options': {}},
    {'url': 'https://somesite.com/12345/', 'block': true, 'options': {}},
    {'url': 'https://somesite.com/123456/', 'block': true, 'options': {}},
    {'url': 'https://somesite.com/1234/', 'block': false, 'options': {'type': 'IMAGE'}},
    {'url': 'https://somesite.com/1/', 'block': false, 'options': {}},
    {'url': 'https://somesite.com/1234/asfas', 'block': false, 'options': {}},
    {'url': 'https://somesite.com/1234/asfas', 'block': false, 'options': {}},
    // regex filter with multiple $ characters
    // yahoo\.com\/ads\/[0-9]{2,5}\/q=\$param\/$/$domain=~yahoo.com'
    {'url': 'http://yahoo.com/ads/123/q=$param/', 'block': false, 'options': {'domain': 'yahoo.com'}}, // shouldn't block on yahoo.com
    {'url': 'http://yahoo.com/ads/123/q=$param/', 'block': true, 'options': {'domain': 'someothersite.com'}},

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

    // parse the correct host from filters like ||facebook.com*/impression.php
    {'url': 'https://www.facebook.com/impression.php/f2c7ffad89f0f24', 'block': true, 'options': {'type': 'SCRIPT', 'domain': 'somesite.com'}},

]
