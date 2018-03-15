(function() {
  QUnit.module('Surrogates')

  let afterSurrogatesListLoaded = function(fn) {
      let numTries = 0
      let maxTries = 10
      let checkForList = function() {
          if (bkg.surrogates.hasList()) {
              fn(true)
          } else if (numTries > maxTries) {
              fn(false)
          } else {
              numTries++
              setTimeout(function() { checkForList() }, 50)
          }
      }

      checkForList()
  }

  // http://www.henryalgus.com/reading-binary-files-using-jquery-ajax/
  function getSurrogateJS(uri, fn) {
      var xhr = new XMLHttpRequest()
      xhr.open('GET', uri, true)
      xhr.responseType = 'arraybuffer'

      xhr.onload = function(e) {
          if (this.status == 200) {
              var blob = this.response
              fn(String.fromCharCode.apply(null, new Uint8Array(blob)))
          }
      }

      xhr.send()
  }

  QUnit.test('file is loaded and has rules', function(assert) {
      let done = assert.async()

      afterSurrogatesListLoaded((success) => {
          assert.ok(success, 'surrogate list loaded successfully')
          assert.ok(!!bkg.surrogates.getContentForRule('google-analytics.com/ga.js'), 'should have something for ga.js')
          assert.ok(!!bkg.surrogates.getContentForRule('google-analytics.com/analytics.js'), 'should have something for analytics.js')
          assert.ok(!bkg.surrogates.getContentForRule('duckduckgo.com'), 'should not have duckduckgo.com')

          done()
      })
  })

  QUnit.test('getContentForUrl() works as expected', function(assert) {
      let done = assert.async()

      afterSurrogatesListLoaded((success) => {
          let gaContent = bkg.surrogates.getContentForRule('google-analytics.com/ga.js')
          let parsedUrlMock = {
              domain: 'google-analytics.com'
          }

          assert.ok(bkg.surrogates.getContentForUrl('https://google-analytics.com/ga.js', parsedUrlMock) === gaContent)
          assert.ok(bkg.surrogates.getContentForUrl('https://google-analytics.com/some/other/path/ga.js', parsedUrlMock) === gaContent)
          assert.ok(bkg.surrogates.getContentForUrl('http://www.google-analytics.com/some/other/path/ga.js', parsedUrlMock) === gaContent)

          done()
      })
  })

  QUnit.test('test base64 content can be loaded and be parsed into valid JS', function(assert) {
      let done = assert.async()

      afterSurrogatesListLoaded((success) => {

          getSurrogateJS(bkg.surrogates.getContentForRule('google-analytics.com/ga.js'), function(js) {
              // can't eval the JS because of CSP, best I could come up with for now is
              // just to check that it looks like the valid start of the expected function:
              assert.ok(js.match(/\(function\(\) {/), 'should parse into JS')
              done()
          })
      })
  })

})()
