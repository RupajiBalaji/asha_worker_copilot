#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "===> Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "===> Pre-training ML clinical risk assessment model..."
python -m app.ml.train_model

echo "===> Backend build complete!"
