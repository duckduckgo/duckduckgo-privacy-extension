const testEasylist = [
  '/banner/*/img^',
  '||ads.example.com^',
  '|http://wtf.asdf.net|',
  '||ads.somesite.com^$script,image,domain=somesite.com|~foo.somesite.info',
  '!block this, then whitelist',
  '||ad.someothersite.com/notbanner^',
  '@@||ad.someothersite.com/notbanner^',
  '! block this, then whitelist all but script requests',
  '||ads.twitter.com/notbanner^',
  '@@||ads.twitter.com/notbanner^$~script',
  'svf|',
  '! wildcard filters',
  'asdf.com/?q=*&param=',
  '||shopify.com/storefront/page?*&eventtype='
]

const regexList = [
  '/\.com\/[0-9]{2,9}\/$/$script,stylesheet,third-party,xmlhttprequest',
]
