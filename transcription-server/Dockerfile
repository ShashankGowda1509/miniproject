FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY whisper_server.py .

# Create model cache directory
RUN mkdir -p /app/models

# Environment variables
ENV WHISPER_MODEL=medium
ENV WHISPER_DEVICE=cpu
ENV WHISPER_COMPUTE_TYPE=int8
ENV WHISPER_WORKERS=4
ENV PORT=8765
ENV MODEL_CACHE_DIR=/app/models

# Expose port
EXPOSE 8765

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD python -c "import asyncio, websockets; asyncio.run(websockets.connect('ws://localhost:8765'))" || exit 1

# Run the server
CMD ["python", "whisper_server.py"]
