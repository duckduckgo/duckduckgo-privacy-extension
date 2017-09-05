(function() {
  QUnit.module('HTTPS')
  
  QUnit.test('test https upgrade rules', function (assert) {

      var done = assert.async()
      bkg.db.ready().then(() => {
          bkg.https.testGetHostRecord(function(e) { 
            assert.ok(e === undefined, 'https.testGetHostRecord() found all records')
          
            const testUrl = 'http://foo.api.roblox.com/sit?stand=false'
            bkg.https.pipeRequestUrl(testUrl, { site: {} } ).then(
                (upgradedUrl) => {
                    assert.ok(upgradedUrl === 'https://foo.api.roblox.com/sit?stand=false', 'https.pipeRequestUrl() upgraded request')
                    done()
                },
                () => assert.ok(0 === 1, 'https.pipeRequestUrl() upgraded request')
            )

          })
      })

  })
})()
