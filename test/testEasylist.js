const testEasylist = [
  '/banner/*/img^',
  '||ads.example.com^',
  '|http://example.com/|',
  '||ads.somesite.com^$script,image,domain=somesite.com|~foo.somesite.info',
  '!block this, then whitelist',
  '||ad.someothersite.com/notbanner^',
  '@@||ad.someothersite.com/notbanner^',
  '! block this, then whitelist all but script requests',
  '||ads.anothersite.com/notbanner^',
  '@@||ads.anothersite.com/notbanner^$~script'
]
