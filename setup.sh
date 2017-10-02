#!/bin/bash

# Bash script to setup headless Selenium (uses Xvfb and Chrome)

# Add Google Chrome's repo to sources.list
echo "deb http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee -a /etc/apt/sources.list

# Install Google's public key used for signing packages (e.g. Chrome)
# (Source: http://www.google.com/linuxrepositories/)
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -

# Update apt sources:
sudo apt-get update

# Install Google Chrome:
sudo apt-get -y install libxpm4 libxrender1 libgtk2.0-0 libnss3 libgconf-2-4
sudo apt-get -y install google-chrome-stable

# Dependencies to make "headless" chrome/selenium work:
sudo apt-get -y install xvfb gtk2-engines-pixbuf
sudo apt-get -y install xfonts-cyrillic xfonts-100dpi xfonts-75dpi xfonts-base xfonts-scalable