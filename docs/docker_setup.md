# Docker Build & Run Instructions

## Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Buildx enabled

---

## 1. Run Locally on Windows

To run the API container on your local Windows machine:

### Step A: Build the Image

Build for your local architecture:

```bash
cd api
docker build -t card-park-api .
```

### Step B: Run the Container

You need to pass your environment variables. The easiest way is to use your existing `.env` file.

**Crucial Note for Windows:**
If your MySQL database is running on your Windows host (outside Docker), you must change `DB_HOST=localhost` to `DB_HOST=host.docker.internal` in your `.env` file (or override it in the command). `localhost` inside a container refers to the container itself, not your PC.

**Run Command:**

```bash
docker run -d -p 8111:8111 --env-file .env --name parking-api-container card-park-api
```

_(If you need to override the DB host just for Docker without changing the file)_:

```bash
docker run -d -p 8111:8111 --env-file .env -e "DB_HOST=host.docker.internal" --name parking-api-container card-park-api
```

---

## 2. Push to Remote Repository (Docker Hub)

To push the multi-architecture image (AMD64 & ARM64) to Docker Hub:

### Step A: Login

```bash
docker login
```

### Step B: Build and Push (Multi-Arch)

Replace `yourusername` with your Docker Hub username.

```bash
# 1. Create a builder (if not done yet)
docker buildx create --use

# 2. Build and push in one go
docker buildx build --platform linux/amd64,linux/arm64 -t arpudhanaresh/card-park-api:latest --push .

docker buildx build --no-cache --platform linux/amd64,linux/arm64 -t arpudhanaresh/card-park-api:latest --push .

```

### Verification

Once pushed, you can view the image tags on [Docker Hub](https://hub.docker.com/r/arpudhanaresh/card-park-api). You will see "OS/ARCH" listing both `linux/amd64` and `linux/arm64`.

---

## 3. Pull and Run from Remote

To run the image on any machine (VPS, another PC, etc.):

### Step A: Pull the Image

```bash
docker pull arpudhanaresh/card-park-api:latest
```

### Step B: Run

Since the `.env` file is baked into the image, you can simply run:

```bash
docker run -d -p 8111:8111 --name parking-api arpudhanaresh/card-park-api:latest
```

> **Note:** If you need to override the baked-in settings (e.g., connect to a different database host), you can still pass environment variables:
>
> ```
>
> ```

---

## 4. Update & Redeploy

To pull the latest version, remove the old container, and start fresh:

```bash
docker rm -f $(docker ps -aq --filter ancestor=arpudhanaresh/card-park-api:latest) && docker rmi -f arpudhanaresh/card-park-api:latest

docker run -d -p 8111:8111 --name parking-api arpudhanaresh/card-park-api:latest
```
