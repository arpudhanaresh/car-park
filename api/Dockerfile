# Use an official Python runtime as a parent image
# python:3.11-slim supports both linux/amd64 and linux/arm64
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container at /app
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy .env file (Baking secrets into the image)
COPY .env .

# Copy the rest of the application code
COPY . .

# Expose port 8111
EXPOSE 8111

# Run uvicorn server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8111"]
