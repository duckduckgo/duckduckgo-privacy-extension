ITEMS   := shared/html shared/data shared/img

release: npm setup-build-dir grunt moveout fonts web-resources

dev: setup-build-dir moveout fonts web-resources grunt-dev

npm:
	npm install-ci

grunt:
	grunt build --browser=$(browser) --type=$(type)

grunt-dev:
	mkdir -p build/$(browser)/dev/test/html
	cp -r shared/img build/$(browser)/dev/test/html
	cp -r shared/data build/$(browser)/dev/test/html
	grunt dev --browser=$(browser) --type=$(type) --monitor=$(watch)

setup-artifacts-dir:
	rm -rf integration-test/artifacts
	mkdir -p integration-test/artifacts/screenshots
	mkdir -p integration-test/artifacts/api_schemas

ifeq ('$(browser)','chrome-mv3')
setup-build-dir: shared/data/bundled/smarter-encryption-rules.json
else
setup-build-dir:
endif
	mkdir -p build/$(browser)
	rm -rf build/$(browser)/$(type)
	mkdir build/$(browser)/$(type)
	mkdir -p build/$(browser)/$(type)/public/js/

chrome-release-zip:
	rm -f build/chrome/release/chrome-release-*.zip
	cd build/chrome/release/ && zip -rq chrome-release-$(shell date +"%Y%m%d_%H%M%S").zip *

chrome-mv3-release-zip:
	rm -f build/chrome-mv3/release/chrome-mv3-release-*.zip
	cd build/chrome-mv3/release/ && zip -rq chrome-mv3-release-$(shell date +"%Y%m%d_%H%M%S").zip *

chrome-mv3-beta-zip: prepare-chrome-beta chrome-mv3-release-zip
	
prepare-chrome-beta:
	sed 's/__MSG_appName__/DuckDuckGo Privacy Essentials MV3 Beta/' ./browsers/chrome-mv3/manifest.json > build/chrome-mv3/release/manifest.json
	cp -r build/chrome-mv3/release/img/beta/* build/chrome-mv3/release/img/

chrome-mv3-beta: release chrome-mv3-beta-zip

fonts:
	mkdir -p build/$(browser)/$(type)/public
	cp -r shared/font build/$(browser)/$(type)/public/

web-resources:
	mkdir -p build/$(browser)/$(type)/web_accessible_resources
	cp shared/tracker-surrogates/surrogates/*.js build/$(browser)/$(type)/web_accessible_resources/
	mkdir -p build/$(browser)/$(type)/data
	node scripts/generateListOfSurrogates.js -i build/$(browser)/$(type)/web_accessible_resources/ >> build/$(browser)/$(type)/data/surrogates.txt

moveout: $(ITEMS)
	@echo '** Making build directory: $(type) **'
	cp -r $(ITEMS) build/$(browser)/$(type)
	cp -r shared/js/content-scripts build/$(browser)/$(type)/public/js/
# While transitioning from Chrome MV2 to Chrome MV3, copy the Chrome MV2
# files first. That way they don't have to be duplicated in the
# repository. Once the transition is complete, this clause should be
# removed.
ifeq ('$(browser)','chrome-mv3')
	cp -r browsers/chrome/* build/$(browser)/$(type)/
endif
	cp -r browsers/$(browser)/* build/$(browser)/$(type)/

beta-firefox: release beta-firefox-zip

remove-firefox-id:
	sed '/jid1-ZAdIEUB7XOzOJw@jetpack/d' ./browsers/firefox/manifest.json > build/firefox/release/manifest.json

beta-firefox-zip: remove-firefox-id
	cd build/firefox/release/ && web-ext build

shared/data/smarter_encryption.txt:
	curl https://staticcdn.duckduckgo.com/https/smarter_encryption.txt.gz | gunzip -c > shared/data/smarter_encryption.txt

shared/data/bundled/smarter-encryption-rules.json: shared/data/smarter_encryption.txt
	npm run bundle-se

clean:
	rm -f shared/data/smarter_encryption.txt shared/data/bundled/smarter-encryption-rules.json

AUTOFILL_DIR = node_modules/@duckduckgo/autofill/dist
BUILD_DIR = build/$(browser)/wip
ESBUILD = node_modules/.bin/esbuild
SASS = node_modules/.bin/sass
BUILD_FOLDERS = $(BUILD_DIR)/public/js/content-scripts $(BUILD_DIR)/public/css $(BUILD_DIR)/public/font

# create build dir
prepare-build-dir:
	mkdir -p $(BUILD_FOLDERS)

$(BUILD_DIR)/public/js/background.js: shared/js/**/*.js
	mkdir -p `dirname $@`
	$(ESBUILD) shared/js/bundles/*.js \
		shared/js/content-scripts/*.js \
	--bundle --outdir=`dirname $@` --target=esnext

$(BUILD_DIR)/public/js/content-scripts/autofill.js: $(AUTOFILL_DIR)/*.js
	cp $< `dirname $@`

# SASS
CSS_FILES = $(BUILD_DIR)/public/css/noatb.css $(BUILD_DIR)/public/css/options.css $(BUILD_DIR)/public/css/feedback.css
$(BUILD_DIR)/public/css/base.css: shared/scss/base/base.scss shared/scss/* shared/scss/**/*
	$(SASS) $< $@
$(BUILD_DIR)/public/css/%.css: shared/scss/%.scss shared/scss/* shared/scss/**/*
	$(SASS) $< $@

.PHONY: sass
sass: $(BUILD_DIR)/public/css/base.css $(CSS_FILES)

.PHONY: esbuild
esbuild: prepare-build-dir sass $(BUILD_DIR)/public/js/background.js
	cp build/chrome/wip/public/js/*.js build/chrome/dev/public/js/
