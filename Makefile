###--- Shared variables ---###
# Browser type (browser, but "chrome-mv3" becomes "chrome").
BROWSER_TYPE = $(browser)
ifeq ('$(browser)','chrome-mv3')
  BROWSER_TYPE = chrome
endif

# Output directory for builds.
BUILD_DIR = build/$(browser)/$(type)
ifeq ($(browser),test)
  BUILD_DIR := build/test
endif

## All source files that potentially need to be bundled or copied.
# TODO: Use automatic dependency generation (e.g. `browserify --list`) for
#       the bundling targets instead?
WATCHED_FILES = $(shell find -L browsers/ shared/ packages/ unit-test/ -type f -not -path "packages/*/node_modules/*" -not -name "*~")
# If the node_modules/@duckduckgo/ directory exists, include those source files
# in the list too.
ifneq ("$(wildcard node_modules/@duckduckgo/)","")
  WATCHED_FILES += $(shell find -L node_modules/@duckduckgo/ -type f -not -path "node_modules/@duckduckgo/*/.git/*" -not -path "node_modules/@duckduckgo/*/node_modules/*" -not -name "*~")
endif


###--- Top level targets ---###
# TODO:
#  - Add default `help` target.
#  - Set browser/type automatically where possible.
#  - Add check that browser+type are set when necessary.

## release: Create a release build for a platform in build/$(browser)/release
## specify browser=(chrome|chrome-mv3|firefox) type=release
release: clean npm copy build

.PHONY: release

## chrome-mv3-beta: Create a beta Chrome MV3 build in build/$(browser)/release
## specify browser=chrome-mv3 type=release
chrome-mv3-beta: release chrome-mv3-beta-zip

.PHONY: chrome-mv3-beta

## beta-firefox: Create a beta Firefox build in build/$(browser)/release
## specify browser=firefox type=release
beta-firefox: release beta-firefox-zip

.PHONY: beta-firefox

## dev: Create a debug build for a platform in build/$(browser)/dev.
##      Pass reloader=0 to disable automatic extension reloading.
## specify browser=(chrome|chrome-mv3|firefox) type=dev [reloader=1]
dev: copy build $(BUILD_DIR)/buildtime.txt

.PHONY: dev

## watch: Create a debug build for a platform in build/$(browser)/dev, and keep
##        it up to date as files are changed.
##        Pass reloader=0 to disable automatic extension reloading.
## specify browser=(chrome|chrome-mv3|firefox) type=dev [reloader=1]
MAKE = make -j4 $(type) browser=$(browser) type=$(type)
watch:
	$(MAKE)
	@echo "\n** Build ready -  Watching for changes **\n"
	while true; do $(MAKE) -q --silent || $(MAKE); sleep 1; done

.PHONY: watch

## unit-test: Run the unit tests.
unit-test: build/test/background.js build/test/ui.js build/test/shared-utils.js
	node_modules/.bin/karma start karma.conf.js

.PHONY: unit-test

## test-int: Run legacy integration tests against the Chrome MV2 extension.
test-int: integration-test/artifacts/attribution.json
	make dev browser=chrome type=dev
	jasmine --config=integration-test/config.json

.PHONY: test-int

## test-int-mv3: Run legacy integration tests against the Chrome MV3 extension.
test-int-mv3: integration-test/artifacts/attribution.json
	make dev browser=chrome-mv3 type=dev
	jasmine --config=integration-test/config-mv3.json

.PHONY: test-int-mv3

## npm: Pull in the external dependencies (npm install).
npm:
	npm ci --ignore-scripts
	npm rebuild puppeteer

.PHONY: npm

## clean: Clear the builds and temporary files.
clean:
	rm -f shared/data/smarter_encryption.txt shared/data/bundled/smarter-encryption-rules.json integration-test/artifacts/attribution.json:
	rm -rf $(BUILD_DIR)

.PHONY: clean


###--- Release packaging ---###
chrome-release-zip:
	rm -f build/chrome/release/chrome-release-*.zip
	cd build/chrome/release/ && zip -rq chrome-release-$(shell date +"%Y%m%d_%H%M%S").zip *

.PHONY: chrome-release-zip

