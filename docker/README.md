# ProjectDuck Docker

This directory contains all Docker-related files for ProjectDuck deployment.

## Directory Structure

```
docker/
├── Dockerfile              # Multi-stage Docker build configuration  
├── README.md               # This documentation
├── entrypoint.sh           # Container startup script
└── scripts/                # Build and management scripts
    └── build.sh               # Docker build and test automation
```

## Files Overview

### Build Configuration
- `Dockerfile` - Multi-stage Docker build with security hardening
- `../dockerignore` - Files to exclude from build context (in project root)

### Container Runtime  
- `entrypoint.sh` - Startup script with configuration handling

### Build Tools
- `scripts/build.sh` - Docker build and test automation script

## Configuration Requirements

**ProjectDuck uses a fail-fast approach for configuration.** The container will **immediately exit** if:

1. No `projects.json` file is found at `/app/projects.json`
2. The `projects.json` file contains invalid JSON syntax
3. The configuration is missing required fields (`version`, `projects` array)
4. No projects are defined in the configuration

This ensures that misconfigurations are caught early rather than causing runtime issues.

## Quick Start

### Build and Run

```bash
# Build the image
cd docker/scripts
./build.sh build

# Create projects.json configuration (REQUIRED)
cat > projects.json << EOF
{
  "version": "1.0",
  "projects": [
    {
      "name": "My Documents",
      "path": "/data/docs"
    }
  ]
}
EOF

# Run the container with configuration
docker run -d -p 3000:3000 \
  --name projectduck \
  -v $(pwd)/projects.json:/app/projects.json \
  -v /path/to/your/docs:/data/docs \
  kelithius/projectduck:latest
```

## Usage Examples

### Basic Usage

**Important:** ProjectDuck requires a `projects.json` configuration file. The container will fail to start without it.

```bash
# Pull the image
docker pull kelithius/projectduck:latest

# Create required configuration
echo '{
  "version": "1.0",
  "projects": [
    {
      "name": "My Documents",
      "path": "/data/docs"
    }
  ]
}' > projects.json

# Run with required configuration
docker run -d -p 3000:3000 \
  --name projectduck \
  -v $(pwd)/projects.json:/app/projects.json \
  -v /path/to/your/docs:/data/docs \
  kelithius/projectduck:latest
```

### With Custom Documents

```bash
# Mount your document directories
docker run -d -p 3000:3000 \
  --name projectduck \
  -v /path/to/docs:/data/docs \
  -v /path/to/project:/data/project \
  kelithius/projectduck:latest
```

### With Custom Configuration

Create a custom `projects.json` file:

```json
{
  "version": "1.0",
  "projects": [
    {
      "name": "Documentation",
      "path": "/data/docs"
    },
    {
      "name": "Project Alpha", 
      "path": "/data/project-alpha"
    },
    {
      "name": "Technical Specs",
      "path": "/data/specs"
    }
  ]
}
```

Then run with your custom configuration:

```bash
# Run with custom configuration
docker run -d -p 3000:3000 \
  --name projectduck \
  -v $(pwd)/projects.json:/app/projects.json \
  -v /path/to/docs:/data/docs \
  -v /path/to/project-alpha:/data/project-alpha \
  -v /path/to/specs:/data/specs \
  kelithius/projectduck:latest
```

## Build Script Usage

The `scripts/build.sh` script provides convenient commands for Docker operations:

```bash
# Navigate to scripts directory
cd docker/scripts

# Build the image
./build.sh build

# Test the built image
./build.sh test

# Build and test in one command
./build.sh build-test

# Run container interactively
./build.sh run

# Clean up containers and images
./build.sh clean
```

## Container Management

### Start and Stop Container

```bash
# Start container
docker run -d -p 3000:3000 --name projectduck kelithius/projectduck:latest

# View logs
docker logs -f projectduck

# Stop container
docker stop projectduck

# Remove container
docker rm projectduck
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Node.js environment |
| `PORT` | `3000` | Application port |
| `HOSTNAME` | `0.0.0.0` | Bind hostname |

## Volume Mounts

| Container Path | Purpose | Example Host Path |
|----------------|---------|-------------------|
| `/data/*` | Document directories | `/home/user/documents` |
| `/app/projects.json` | Project configuration | `./my-projects.json` |

## Health Checks

The container includes health monitoring:

```bash
# Check container health status
docker ps

# Manual health check
curl http://localhost:3000/health

# View health check logs
docker inspect --format='{{.State.Health}}' projectduck
```

## Troubleshooting

### Container Won't Start

```bash
# Check container logs
docker logs projectduck

# Run interactively for debugging
docker run -it --rm kelithius/projectduck:latest /bin/sh
```

### Port Already in Use

```bash
# Use different port
docker run -d -p 3001:3000 kelithius/projectduck:latest

# Or stop conflicting container
docker stop $(docker ps -q --filter "publish=3000")
```

### Permission Issues

```bash
# Check volume permissions
ls -la /path/to/your/documents

# Fix permissions if needed
sudo chown -R 1001:1001 /path/to/your/documents
```

## Security Considerations

- Container runs as non-root user (uid: 1001)
- Uses `dumb-init` for proper signal handling
- Implements proper health checks
- Minimal attack surface with Alpine Linux
- No unnecessary packages in production image

## Production Deployment

For production deployment, consider:

1. Use specific version tags instead of `latest`
2. Set up log rotation and monitoring
3. Configure backups for document volumes
4. Use secrets management for sensitive configurations
5. Implement reverse proxy with SSL/TLS

Example production docker-compose:

```yaml
version: '3.8'
services:
  projectduck:
    image: kelithius/projectduck:1.0.0
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    volumes:
      - ./data:/data
      - ./config/projects.json:/app/projects.json:ro
    environment:
      - NODE_ENV=production
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'
```