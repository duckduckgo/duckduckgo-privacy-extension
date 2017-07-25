ITEMS   := rules html data public img js manifest.json

release: grunt moveout

grunt:
	grunt build

moveout: $(ITEMS)
	rm -rf release
	mkdir release
	cp -r $(ITEMS) release/
	find ./release -type f -name '*.es6.js' -delete
	rm -rf ./release/js/ui
