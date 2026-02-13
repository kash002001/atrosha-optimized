#!/bin/bash
# run this FROM YOUR LOCAL MACHINE (windows: use git bash or wsl)
# usage: ./deploy.sh <ec2-public-ip> <path-to-key.pem>
#
# example:
#   ./deploy.sh 54.123.45.67 ~/.ssh/atrosha-key.pem

set -e

IP=$1
KEY=$2

if [ -z "$IP" ] || [ -z "$KEY" ]; then
    echo "usage: ./deploy.sh <ec2-public-ip> <path-to-key.pem>"
    exit 1
fi

REMOTE="ubuntu@$IP"
SSH="ssh -i $KEY -o StrictHostKeyChecking=no"
SCP="scp -i $KEY -o StrictHostKeyChecking=no"

echo "=== syncing project to $REMOTE ==="

# create remote dir
$SSH $REMOTE "mkdir -p ~/atrosha"

# sync only what's needed (no target/, no .git)
rsync -avz --progress \
    -e "ssh -i $KEY -o StrictHostKeyChecking=no" \
    --exclude 'target' \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude '__pycache__' \
    --exclude 'deployment' \
    ../ $REMOTE:~/atrosha/

echo "=== building and starting on remote ==="

$SSH $REMOTE "cd ~/atrosha && docker compose down --remove-orphans 2>/dev/null; docker compose up -d --build"

echo ""
echo "=== deployed! ==="
echo "health check: curl http://$IP:8000/health"
echo "test agent:   python agent/agent.py http://$IP:8000 agent-007"
