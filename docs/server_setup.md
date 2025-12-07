# Server Setup Guide (Ubuntu)

This guide explains how to expose your Dockerized API (running on port 8111) to the public internet using **Nginx** as a reverse proxy and **Certbot** for free SSL (HTTPS).

## Prerequisites
- An Ubuntu Server.
- A domain name (`car-api.arpudhacheck.me`) pointing to your server's IP address.
- Your API container running on port 8111.

---

## 1. Install Nginx and Certbot

Run the following commands on your Ubuntu server:

```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx -y
```

## 2. Configure Nginx

Since you already have Nginx running for other ports, you simply need to **add a new configuration file**. Nginx is designed to handle multiple domains/ports simultaneously.

Create a **new** file specifically for this API (do NOT edit your existing files):

```bash
sudo nano /etc/nginx/sites-available/car-api
```

Paste the following configuration:

```nginx
server {
    server_name car-api.arpudhacheck.me;

    location / {
        proxy_pass http://localhost:8111;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 3. Enable the Configuration

Link the configuration file to the `sites-enabled` directory:

```bash
sudo ln -s /etc/nginx/sites-available/car-api /etc/nginx/sites-enabled/
```

Test the configuration for syntax errors:
```bash
sudo nginx -t
```
*(If you see "successful", proceed. If failed, check the file for typos)*

Reload Nginx to apply changes:
```bash
sudo systemctl reload nginx
```

At this point, your site should work over HTTP (`http://car-api.arpudhacheck.me`).

## 4. Setup SSL (HTTPS)

Run Certbot to automatically obtain and configure the SSL certificate:

```bash
sudo certbot --nginx -d car-api.arpudhacheck.me
```

- Enter your email when asked.
- Agree to the terms.
- Certbot will automatically update your Nginx config to force HTTPS.

**Done!** Your API is now secure at `https://car-api.arpudhacheck.me`.
