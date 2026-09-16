#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "===> Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "===> Pre-training ML clinical risk assessment model..."
python -m app.ml.train_model

echo "===> Seeding database with demo patients (safe to run multiple times)..."
python seed_data.py || echo "Seed skipped or already seeded."

echo "===> Backend build complete!"
