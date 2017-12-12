ITEMS   := public shared/html shared/data shared/img shared/js

release: npm grunt tosdr make-build

dev: grunt make-build

npm:
	npm install --tldjs-update-rules

grunt:
	grunt build --browser=$(browser)

tosdr:
	grunt execute:tosdr --browser=$(browser)

make-build: moveout
	rm -rf build/$(browser)/release/test/

moveout: $(ITEMS)
	@echo '** Making build directory: $(type) **'
	rm -rf build/$(browser)/$(type)
	mkdir build/$(browser)/$(type)
	cp -r $(ITEMS) build/$(browser)/$(type)
	find ./build/$(browser)/$(type)/js -type f -name '*.es6.js' -delete
	rm -rf build/$(browser)/$(type)/js/ui
	cp browsers/$(browser)/manifest.json build/$(browser)/$(type)/
