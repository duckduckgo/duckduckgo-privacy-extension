(function() {
  QUnit.module('Surrogates')

  let afterSurrogatesListLoaded = function(fn) {
      let numTries = 0
      let maxTries = 10
      let checkForList = function() {
          if (Object.keys(surrogates.surrogateList.parsed).length) {
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

  QUnit.test('test parsing test file of rules', function(assert) {
      let done = assert.async()

      afterSurrogatesListLoaded((success) => {
          assert.ok(success, 'surrogate list loaded successfully')

          assert.ok(!!surrogates.getContentForRule('google-analytics.com/ga.js'), 'should have something for ga.js')
          assert.ok(!!surrogates.getContentForRule('google-analytics.com/analytics.js'), 'should have something for analytics.js')
          assert.ok(!surrogates.getContentForRule('duckduckgo.com'), 'should not have duckduckgo.com')

          done()
      })
  })

  QUnit.test('test injecting the GA base64 encoded rules into the DOM and making sure it works', function(assert) {
      let done = assert.async()

      afterSurrogatesListLoaded((success) => {

          getSurrogateJS(surrogates.getContentForRule('google-analytics.com/ga.js'), function(js) {
              // can't eval the JS because of CSP, best I could come up with for now is
              // just to check that it looks like the valid start of the expected function:
              assert.ok(js.match(/\(function\(\) {/), 'should parse into JS')
              done()
          })
      })
  })

})()
