ITEMS   := shared/html shared/data shared/img shared/js

release: npm setup-build-dir grunt tosdr moveout fonts

dev: setup-build-dir grunt-process-lists moveout fonts grunt-dev

safari: setup-build-dir grunt-process-lists moveout fonts grunt-dev

rm-safari:
	rm -rf build/duckduckgo.safariextension/*

mv-safari:
	mv build/duckduckgo.safariextension/dev/* build/duckduckgo.safariextension/
	cp browsers/duckduckgo.safariextension/Icon.png build/duckduckgo.safariextension/Icon.png

npm:
	npm install --tldjs-update-rules

grunt:
	grunt build --browser=$(browser) --type=$(type)

grunt-process-lists:
	grunt execute:preProcessLists --browser=$(browser) --type=$(type)

grunt-dev:
	cp -r test build/$(browser)/dev/
	grunt dev --browser=$(browser) --type=$(type) --verbose

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
	# try to copy manifest (ff, chrome) or plist (safari) files, don't throw errors
	cp browsers/$(browser)/manifest.json build/$(browser)/$(type)/ 2>/dev/null || :
	cp browsers/$(browser)/*.plist build/$(browser)/$(type)/ 2>/dev/null || :
