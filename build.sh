#!/bin/bash
set -e
echo "Installing root dependencies..."
npm install
echo "Installing frontend dependencies..."
npm install --prefix frontend
echo "Building frontend..."
npm run build --prefix frontend
echo "Build complete!"
