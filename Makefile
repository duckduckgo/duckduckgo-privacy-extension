ITEMS   := shared/html shared/data shared/img

###--- Binaries ---###
SASS = node_modules/.bin/sass
BROWSERIFY_BIN = node_modules/.bin/browserify
BROWSERIFY = $(BROWSERIFY_BIN) -t babelify
KARMA = node_modules/.bin/karma

###--- Variables ---###
BUILD_DIR = build/$(browser)/$(type)
ifeq ($(browser),test)
	BUILD_DIR := build/test
endif

###--- Top level targets ---###
## release: create a release build for a platform in build/$BROWSER/release
## specify browser=(chrome|chrome-mv3|firefox)
release: clean npm $(BUILD_DIR)/public/js copy sass js

## dev: create a debug build for a platform in build/$BROWSER/dev
## specify browser=(chrome|chrome-mv3|firefox) type=dev
dev: $(BUILD_DIR)/public/js copy sass js

## watch: rebuild when changes are made
MAKE = make $(type) browser=$(browser) type=$(type)
watch:
	while true; do $(MAKE) -q || $(MAKE); sleep 1; done

.PHONY: release dev

###--- Unit tests ---###
unit-test: build/test/background.js build/test/ui.js build/test/shared-utils.js
	$(KARMA) start karma.conf.js

unit-test/data/reference-tests: node_modules/@duckduckgo/privacy-reference-tests/
	mkdir -p $@
	rsync -av --exclude='.git/' $< $@/

shared/content-scope-scripts: node_modules/@duckduckgo/content-scope-scripts
	cp -r node_modules/@duckduckgo/content-scope-scripts shared/

.PHONY: unit-test

## Build unit-tests with browserify
UNIT_TEST_SRC = unit-test/background/*.js unit-test/background/classes/*.js unit-test/background/events/*.js unit-test/background/storage/*.js unit-test/background/reference-tests/*.js
build/test/background.js: $(UNIT_TEST_SRC) unit-test/data/reference-tests shared/content-scope-scripts
	$(BROWSERIFY_BIN) -t ./scripts/browserifyFileMapTransform.js -t babelify -d $(UNIT_TEST_SRC) -o $@

build/test/ui.js: unit-test/ui/**/*.js
	$(BROWSERIFY) shared/js/ui/base/index.js unit-test/ui/**/*.js -o $@

