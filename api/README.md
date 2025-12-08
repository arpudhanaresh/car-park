# Car Parking System API

## Setup

1.  **Create a virtual environment** (if not already created):
    ```bash
    python -m venv venv
    ```

2.  **Install dependencies**:
    ```bash
    venv\Scripts\pip install -r requirements.txt
    ```

## Running the API

To start the server, run the following command from the `api` directory:

```bash
venv\Scripts\python main.py
```

The API will start at `http://0.0.0.0:8000` (locally) or port `8111` (Docker).

## Docker Deployment

To update and run the container:

```bash
# Remove existing container and image
docker rm -f $(docker ps -aq --filter ancestor=arpudhanaresh/card-park-api:latest) && docker rmi -f arpudhanaresh/card-park-api:latest

# Run new container
docker run -d -p 8111:8111 --name parking-api arpudhanaresh/card-park-api:latest
```
