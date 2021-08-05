const testEasylist = [
  '/banner/*/img^',
  '||ads.example.com^',
  '||ads.somesite.com^$script,image,domain=somesite.com|~foo.somesite.info',
  '!block this, then whitelist',
  '||ad.someothersite.com/notbanner^',
  '@@||ad.someothersite.com/notbanner^',
  '! block this, then whitelist all but script requests',
  '||ads.twitter.com/notbanner^',
  '@@||ads.twitter.com/notbanner^$~script',
  '! wildcard filters',
  'asdf.com/?q=*&param=',
  '||shopify.com/storefront/page?*&eventtype=',
  '! anchors',
  '|http://$third-party,script,domain=somesite.net',
  'svf|',
  '!domain anchor with wildcard and options',
  '||site.bar.com^',
  '@@||site.bar.com/*/test.img$image,domain=yahoo.com',
  '||facebook.com*/impression.php'
]

const regexList = [
  '/\.com\/[0-9]{2,9}\/$/$script,stylesheet,third-party,xmlhttprequest',
  '! filter with multiple $ characters to test regex parsing. This is hypothetical a filter like this doesnt exist yet',
  '/yahoo\.com\/ads\/[0-9]{2,5}\/q=\\$param\/$/$domain=~yahoo.com'
]
