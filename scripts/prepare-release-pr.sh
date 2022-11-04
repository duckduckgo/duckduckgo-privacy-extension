#!/bin/bash

if [ -z "$1" ]
then
    VERSION=$(date "+%Y.%m.%d")
else
    VERSION=$1
fi

# Update version and bundled config
npm run install-ci
npm run bundle-config
node scripts/bumpVersion.js $VERSION

# Create release commit
git checkout -b release/$1
git add browsers/*/manifest.json shared/data/*
git commit -S -m "Release $VERSION [ci release]"
git push --set-upstream origin release/$1 -f

# Open Github PR
gh pr create -B new-release-workflow --title "Prepare release $VERSION" --body "Updated version and bundled config."
