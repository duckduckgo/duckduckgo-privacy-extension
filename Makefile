ITEMS   := shared/html shared/data shared/img shared/js

release: npm setup-build-dir grunt tosdr moveout fonts

dev: setup-build-dir grunt-process-lists moveout fonts grunt-dev

npm:
	npm install --tldjs-update-rules

grunt:
	grunt build --browser=$(browser) --type=$(type)

grunt-process-lists:
	grunt execute:preProcessLists --browser=$(browser) --type=$(type)

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
	cd build/chrome/release/ && zip -rq chrome-release-$(shell date +"%Y%m%d_%H%M%S").zip *

fonts:
	mkdir -p build/$(browser)/$(type)/public
	cp -r shared/font build/$(browser)/$(type)/public/

moveout: $(ITEMS)
	@echo '** Making build directory: $(type) **'
	cp -r $(ITEMS) build/$(browser)/$(type)
	find ./build/$(browser)/$(type)/js -type f -name '*.es6.js' -delete
	rm -rf build/$(browser)/$(type)/js/ui
	cp -r browsers/$(browser)/* build/$(browser)/$(type)/

beta-firefox: release beta-firefox-zip

remove-firefox-id:
	sed '/jid1-ZAdIEUB7XOzOJw@jetpack/d' ./browsers/firefox/manifest.json > build/firefox/release/manifest.json

beta-firefox-zip: remove-firefox-id
	cd build/firefox/release/ && web-ext build
