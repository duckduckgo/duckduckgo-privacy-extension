(function() {
  QUnit.module('HTTPS')

  QUnit.test('test https upgrade rules installed to indexed db', function (assert) {
      var done = assert.async()
      bkg.db.ready().then(() => {
          bkg.https.testGetHostRecord(function(e) {
            assert.ok(e === undefined, 'https.testGetHostRecord() found all records')
            done()
          })
      },
      () => {
        assert.ok(0 === 1, 'db encountered an error during init')
        done()
      })
  })

  QUnit.test('test https.pipeRequestUrl()', function (assert) {
      var done = assert.async()
      bkg.https.ready().then(() => {
          const isSync = bkg.utils.isChromeBrowser()
          const testUrl = 'http://foo.api.roblox.com/sit?bar=false'
          if (isSync) {
              const upgradedUrl = bkg.https.pipeRequestUrl(testUrl, { site: {}})
              assert.ok(upgradedUrl === 'https://foo.api.roblox.com/sit?bar=false', 'synchronous https.pipeRequestUrl() upgraded wildcarded subdomain request')
              done()
          } else {
              bkg.https.pipeRequestUrl(testUrl, { site: {}}).then(
                  (upgradedUrl) => {
                      assert.ok(upgradedUrl === 'https://foo.api.roblox.com/sit?bar=false', 'asynchronous https.pipeRequestUrl() upgraded wildcarded subdomain request')
                      done()
                  }
              )
          }
      })
  })

})()
