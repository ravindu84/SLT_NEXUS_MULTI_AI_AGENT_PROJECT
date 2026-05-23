FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
# Assuming the docker context is the root directory
COPY backend/ ./backend/
COPY chroma_db/ ./chroma_db/

# Expose port 8000
EXPOSE 8000

# Set Python Path
ENV PYTHONPATH=/app

# Start the FastAPI Swarm Server
CMD ["python", "-m", "backend.main"]
