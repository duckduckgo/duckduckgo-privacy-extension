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
    -H "x-goog-api-version: 2" \
    -X PUT \
    -T $FILE_NAME \
    https://www.googleapis.com/upload/chromewebstore/v1.1/items/$ITEM_ID

# Publish the item
curl \
    -H "Authorization: Bearer $ACCESS_TOKEN"  \
    -H "x-goog-api-version: 2" \
    -d "{\"target\": \"default\"}" \
    https://www.googleapis.com/chromewebstore/v1.1/items/$ITEM_ID/publish
