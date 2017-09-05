(function() {
  QUnit.module('HTTPS')
  
  QUnit.test('test https upgrade rules', function (assert) {

      var done = assert.async()
      bkg.db.ready().then(() => {
          bkg.https.testGetHostRecord(function(e) { 
            assert.ok(e === undefined, 'https.testGetHostRecord() works')
          })
      })

  })
})()
