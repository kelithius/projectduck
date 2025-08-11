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

## Hot Configuration Reload

**ProjectDuck automatically monitors the `projects.json` file for changes** and updates the configuration in memory without requiring a container restart. This means:

- You can edit `projects.json` on the host system
- Changes are detected and applied automatically
- Simply refresh the web page to see updated project configurations
- No need to restart the container for configuration changes

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

**Important:** ProjectDuck requires a `projects.json` configuration file. The container will fail to start without it. The application monitors this file for changes and updates configuration automatically.

```bash
# Pull the image
docker pull kelithius/projectduck:latest

# Create required configuration
echo '{
  "version": "1.0",
  "projects": [
    {
      "name": "My Documents",
      "path": "/workspace/docs"
    }
  ]
}' > projects.json

# Run with required configuration
docker run -d -p 3000:3000 \
  --name projectduck \
  -v $(pwd)/projects.json:/app/projects.json \
  -v /path/to/your/workspace:/workspace \
  kelithius/projectduck:latest

# Edit projects.json anytime - changes are automatically detected
# Refresh the web page to see updated configurations
```

### With Custom Documents

```bash
# Mount your workspace directory containing all projects
docker run -d -p 3000:3000 \
  --name projectduck \
  -v /path/to/your/workspace:/workspace \
  -v $(pwd)/projects.json:/app/projects.json \
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
      "path": "/workspace/docs"
    },
    {
      "name": "Project Alpha",
      "path": "/workspace/project-alpha"
    },
    {
      "name": "Technical Specs",
      "path": "/workspace/specs"
    }
  ]
}
```

Organize your host directories:
```
/path/to/your/workspace/
├── docs/
├── project-alpha/
└── specs/
```

Then run with your custom configuration:

```bash
# Run with custom configuration (single workspace mount)
docker run -d -p 3000:3000 \
  --name projectduck \
  -v $(pwd)/projects.json:/app/projects.json \
  -v /path/to/your/workspace:/workspace \
  kelithius/projectduck:latest

# You can modify projects.json while the container is running
# Changes will be automatically detected and applied
```

## Docker Compose Example

For easier management, use Docker Compose:

```yaml
version: '3.8'

services:
  projectduck:
    image: kelithius/projectduck:latest
    container_name: projectduck
    restart: unless-stopped
    
    ports:
      - "3000:3000"
    
    # Environment variables
    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOSTNAME=0.0.0.0
    
    # Volume mounts - recommended single workspace approach
    volumes:
      # Mount your projects.json configuration
      - ./projects.json:/app/projects.json:ro
      
      # Mount your workspace directory containing all projects
      - /path/to/your/workspace:/workspace:ro
      
      # Alternative: Multiple project mounts (if needed)
      # - /path/to/docs:/workspace/docs:ro
      # - /path/to/project:/workspace/project:ro
    
    # Health check
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    
    # Security options
    security_opt:
      - no-new-privileges:true
```

Create your `projects.json` in the same directory:
```json
{
  "version": "1.0",
  "projects": [
    {
      "name": "My Documentation",
      "path": "/workspace/docs"
    },
    {
      "name": "Current Project",
      "path": "/workspace/my-project"
    }
  ]
}
```

Run with Docker Compose:
```bash
# Start the service
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the service
docker-compose down
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

| Variable   | Default      | Description         |
| ---------- | ------------ | ------------------- |
| `NODE_ENV` | `production` | Node.js environment |
| `PORT`     | `3000`       | Application port    |
| `HOSTNAME` | `0.0.0.0`    | Bind hostname       |

## Volume Mount Best Practices

**Recommended Approach: Single Workspace Mount**

For the best user experience, mount all your documents under a single `/workspace` directory:

```bash
# Recommended: Single workspace mount
docker run -d -p 3000:3000 \
  --name projectduck \
  -v /path/to/your/workspace:/workspace \
  -v $(pwd)/projects.json:/app/projects.json \
  kelithius/projectduck:latest
```

### Directory Structure Example

Organize your host filesystem like this:
```
/path/to/your/workspace/
├── documentation/
├── my-project/
├── shared-resources/
└── archives/
```

Then create your `projects.json` with standardized paths:
```json
{
  "version": "1.0",
  "projects": [
    {
      "name": "Documentation",
      "path": "/workspace/documentation"
    },
    {
      "name": "My Project",
      "path": "/workspace/my-project"
    },
    {
      "name": "Shared Resources", 
      "path": "/workspace/shared-resources"
    }
  ]
}
```

### Why This Approach?

1. **Simplified Setup**: Only need to mount one main directory
2. **Less Error-Prone**: Harder to forget mounting project directories
3. **Flexible**: Easy to add new projects without container restart
4. **Consistent**: All projects use predictable `/workspace/` paths

### Volume Mount Reference

| Container Path       | Purpose               | Example Host Path           |
| -------------------- | --------------------- | --------------------------- |
| `/workspace`         | Main workspace mount | `/home/user/my-workspace`   |
| `/app/projects.json` | Project configuration | `./projects.json`           |

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
ls -la /path/to/your/workspace

# Fix permissions if needed
sudo chown -R 1001:1001 /path/to/your/workspace
```

### Missing Project Directories

If you see "Project directory does not exist" errors:

```bash
# Check if your workspace is properly mounted
docker exec projectduck ls -la /workspace

# Verify your projects.json paths match your directory structure
docker exec projectduck cat /app/projects.json
```

Common issues:
- Forgot to mount the `/workspace` directory
- projects.json paths don't match your actual directory structure
- Incorrect host path in volume mount

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
version: "3.8"
services:
  projectduck:
    image: kelithius/projectduck:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
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
          cpus: "1.0"
```
