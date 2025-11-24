# Docker Deployment Guide

This guide explains how to build and deploy the web-therapist application using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose (optional, but recommended)

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

The application will be available at `http://localhost:8080`

### Using Docker CLI

```bash
# Build the image
docker build -t web-therapist:latest .

# Run the container
docker run -d -p 8080:80 --name web-therapist-app web-therapist:latest

# View logs
docker logs -f web-therapist-app

# Stop and remove the container
docker stop web-therapist-app
docker rm web-therapist-app
```

## Configuration

### Environment Variables

If your application uses environment variables, create a `.env.production` file and uncomment the `env_file` section in `docker-compose.yml`.

### Custom Port

To use a different port, modify the port mapping in `docker-compose.yml`:

```yaml
ports:
  - "3000:80"  # Change 3000 to your desired port
```

## Production Deployment

### Building for Production

```bash
# Build with a specific tag
docker build -t web-therapist:v1.0.0 .

# Tag for registry
docker tag web-therapist:v1.0.0 your-registry.com/web-therapist:v1.0.0

# Push to registry
docker push your-registry.com/web-therapist:v1.0.0
```

### Health Checks

The container includes a health check that runs every 30 seconds. Check the health status:

```bash
docker inspect --format='{{.State.Health.Status}}' web-therapist-app
```

## Nginx Configuration

The application uses nginx as a web server with:

- **React Router support**: All routes redirect to `index.html`
- **Gzip compression**: Enabled for text-based files
- **Static asset caching**: 1-year cache for images, fonts, etc.
- **Security headers**: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection

To modify the nginx configuration, edit `nginx.conf` and rebuild the image.

## Troubleshooting

### View container logs

```bash
docker logs web-therapist-app
```

### Access container shell

```bash
docker exec -it web-therapist-app sh
```

### Rebuild without cache

```bash
docker-compose build --no-cache
```

## File Structure

- `Dockerfile`: Multi-stage build configuration
- `.dockerignore`: Files excluded from Docker build context
- `nginx.conf`: Nginx web server configuration
- `docker-compose.yml`: Container orchestration configuration
- `DEPLOYMENT.md`: This deployment guide
