(function() {
  QUnit.module("settings");

  var settings = require('settings');
  
  var testSetting = {name: 'testSetting', value: 'testSettingValue'};
  
  QUnit.test("update and get settings by interface", function (assert) {
      settings.updateSetting(testSetting.name, testSetting.value);

      var updatedSetting = settings.getSetting(testSetting.name);
      assert.ok(updatedSetting !== null, 'test setting was added');
      assert.ok(updatedSetting === testSetting.value, 'test setting has correct value');
  });
  
  QUnit.test("get setting by messaging", function (assert) {
      assert.expect(1);
      var done = assert.async();

      chrome.runtime.sendMessage(chrome.runtime.id, {'getSetting': {'name': testSetting.name}}, function(result) {
          assert.ok(result === testSetting.value, 'get setting by message has correct value');
          done();
      });

  });
})();
