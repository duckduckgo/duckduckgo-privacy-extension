(function() {
  QUnit.module('HTTPS')

  var afterHttpsListLoaded = function(fn) {
      var numTries = 0
      var maxTries = 10
      var checkForList = function() {
          if (bkg.https.getUpgradeList().length) {
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

  QUnit.test('test https upgrade rules installed to indexed db', function (assert) {
      var done = assert.async()

      afterHttpsListLoaded((success) => {
          assert.ok(success, 'https list loaded successfully')
          assert.ok(bkg.https.testCanUpgradeHost(), 'https.testGetHostRecord() found all records')
          done()
      })
  })

  QUnit.test('test https.getUpgradedUrl()', function (assert) {
      var done = assert.async()

      afterHttpsListLoaded((success) => {
          assert.ok(success, 'https list loaded successfully')
          assert.ok(bkg.https.testGetUpgradedUrl(), 'https.testGetUpgradeUrl() upgraded all urls correctly')
          done()
      })
  })

})()
