EXTNAME := chrome-zeroclick
KEYFILE := $(EXTNAME).pem
SHELL   := /usr/bin/env bash
CHROME  := chromium-browser -n --args
CWD     := $(shell pwd)
TMPDIR  := $(shell mktemp -d)
VERSION := $(shell python2 -c "import json,sys;print json.loads(sys.stdin.read()).get('version','')" < manifest.json)
ITEMS   := css/ html/ img/ js/ manifest.json

all: pack

moveout: $(ITEMS)
	mkdir $(TMPDIR)/$(EXTNAME)
	cp -R $(ITEMS) $(TMPDIR)/$(EXTNAME)

crx: moveout
	$(CHROME) --pack-extension=$(TMPDIR)/$(EXTNAME) \
	    --pack-extension-key=$(KEYFILE) --no-message-box
	mv $(TMPDIR)/$(EXTNAME).crx $(CWD)/build/$(EXTNAME)-latest.crx

zip: moveout
	cd $(TMPDIR)/$(EXTNAME)/ && zip $(EXTNAME)-$(VERSION).zip -r ./*
	cp $(TMPDIR)/$(EXTNAME)/$(EXTNAME)-$(VERSION).zip $(CWD)

build: zip
	mv $(CWD)/$(EXTNAME)-$(VERSION).zip ~/dropbox/Dropbox/DuckDuckGo\ Assets/Extensions/Chrome/

clean:
	rm $(CWD)/*.zip
