ITEMS   := shared/font shared/html shared/data shared/img shared/js

release: npm setup-build-dir grunt tosdr moveout

dev: setup-build-dir moveout grunt-dev

npm:
	npm install --tldjs-update-rules

grunt:
	grunt build --browser=$(browser) --type=$(type)

grunt-dev:
	cp -r test build/$(browser)/dev/
	grunt dev --browser=$(browser) --type=$(type)

tosdr:
	grunt execute:tosdr --browser=$(browser) --type=$(type)

setup-build-dir:
	mkdir -p build/$(browser)
	rm -rf build/$(browser)/$(type)
	mkdir build/$(browser)/$(type)

chrome-release-zip:
	rm -f build/chrome/release/chrome-release-*.zip
	zip -r build/chrome/release/chrome-release-$(shell date +"%Y%m%d_%H%M%S").zip build/chrome/release

moveout: $(ITEMS)
	@echo '** Making build directory: $(type) **'
	cp -r $(ITEMS) build/$(browser)/$(type)
	find ./build/$(browser)/$(type)/js -type f -name '*.es6.js' -delete
	rm -rf build/$(browser)/$(type)/js/ui
	mv build/$(browser)/$(type)/font build/$(browser)/$(type)/public
	# try to copy manifest (ff, chrome) or plist (safari) files, don't throw errors
	cp browsers/$(browser)/manifest.json build/$(browser)/$(type)/ 2>/dev/null || :
	cp browsers/$(browser)/*.plist build/$(browser)/$(type)/ 2>/dev/null || :
