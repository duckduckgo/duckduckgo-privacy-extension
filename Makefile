ITEMS   := shared/html shared/data shared/img

release: npm prepare-build-dir copy sass js

dev: prepare-build-dir copy sass js

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
	rm -r $(BUILD_DIR)

AUTOFILL_DIR = node_modules/@duckduckgo/autofill/dist
BUILD_DIR = build/$(browser)/$(type)
ESBUILD = node_modules/.bin/esbuild
SASS = node_modules/.bin/sass
BUILD_FOLDERS = $(BUILD_DIR)/public/js/content-scripts $(BUILD_DIR)/public/css
BROWSERIFY = node_modules/.bin/browserify
DASHBOARD_DIR = node_modules/@duckduckgo/privacy-dashboard/build/app/
SURROGATES_DIR = node_modules/@duckduckgo/tracker-surrogates/surrogates
BROWSER_TYPE = $(browser)
ifeq ($(browser),chrome-mv3)
	BROWSER_TYPE := chrome
endif

# create build dir
prepare-build-dir:
	mkdir -p $(BUILD_FOLDERS)

# Copy tasks
$(BUILD_DIR)/manifest.json: browsers/$(browser)/*
	cp -r browsers/$(browser)/* $(BUILD_DIR)

$(BUILD_DIR)/_locales: browsers/$(BROWSER_TYPE)/_locales
	cp -r $< $@

$(BUILD_DIR)/data: $(ITEMS)
	cp -r $(ITEMS) $(BUILD_DIR)

$(BUILD_DIR)/dashboard: $(DASHBOARD_DIR) $(DASHBOARD_DIR)/**/*
	cp -r $< $@

$(BUILD_DIR)/web_accessible_resources: $(SURROGATES_DIR)/
	cp -r $< $@

$(BUILD_DIR)/public/font: shared/font
	cp -r $< $@

# Copy autofill scripts and assets
$(BUILD_DIR)/public/js/content-scripts/autofill.js: $(AUTOFILL_DIR)/*.js
	cp $(AUTOFILL_DIR)/*.js `dirname $@`

$(BUILD_DIR)/public/css/autofill.css: $(AUTOFILL_DIR)/autofill.css
	cp $< $@

$(BUILD_DIR)/public/css/autofill-host-styles.css: $(AUTOFILL_DIR)/autofill-host-styles_$(BROWSER_TYPE).css
	cp $< $@
.PHONY: copy-autofill
copy-autofill: $(BUILD_DIR)/public/js/content-scripts/autofill.js $(BUILD_DIR)/public/css/autofill.css $(BUILD_DIR)/public/css/autofill-host-styles.css

copy: $(BUILD_DIR)/manifest.json $(BUILD_DIR)/_locales $(BUILD_DIR)/data $(BUILD_DIR)/dashboard $(BUILD_DIR)/web_accessible_resources $(BUILD_DIR)/public/font copy-autofill

# JS Build steps
BACKGROUND_JS = shared/js/background/background.js
ifeq ($(type), dev)
	BACKGROUND_JS := shared/js/background/debug.js $(BACKGROUND_JS)
endif

js: $(BUILD_DIR)/public/js/background.js $(BUILD_DIR)/public/js/base.js $(BUILD_DIR)/public/js/inject.js

$(BUILD_DIR)/public/js/background.js: shared/js/**/*.js
	$(BROWSERIFY) -t babelify $(BACKGROUND_JS) -o $@

$(BUILD_DIR)/public/js/base.js: shared/js/**/*.js
	mkdir -p `dirname $@`
	$(ESBUILD) shared/js/bundles/*.js \
	--bundle --outdir=`dirname $@` --target=esnext

# Content Scope Scripts
shared/data/bundled/tracker-lookup.json:
	node scripts/bundleTrackers.mjs

$(BUILD_DIR)/public/js/inject.js: node_modules/@duckduckgo/content-scope-scripts/build/$(browser)/inject.js shared/data/bundled/tracker-lookup.json shared/data/bundled/extension-config.json
	node scripts/bundleContentScopeScripts.mjs $@ $^

# SASS
CSS_FILES = $(BUILD_DIR)/public/css/noatb.css $(BUILD_DIR)/public/css/options.css $(BUILD_DIR)/public/css/feedback.css
$(BUILD_DIR)/public/css/base.css: shared/scss/base/base.scss shared/scss/* shared/scss/**/*
	$(SASS) $< $@
$(BUILD_DIR)/public/css/%.css: shared/scss/%.scss shared/scss/* shared/scss/**/*
	$(SASS) $< $@

.PHONY: sass
sass: $(BUILD_DIR)/public/css/base.css $(CSS_FILES)

.PHONY: esbuild
esbuild: prepare-build-dir copy sass js
