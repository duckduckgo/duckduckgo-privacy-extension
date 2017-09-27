#!/bin/bash
export DISPLAY=:99.0

if [ ! -f /tmp/.X99-lock ]
then
    Xvfb :99 -screen 0 1280x1024x24 &
fi

# prepend our local firefox bin
# export PATH=$PWD/firefox:$PATH &&
# export PATH=$PATH:$PWD/node_modules/geckodriver/bin &&

# get local firefox
# https://ftp.mozilla.org/pub/firefox/nightly/2017/03/2017-03-01-11-01-55-mozilla-central/firefox-54.0a1.en-US.linux-x86_64.tar.bz2
# tar -xvjf firefox-*

# requires node 7.5+
node selenium-test/ratings.js
EXIT_CODE=$?

# cleanup
# rm -f /tmp/GeckoChildCrash*
# rm -rf /tmp/rust_mozprofile*
# rm -rf /tmp/tmp-*

exit $EXIT_CODE
