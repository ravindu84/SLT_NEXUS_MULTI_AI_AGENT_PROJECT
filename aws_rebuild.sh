#!/bin/bash
set -e

echo "Setting up swap space..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 1G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab
    echo "Swap space created."
else
    echo "Swap space already exists."
fi

echo "Pulling latest code..."
cd SLT_NEXUS_MULTI_AI_AGENT_PROJECT
git pull origin main

echo "Building Docker container..."
sudo docker build -t slt-nexus-backend .

echo "Restarting backend container..."
sudo docker stop slt-nexus-backend || true
sudo docker rm slt-nexus-backend || true
sudo docker run -d -p 8000:8000 --restart unless-stopped --name slt-nexus-backend slt-nexus-backend

echo "Deployment successful!"
