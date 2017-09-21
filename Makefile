ITEMS   := rules html data public img js manifest.json

release: npm grunt tosdr moveout

dev: grunt moveout

npm:
	npm install --tldjs-update-rules

grunt:
	grunt build

tosdr:
	grunt execute:tosdr

moveout: $(ITEMS)
	rm -rf release
	mkdir release
	cp -r $(ITEMS) release/
	find ./release -type f -name '*.es6.js' -delete
	rm -rf ./release/js/ui
