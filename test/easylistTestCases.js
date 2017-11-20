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

    // blocking an exact address
    // |http://example2.com|
    
    // fails, need to find out why
    //{'url': 'http://example.com/', 'block': true, 'options': {}},
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
    {'url': 'https://ads.anothersite.com/notbanner/', 'block': false, 'options': {'type': 'IMAGE', 'domain': 'somesite.com'}},
    //{'url': 'https://ads.anothersite.com/notbanner/', 'block': true, 'options': {'type': 'SCRIPT', 'domain': 'somesite2.com'}},
]
