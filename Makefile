ITEMS   := shared/html shared/data shared/img

release: npm setup-build-dir grunt tosdr moveout fonts

dev: setup-build-dir grunt-process-lists moveout fonts grunt-dev

npm:
	npm install

grunt:
	grunt build --browser=$(browser) --type=$(type)

grunt-process-lists:
	grunt execute:preProcessLists --browser=$(browser) --type=$(type)

grunt-dev:
	cp -r test build/$(browser)/dev/
	cp -r shared/img build/$(browser)/dev/test/html
	cp -r shared/data build/$(browser)/dev/test/html
	grunt dev --browser=$(browser) --type=$(type) --watch=$(watch)

tosdr:
	grunt execute:tosdr --browser=$(browser) --type=$(type)

setup-build-dir:
	mkdir -p build/$(browser)
	rm -rf build/$(browser)/$(type)
	mkdir build/$(browser)/$(type)
	mkdir -p build/$(browser)/$(type)/public/js/

chrome-release-zip:
	rm -f build/chrome/release/chrome-release-*.zip
	cd build/chrome/release/ && zip -rq chrome-release-$(shell date +"%Y%m%d_%H%M%S").zip *

fonts:
	mkdir -p build/$(browser)/$(type)/public
	cp -r shared/font build/$(browser)/$(type)/public/

moveout: $(ITEMS)
	@echo '** Making build directory: $(type) **'
	cp -r $(ITEMS) build/$(browser)/$(type)
	cp -r $(ITEMS) build/$(browser)/$(type)
	cp -r shared/js/content-scripts build/$(browser)/$(type)/public/js/
	cp -r browsers/$(browser)/* build/$(browser)/$(type)/

beta-firefox: release beta-firefox-zip

remove-firefox-id:
	sed '/jid1-ZAdIEUB7XOzOJw@jetpack/d' ./browsers/firefox/manifest.json > build/firefox/release/manifest.json

beta-firefox-zip: remove-firefox-id
	cd build/firefox/release/ && web-ext build
