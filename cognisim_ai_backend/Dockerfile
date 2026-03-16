# Dockerfile for CogniSim AI Backend
# Optimized for Hugging Face Spaces deployment

FROM python:3.11-slim

# Set up a new user named "user" with user ID 1000 (required by Hugging Face Spaces)
RUN useradd -m -u 1000 user

# Switch to the "user" user
USER user

# Set home to the user's home directory
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Set the working directory to the user's home directory
WORKDIR $HOME/app

# Copy requirements file with proper ownership
COPY --chown=user requirements.txt .

# Upgrade pip and install dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --upgrade -r requirements.txt

# Copy the rest of the application with proper ownership
COPY --chown=user . .

# Expose port 7860 (required by Hugging Face Spaces)
EXPOSE 7860

# Start the FastAPI app on port 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