build/test/shared-utils.js: unit-test/shared-utils/*.js
	$(BROWSERIFY) unit-test/shared-utils/*.js -o $@

###--- Legacy Integration tests ---###
## test-int: Run integration tests for the chrome MV2 extension
test-int: integration-test/artifacts/attribution.json
	make dev browser=chrome type=dev
	jasmine --config=integration-test/config.json

## test-int-mv3: Run integration tests for the chrome MV3 extension
test-int-mv3: integration-test/artifacts/attribution.json
	make dev browser=chrome-mv3 type=dev
	jasmine --config=integration-test/config-mv3.json

.PHONY: test-int test-int-mv3

###--- External dependencies ---###
npm:
	npm ci --ignore-scripts
	npm rebuild puppeteer

###--- Packaging ---###
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

beta-firefox: release beta-firefox-zip

remove-firefox-id:
	sed '/jid1-ZAdIEUB7XOzOJw@jetpack/d' ./browsers/firefox/manifest.json > build/firefox/release/manifest.json

beta-firefox-zip: remove-firefox-id
	cd build/firefox/release/ && web-ext build

###--- Build dir preparation ---###
## artifacts for integration-tests
setup-artifacts-dir:
	rm -rf integration-test/artifacts
	mkdir -p integration-test/artifacts/screenshots
	mkdir -p integration-test/artifacts/api_schemas

# create build dir ready for source
ifeq ('$(browser)','chrome-mv3')
$(BUILD_DIR)/public/js: shared/data/bundled/smarter-encryption-rules.json
else
$(BUILD_DIR)/public/js:
endif
	mkdir -p $(BUILD_DIR)/public/js/
	mkdir -p $(BUILD_FOLDERS)

# fetch SE data for bundled SE rules
shared/data/smarter_encryption.txt:
	curl https://staticcdn.duckduckgo.com/https/smarter_encryption.txt.gz | gunzip -c > shared/data/smarter_encryption.txt

# build SE rules for MV3
shared/data/bundled/smarter-encryption-rules.json: shared/data/smarter_encryption.txt
	npm run bundle-se

# fetch integration test data
integration-test/artifacts/attribution.json: setup-artifacts-dir
	mkdir -p integration-test/artifacts
	node scripts/attributionTestCases.mjs

clean:
	rm -f shared/data/smarter_encryption.txt shared/data/bundled/smarter-encryption-rules.json integration-test/artifacts/attribution.json:
	rm -rf $(BUILD_DIR)
	rm -rf unit-test/data/reference-tests shared/content-scope-scripts


###--- Copy targets ---###
## Targets to copy artifacts to the extension build dir
AUTOFILL_DIR = node_modules/@duckduckgo/autofill/dist
DASHBOARD_DIR = node_modules/@duckduckgo/privacy-dashboard/build/app
SURROGATES_DIR = node_modules/@duckduckgo/tracker-surrogates/surrogates
BUILD_FOLDERS = $(BUILD_DIR)/public/js/content-scripts $(BUILD_DIR)/public/css
BROWSER_TYPE = $(browser)
COPY_DIRS = $(BUILD_DIR)/manifest.json
ifeq ($(browser),chrome-mv3)
	BROWSER_TYPE := chrome
	COPY_DIRS += $(BUILD_DIR)/managed-schema.json
endif

## Copy tasks: Copying resources that don't need and compiling
$(BUILD_DIR)/manifest.json: browsers/$(browser)/*
	cp -r browsers/$(browser)/* $(BUILD_DIR)

build/chrome-mv3/$(type)/managed-schema.json: browsers/chrome/managed-schema.json
	cp $< $@

$(BUILD_DIR)/_locales: browsers/chrome/_locales
	cp -r $< $@

$(BUILD_DIR)/data: $(ITEMS)
	cp -r $(ITEMS) $(BUILD_DIR)

$(BUILD_DIR)/dashboard: $(DASHBOARD_DIR)/
	cp -r $< $@

$(BUILD_DIR)/web_accessible_resources: $(SURROGATES_DIR)/
	cp -r $< $@

$(BUILD_DIR)/data/surrogates.txt: $(BUILD_DIR)/web_accessible_resources
	node scripts/generateListOfSurrogates.js -i $</ > $@

$(BUILD_DIR)/public/font: shared/font
	cp -r $< $@

# Copy autofill scripts and assets
$(BUILD_DIR)/public/js/content-scripts/autofill.js: $(AUTOFILL_DIR)/autofill.js
	cp $(AUTOFILL_DIR)/*.js `dirname $@`

$(BUILD_DIR)/public/css/autofill.css: $(AUTOFILL_DIR)/autofill.css
	cp $< $@

$(BUILD_DIR)/public/css/autofill-host-styles.css: $(AUTOFILL_DIR)/autofill-host-styles_$(BROWSER_TYPE).css
	cp $< $@
.PHONY: copy-autofill
copy-autofill: $(BUILD_DIR)/public/js/content-scripts/autofill.js $(BUILD_DIR)/public/css/autofill.css $(BUILD_DIR)/public/css/autofill-host-styles.css

copy: $(COPY_DIRS) $(BUILD_DIR)/_locales $(BUILD_DIR)/data $(BUILD_DIR)/dashboard $(BUILD_DIR)/web_accessible_resources $(BUILD_DIR)/data/surrogates.txt $(BUILD_DIR)/public/font copy-autofill

##--- Build targets ---#
# Specify the set of scripts for the extension background
BACKGROUND_JS = shared/js/background/background.js
ifeq ($(type), dev)
	BACKGROUND_JS := shared/js/background/debug.js $(BACKGROUND_JS)
endif

JS_BUNDLES = background.js base.js inject.js content-scripts/content-scope-messaging.js feedback.js options.js devtools-panel.js list-editor.js newtab.js
js: $(addprefix $(BUILD_DIR)/public/js/, $(JS_BUNDLES))

## Extension background/serviceworker script
$(BUILD_DIR)/public/js/background.js: shared/js/**/*.js
	$(BROWSERIFY) $(BACKGROUND_JS) -o $@

$(BUILD_DIR)/public/js/content-scripts/content-scope-messaging.js: shared/js/content-scripts/content-scope-messaging.js
	cp $< $@

## Extension UI/Devtools scripts
$(BUILD_DIR)/public/js/base.js: shared/js/**/*.js
	mkdir -p `dirname $@`
	$(BROWSERIFY) shared/js/ui/base/index.js > $@

$(BUILD_DIR)/public/js/feedback.js: shared/js/**/*.js
	$(BROWSERIFY) shared/js/ui/pages/feedback.js > $@

$(BUILD_DIR)/public/js/options.js: shared/js/**/*.js
	$(BROWSERIFY) shared/js/ui/pages/options.js > $@

$(BUILD_DIR)/public/js/devtools-panel.js: shared/js/**/*.js
	$(BROWSERIFY) shared/js/devtools/panel.js > $@

$(BUILD_DIR)/public/js/list-editor.js: shared/js/**/*.js
	$(BROWSERIFY) shared/js/devtools/list-editor.js > $@

$(BUILD_DIR)/public/js/newtab.js: shared/js/**/*.js
	$(BROWSERIFY) shared/js/newtab/newtab.js > $@

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
