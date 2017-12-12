ITEMS   := shared/font shared/html shared/data shared/img shared/js

release: npm setup-build-dir grunt tosdr make-build

dev: grunt-dev make-build

npm:
	npm install --tldjs-update-rules

grunt:
	grunt build --browser=$(browser) --type=$(type)

grunt-dev:
	grunt dev --browser=$(browser) --type=$(type)

tosdr:
	grunt execute:tosdr --browser=$(browser) --type=$(type)

make-build: moveout
	rm -rf build/$(browser)/release/test/

setup-build-dir:
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
	cp browsers/$(browser)/manifest.json build/$(browser)/$(type)/
