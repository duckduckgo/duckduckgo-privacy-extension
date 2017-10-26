(function() {
  QUnit.module("settings");
  
  var testSetting = {name: 'testSetting', value: 'testSettingValue'};
  
  bkg.settings.ready().then(() => {
      QUnit.test("update and get settings by interface", function (assert) {

          bkg.settings.updateSetting(testSetting.name, testSetting.value);
          var updatedSetting = bkg.settings.getSetting(testSetting.name);
          assert.ok(updatedSetting !== null, 'test setting was added');
          assert.ok(updatedSetting === testSetting.value, 'test setting has correct value');
      })
      
      QUnit.test("store and get an object through interface", function (assert) {
          var obj = {'key': true};
          bkg.settings.updateSetting(testSetting.name, obj);
          var updatedSetting = bkg.settings.getSetting(testSetting.name);
          assert.ok(updatedSetting !== null, 'test setting was added');
          assert.ok(updatedSetting === obj, 'test setting has correct value');
      })
  })
})();