chrome-mv3-release-zip:
	rm -f build/chrome-mv3/release/chrome-mv3-release-*.zip
	cd build/chrome-mv3/release/ && zip -rq chrome-mv3-release-$(shell date +"%Y%m%d_%H%M%S").zip *

.PHONY: chrome-mv3-release-zip

chrome-mv3-beta-zip: prepare-chrome-beta chrome-mv3-release-zip
	

.PHONY: chrome-mv3-beta-zip

prepare-chrome-beta:
	sed 's/__MSG_appName__/DuckDuckGo Privacy Essentials MV3 Beta/' ./browsers/chrome-mv3/manifest.json > build/chrome-mv3/release/manifest.json
	cp -r build/chrome-mv3/release/img/beta/* build/chrome-mv3/release/img/

.PHONY: prepare-chrome-beta

remove-firefox-id:
	sed '/jid1-ZAdIEUB7XOzOJw@jetpack/d' ./browsers/firefox/manifest.json > build/firefox/release/manifest.json

.PHONY: remove-firefox-id

beta-firefox-zip: remove-firefox-id
	cd build/firefox/release/ && web-ext build

.PHONY: beta-firefox-zip


###--- Integration test setup ---###
# Artifacts produced by the integration tests.
setup-artifacts-dir:
	rm -rf integration-test/artifacts
	mkdir -p integration-test/artifacts/screenshots
	mkdir -p integration-test/artifacts/api_schemas

.PHONY: setup-artifacts-dir

# Fetch integration test data.
integration-test/artifacts/attribution.json: node_modules/privacy-test-pages/adClickFlow/shared/testCases.json setup-artifacts-dir
	mkdir -p integration-test/artifacts
	cp $< $@


###--- Mkdir targets ---#
# Note: Intermediate directories can be omitted.
MKDIR_TARGETS = $(BUILD_DIR)/_locales $(BUILD_DIR)/data/bundled $(BUILD_DIR)/html \
                $(BUILD_DIR)/img $(BUILD_DIR)/dashboard $(BUILD_DIR)/web_accessible_resources \
                $(BUILD_DIR)/public/js/content-scripts $(BUILD_DIR)/public/css \
                $(BUILD_DIR)/public/font

$(MKDIR_TARGETS):
	mkdir -p $@


###--- Copy targets ---###
# The empty $(LAST_COPY) file is used to keep track of file copying, since translating the necessary
# copying to proper Makefile targets is problematic.
# See https://www.gnu.org/software/make/manual/html_node/Empty-Targets.html
LAST_COPY = build/.last-copy-$(browser)-$(type)

RSYNC = rsync -ra --exclude="*~"

$(LAST_COPY): $(WATCHED_FILES) | $(MKDIR_TARGETS)
	$(RSYNC) --exclude="smarter_encryption.txt" browsers/$(browser)/* browsers/chrome/_locales shared/data shared/html shared/img $(BUILD_DIR)
	$(RSYNC) node_modules/@duckduckgo/privacy-dashboard/build/app/* $(BUILD_DIR)/dashboard
	$(RSYNC) node_modules/@duckduckgo/autofill/dist/autofill.css $(BUILD_DIR)/public/css/autofill.css
	$(RSYNC) node_modules/@duckduckgo/autofill/dist/autofill-host-styles_$(BROWSER_TYPE).css $(BUILD_DIR)/public/css/autofill-host-styles.css
	$(RSYNC) shared/font $(BUILD_DIR)/public
	$(RSYNC) node_modules/@duckduckgo/autofill/dist/*.js shared/js/content-scripts/content-scope-messaging.js $(BUILD_DIR)/public/js/content-scripts
	$(RSYNC) node_modules/@duckduckgo/tracker-surrogates/surrogates/* $(BUILD_DIR)/web_accessible_resources
	touch $@

copy: $(LAST_COPY)

.PHONY: copy


###--- Build targets ---###
## Figure out the correct Browserify command for bundling.
# TODO: Switch to a better bundler.
# Workaround Browserify not following symlinks in --only.
BROWSERIFY_GLOBAL_TARGETS = ./node_modules/@duckduckgo
BROWSERIFY_GLOBAL_TARGETS += $(shell find node_modules/@duckduckgo/ -maxdepth 1 -type l | xargs -n1 readlink -f)

BROWSERIFY_BIN = node_modules/.bin/browserify
BROWSERIFY = $(BROWSERIFY_BIN) -t babelify -t [ babelify --global  --only [ $(BROWSERIFY_GLOBAL_TARGETS) ] --presets [ @babel/preset-env ] ]
# Ensure sourcemaps are included for the bundles during development.
ifeq ($(type),dev)
  BROWSERIFY += -d
endif

## Extension background/serviceworker script.
BACKGROUND_JS = shared/js/background/background.js
ifeq ($(type), dev)
  # Developer builds include the devbuilds module for debugging.
  BACKGROUND_JS += shared/js/background/devbuild.js
  # Unless reloader=0 is passed, they also contain an auto-reload module.
  ifneq ($(reloader),0)
    BACKGROUND_JS += shared/js/background/devbuild-reloader.js
  endif
endif
$(BUILD_DIR)/public/js/background.js: $(WATCHED_FILES)
	$(BROWSERIFY) $(BACKGROUND_JS) -o $@

## Extension UI/Devtools scripts.
$(BUILD_DIR)/public/js/base.js: $(WATCHED_FILES)
	mkdir -p `dirname $@`
	$(BROWSERIFY) shared/js/ui/base/index.js > $@

$(BUILD_DIR)/public/js/feedback.js: $(WATCHED_FILES)
	$(BROWSERIFY) shared/js/ui/pages/feedback.js > $@

$(BUILD_DIR)/public/js/options.js: $(WATCHED_FILES)
	$(BROWSERIFY) shared/js/ui/pages/options.js > $@

$(BUILD_DIR)/public/js/devtools-panel.js: $(WATCHED_FILES)
	$(BROWSERIFY) shared/js/devtools/panel.js > $@

$(BUILD_DIR)/public/js/list-editor.js: $(WATCHED_FILES)
	$(BROWSERIFY) shared/js/devtools/list-editor.js > $@

$(BUILD_DIR)/public/js/newtab.js: $(WATCHED_FILES)
	$(BROWSERIFY) shared/js/newtab/newtab.js > $@

JS_BUNDLES = background.js base.js feedback.js options.js devtools-panel.js list-editor.js newtab.js

BUILD_TARGETS = $(addprefix $(BUILD_DIR)/public/js/, $(JS_BUNDLES))

## Unit tests scripts.
UNIT_TEST_SRC = unit-test/background/*.js unit-test/background/classes/*.js unit-test/background/events/*.js unit-test/background/storage/*.js unit-test/background/reference-tests/*.js
build/test:
	mkdir -p $@

build/test/background.js: $(TEST_FILES) $(WATCHED_FILES) | build/test
	$(BROWSERIFY) -t brfs -t ./scripts/browserifyFileMapTransform $(UNIT_TEST_SRC) -o $@

build/test/ui.js: $(TEST_FILES) | build/test
	$(BROWSERIFY) shared/js/ui/base/index.js unit-test/ui/**/*.js -o $@

