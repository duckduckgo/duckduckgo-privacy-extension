EXTNAME := chrome-zeroclick
KEYFILE := $(EXTNAME).pem
SHELL   := /usr/bin/env bash
CHROME  := chromium-browser -n --args
CWD     := $(shell pwd)
TMPDIR  := $(shell mktemp -d)
VERSION := $(shell python2 -c "import json,sys;print json.loads(sys.stdin.read()).get('version','')" < manifest.json)
ITEMS   := rules html https data public img js manifest.json
SKIP	:= pages,models,templates,views,base

all: pack

release: grunt moveout

grunt:
	grunt build

moveout: $(ITEMS)
	rm -r release
	mkdir release
	cp -r $(ITEMS) release/
	find ./release -type f -name '*.es6.js' -delete
	rm -rf ./release/js/{$(SKIP)}
