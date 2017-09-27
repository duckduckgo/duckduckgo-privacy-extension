#!/bin/bash
export DISPLAY=:99.0

if [ ! -f /tmp/.X99-lock ]
then
    echo "Creating Xvfb..."
    Xvfb :99 -screen 0 1280x1024x24 &
fi

echo "Executing test..."
node selenium-test/ratings.js
EXIT_CODE=$?
echo "Done!"

exit $EXIT_CODE
