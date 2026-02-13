# Atrosha — AWS Deployment Guide

## Prerequisites
- An AWS account (Free Tier eligible)
- Git Bash or WSL on your Windows machine (for SSH/rsync)

---

## Step 1: Launch EC2 Instance

1. Go to **AWS Console → EC2 → Launch Instance**
2. Configure:

| Setting | Value |
|---|---|
| **Name** | `atrosha-proxy` |
| **AMI** | Ubuntu Server 24.04 LTS (Free tier eligible) |
| **Instance type** | `t2.micro` (Free tier) |
| **Key pair** | Create new → `atrosha-key` → Download `.pem` file |
| **Network** | Allow SSH (22), Custom TCP **8000** from Anywhere |

3. Click **Launch Instance**
4. Wait ~60 seconds, then copy the **Public IPv4 Address** from the instance details

---

## Step 2: Secure Your Key

Open Git Bash / WSL and run:

```bash
# move key to .ssh and lock permissions
mv ~/Downloads/atrosha-key.pem ~/.ssh/
chmod 400 ~/.ssh/atrosha-key.pem
```

---

## Step 3: Install Docker on the Server

```bash
# ssh into your instance
ssh -i ~/.ssh/atrosha-key.pem ubuntu@<YOUR-EC2-IP>

# once inside, run the install script (or paste these):
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
$(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# let ubuntu user run docker
sudo usermod -aG docker $USER

# IMPORTANT: log out and back in
exit
ssh -i ~/.ssh/atrosha-key.pem ubuntu@<YOUR-EC2-IP>

# verify
docker --version
```

---

## Step 4: Deploy Atrosha

**From your local machine** (Git Bash / WSL), run:

```bash
cd /path/to/atrosha_test/deployment
chmod +x deploy.sh
./deploy.sh <YOUR-EC2-IP> ~/.ssh/atrosha-key.pem
```

This will:
- Upload your code to the server
- Build all Docker images
- Start Redis + Bank + Proxy

> **First build takes ~5 min** (Rust compilation). Subsequent deploys are cached and fast.

---

## Step 5: Verify

```bash
# health check
curl http://<YOUR-EC2-IP>:8000/health
# expected: ok

# run agent against the cloud proxy
python agent/agent.py http://<YOUR-EC2-IP>:8000 agent-007
```

---

## FAQ

**Q: Will it stay running if I close my laptop?**
Yes. The EC2 instance runs 24/7. `restart: always` means services recover from crashes automatically.

**Q: How do I update the code?**
Just run `./deploy.sh <IP> <KEY>` again. It rsyncs only changed files.

**Q: How do I stop everything?**
```bash
ssh -i ~/.ssh/atrosha-key.pem ubuntu@<YOUR-EC2-IP>
cd ~/atrosha && docker compose down
```

**Q: How do I check logs?**
```bash
ssh -i ~/.ssh/atrosha-key.pem ubuntu@<YOUR-EC2-IP>
cd ~/atrosha && docker compose logs -f proxy
```
