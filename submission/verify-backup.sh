#!/bin/bash
set -e

echo "Verifying backup integrity..."

sha256sum -c checksums.sha256

if [ $? -eq 0 ]; then
  echo "Backup verification successful."
else
  echo "Backup verification failed!"
  exit 1
fi