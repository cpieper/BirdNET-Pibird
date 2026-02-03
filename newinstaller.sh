#!/usr/bin/env bash
# BirdNET-Pibird Installer
#
# Usage:
#   curl -s https://raw.githubusercontent.com/cpieper/BirdNET-Pibird/main/newinstaller.sh | bash
#
# To install from a specific branch:
#   curl -s https://raw.githubusercontent.com/cpieper/BirdNET-Pibird/BRANCH_NAME/newinstaller.sh | BRANCH=BRANCH_NAME bash
#
# Example (feature branch):
#   curl -s https://raw.githubusercontent.com/cpieper/BirdNET-Pibird/fastapi-svelte-migration-mk1/newinstaller.sh | BRANCH=fastapi-svelte-migration-mk1 bash

set -e

# Configuration - can be overridden via environment variables
REPO_URL="${REPO_URL:-https://github.com/cpieper/BirdNET-Pibird.git}"
BRANCH="${BRANCH:-fastapi-svelte-migration-mk1}"
INSTALL_DIR="${INSTALL_DIR:-${HOME}/BirdNET-Pi}"

echo ""
echo "=============================================="
echo "   BirdNET-Pibird Installer"
echo "=============================================="
echo ""
echo "Repository: ${REPO_URL}"
echo "Branch:     ${BRANCH}"
echo "Install to: ${INSTALL_DIR}"
echo ""

if [ "$EUID" == 0 ]
  then echo "Please run as a non-root user."
  exit 1
fi

if [ "$(uname -m)" != "aarch64" ] && [ "$(uname -m)" != "x86_64" ];then
  echo "BirdNET-Pi requires a 64-bit OS.
It looks like your operating system is using $(uname -m),
but would need to be aarch64 or x86_64."
  exit 1
fi

PY_VERSION=$(python3 -c "import sys; print(f'{sys.version_info[0]}{sys.version_info[1]}')")
if [ "${PY_VERSION}" == "39" ] ;then
  echo "### BirdNET-Pi requires a newer OS. Bullseye is deprecated, please use Bookworm. ###"
  [ -z "${FORCE_BULLSEYE}" ] && exit 1
fi

# we require passwordless sudo
sudo -K
if ! sudo -n true; then
    echo "Passwordless sudo is not working. Aborting"
    exit 1
fi

# Simple new installer
HOME=$HOME
USER=$USER

export HOME=$HOME
export USER=$USER

PACKAGES_MISSING=
for cmd in git jq ; do
  if ! which $cmd &> /dev/null;then
      PACKAGES_MISSING="${PACKAGES_MISSING} $cmd"
  fi
done
if [[ ! -z $PACKAGES_MISSING ]] ; then
  sudo apt update
  sudo apt -y install $PACKAGES_MISSING
fi

# Clone the repository
echo "Cloning ${REPO_URL} (branch: ${BRANCH})..."
git clone -b "${BRANCH}" --depth=1 "${REPO_URL}" "${INSTALL_DIR}" &&

# Set SKIP_PHP to use new web interface instead of PHP
export SKIP_PHP=1

# Export BIRDNET_DIR for scripts that need it
export BIRDNET_DIR="${INSTALL_DIR}"

# Run base installation
"${INSTALL_DIR}/scripts/install_birdnet.sh"
if [ ${PIPESTATUS[0]} -ne 0 ];then
  echo "The base installation exited unsuccessfully."
  exit 1
fi

# Install new web interface (FastAPI + SvelteKit)
echo ""
echo "=============================================="
echo "Installing modern web interface..."
echo "=============================================="
echo ""

"${INSTALL_DIR}/scripts/install_web.sh"
if [ ${PIPESTATUS[0]} -eq 0 ];then
  echo ""
  echo "=============================================="
  echo "Installation completed successfully!"
  echo "=============================================="
  echo ""
  echo "The system will reboot in 10 seconds..."
  echo "Press Ctrl+C to cancel reboot"
  sleep 10
  sudo reboot
else
  echo "The web interface installation exited unsuccessfully."
  echo "You can try running it manually: ${INSTALL_DIR}/scripts/install_web.sh"
  exit 1
fi
