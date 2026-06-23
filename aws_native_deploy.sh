#!/bin/bash
set -e

echo "Cleaning up old processes and Docker..."
killall screen || true
sudo lsof -i :8000 -t | xargs sudo kill -9 || true
sudo lsof -i :8001 -t | xargs sudo kill -9 || true
ps aux | grep uvicorn | awk '{print $2}' | xargs sudo kill -9 || true
sleep 2
sudo docker stop slt-nexus-backend || true
sudo docker rm slt-nexus-backend || true
sudo docker system prune -a -f --volumes

echo "Installing dependencies natively..."
sudo apt-get update
sudo apt-get install -y python3-venv python3-pip curl screen

echo "Installing uv..."
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.local/bin/env

echo "Setting up Python environment..."
cd ~/SLT_NEXUS_MULTI_AI_AGENT_PROJECT/backend
uv venv --clear
source .venv/bin/activate
uv pip install -r requirements.txt
uv pip install uvicorn

echo "Starting backend natively in screen session..."
cd ~/SLT_NEXUS_MULTI_AI_AGENT_PROJECT
screen -S backend -d -m bash -c 'source backend/.venv/bin/activate && uvicorn backend.main:app --host 0.0.0.0 --port 8000 > uvicorn.log 2>&1'

echo "Deployment successful!"
