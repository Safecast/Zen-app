#!/bin/bash

# Script to download missing assets for esptool-js example
# Run this script from your project directory: /home/rob/Documents/Safecast/Zen-app/

BASE_URL="https://espressif.github.io/esptool-js"

# Image file
wget "${BASE_URL}/favicon.ee2246ac.ico"

# JavaScript files from import map
wget "${BASE_URL}/esp32s2.eb67e676.js"
wget "${BASE_URL}/stub_flasher_32c2.1e8a8f62.js"
wget "${BASE_URL}/stub_flasher_32c61.7504b2fe.js"
wget "${BASE_URL}/esp32c61.25d185bb.js"
wget "${BASE_URL}/esp32c6.9206e4d8.js"
wget "${BASE_URL}/stub_flasher_32s2.d20e7f63.js"
wget "${BASE_URL}/esp32c3.30f63481.js"
wget "${BASE_URL}/esp32s3.67489660.js"
wget "${BASE_URL}/stub_flasher_32c6.23eadd95.js"
wget "${BASE_URL}/esp8266.ff379730.js"
wget "${BASE_URL}/stub_flasher_32c5.b521988f.js"
wget "${BASE_URL}/esp32h2.5b3f9c3f.js"
wget "${BASE_URL}/stub_flasher_32h2.b5dc5012.js"
wget "${BASE_URL}/stub_flasher_32p4.89455c1f.js"
wget "${BASE_URL}/esp32c5.1948091b.js"
wget "${BASE_URL}/stub_flasher_32s3.9db7ea72.js"
wget "${BASE_URL}/stub_flasher_8266.1e9be1d2.js"
wget "${BASE_URL}/esp32p4.c3b47fed.js"
wget "${BASE_URL}/esp32c2.f983e934.js"
wget "${BASE_URL}/stub_flasher_32c3.90a30a3b.js"

echo "All files downloaded."
