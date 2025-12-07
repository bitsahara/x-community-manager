#!/bin/bash
# install-xvfb.sh

echo "Installing Xvfb and dependencies..."

# Update system
sudo apt-get update

# Install Xvfb
sudo apt-get install -y xvfb

# Install X11 utilities (optional but useful)
sudo apt-get install -y x11-utils

# Install Puppeteer dependencies
sudo apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils

echo "Installation complete!"
