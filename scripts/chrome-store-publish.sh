#!/bin/bash
set -e

# Publish a Chrome extension zip to the chrome store for a given extension ID.
# Args: <Extension Item ID> <Path to zip>
ITEM_ID=$1
FILE_NAME=$2

# Get an access token
ACCESS_TOKEN=$(curl "https://accounts.google.com/o/oauth2/token" \
    -d "client_id=$CWS_CLIENT_ID&client_secret=$CWS_CLIENT_SECRET&refresh_token=$CWS_REFRESH_TOKEN&grant_type=refresh_token&redirect_uri=urn:ietf:wg:oauth:2.0:oob" | jq -r .access_token)

# Upload release zip
curl \
    -H "Authorization: Bearer $ACCESS_TOKEN"  \
    -X POST \
    -T $FILE_NAME \
    https://chromewebstore.googleapis.com/upload/v2/publishers/${CHROME_PUBLISHER_ID}/items/$ITEM_ID:upload

# Publish the item
curl \
    -H "Content-Type: application/json" \
    -X POST \
    -H "Authorization: Bearer $ACCESS_TOKEN"  \
    -d '{"publishType":"STAGED_PUBLISH","blockOnWarnings":true}' \
    https://chromewebstore.googleapis.com/v2/publishers/${CHROME_PUBLISHER_ID}/items/$ITEM_ID:publish