build/test/shared-utils.js: $(TEST_FILES) | build/test
	$(BROWSERIFY) unit-test/shared-utils/*.js -o $@

## Content Scope Scripts
shared/data/bundled/tracker-lookup.json:
	node scripts/bundleTrackers.mjs

CONTENT_SCOPE_SCRIPTS = node_modules/@duckduckgo/content-scope-scripts

# Rebuild content-scope-scripts if it's a local checkout (.git is present), but
# not otherwise. That is important, since content-scope-scripts releases often
# have newer source files than build files.
CONTENT_SCOPE_SCRIPTS_DEPS =
CONTENT_SCOPE_SCRIPTS_LOCALES_DEPS =
ifneq ("$(wildcard $(CONTENT_SCOPE_SCRIPTS)/.git/)","")
  CONTENT_SCOPE_SCRIPTS_DEPS += $(shell find $(CONTENT_SCOPE_SCRIPTS)/src $(CONTENT_SCOPE_SCRIPTS)/inject $(CONTENT_SCOPE_SCRIPTS)/scripts -type f -not -name "*~")
  CONTENT_SCOPE_SCRIPTS_DEPS += $(CONTENT_SCOPE_SCRIPTS)/package.json
  CONTENT_SCOPE_SCRIPTS_DEPS += $(CONTENT_SCOPE_SCRIPTS)/node_modules
  CONTENT_SCOPE_SCRIPTS_DEPS += $(CONTENT_SCOPE_SCRIPTS)/build/locales

  CONTENT_SCOPE_SCRIPTS_LOCALES_DEPS += $(shell find $(CONTENT_SCOPE_SCRIPTS)/src/locales $(CONTENT_SCOPE_SCRIPTS)/scripts)
  CONTENT_SCOPE_SCRIPTS_LOCALES_DEPS += $(CONTENT_SCOPE_SCRIPTS)/package.json
  CONTENT_SCOPE_SCRIPTS_LOCALES_DEPS += $(CONTENT_SCOPE_SCRIPTS)/node_modules
endif

$(CONTENT_SCOPE_SCRIPTS)/node_modules:
	cd $(CONTENT_SCOPE_SCRIPTS); npm install

$(CONTENT_SCOPE_SCRIPTS)/build/locales: $(CONTENT_SCOPE_SCRIPTS_LOCALES_DEPS)
	cd $(CONTENT_SCOPE_SCRIPTS); npm run build-locales
	touch $(CONTENT_SCOPE_SCRIPTS)/build/locales

$(CONTENT_SCOPE_SCRIPTS)/build/$(browser)/inject.js: $(CONTENT_SCOPE_SCRIPTS_DEPS)
	cd $(CONTENT_SCOPE_SCRIPTS); npm run build-$(browser)

$(BUILD_DIR)/public/js/inject.js: $(CONTENT_SCOPE_SCRIPTS)/build/$(browser)/inject.js shared/data/bundled/tracker-lookup.json shared/data/bundled/extension-config.json
	node scripts/bundleContentScopeScripts.mjs $@ $^

BUILD_TARGETS += $(BUILD_DIR)/public/js/inject.js

## SASS
SASS = node_modules/.bin/sass
SCSS_SOURCE = $(shell find shared/scss/ -type f)
OUTPUT_CSS_FILES = $(BUILD_DIR)/public/css/noatb.css $(BUILD_DIR)/public/css/options.css $(BUILD_DIR)/public/css/feedback.css
$(BUILD_DIR)/public/css/base.css: shared/scss/base/base.scss $(SCSS_SOURCE)
	$(SASS) $< $@
$(BUILD_DIR)/public/css/%.css: shared/scss/%.scss $(SCSS_SOURCE)
	$(SASS) $< $@

BUILD_TARGETS += $(BUILD_DIR)/public/css/base.css $(OUTPUT_CSS_FILES)

## Other

# Fetch Smarter Encryption data for bundled Smarter Encryption
# declarativeNetRequest rules.
shared/data/smarter_encryption.txt:
	curl https://staticcdn.duckduckgo.com/https/smarter_encryption.txt.gz | gunzip -c > shared/data/smarter_encryption.txt

# Generate Smarter Encryption declarativeNetRequest rules for MV3 builds.
$(BUILD_DIR)/data/bundled/smarter-encryption-rules.json: shared/data/smarter_encryption.txt
	npx ddg2dnr smarter-encryption $< $@

ifeq ('$(browser)','chrome-mv3')
  BUILD_TARGETS += $(BUILD_DIR)/data/bundled/smarter-encryption-rules.json
endif

$(BUILD_DIR)/data/surrogates.txt: $(BUILD_DIR)/web_accessible_resources $(wildcard node_modules/@duckduckgo/tracker-surrogates/surrogates/*.js)
	node scripts/generateListOfSurrogates.js -i $</ > $@

BUILD_TARGETS += $(BUILD_DIR)/data/surrogates.txt

# Update buildtime.txt for development builds, for auto-reloading.
# Note: Keep this below the other build targets, since it depends on the
#       $(BUILD_TARGETS) variable.
$(BUILD_DIR)/buildtime.txt: $(BUILD_TARGETS) $(LAST_COPY)
	echo $(shell date +"%Y%m%d_%H%M%S") > $(BUILD_DIR)/buildtime.txt

# Ensure directories exist before build targets are created.
$(BUILD_TARGETS): | $(MKDIR_TARGETS)

build: $(BUILD_TARGETS)

.PHONY: build
