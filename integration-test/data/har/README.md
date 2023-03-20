# HAR files

This directory contains HAR files used for integration tests. These files specify mock HTTP responses to be 
used when loading pages, allowing tests to be run without relying on internet connectivity.

The following HAR files are current included:
 - duckduckgo.com/extension-success (post install page). Regenerate with `npx playwright open --save-har=duckduckgo.com/extension-success.har https://duckduckgo.com/extension-success`
 