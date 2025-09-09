# ProjectDuck + Claude Code Docker

This directory contains Docker configuration for ProjectDuck enhanced with Claude Code CLI integration.

## Overview

This image extends the base ProjectDuck image (`kelithius/projectduck:latest`) by adding Claude Code CLI, providing both the web-based document viewer and AI-powered development assistance in a single container.

## Features

- **ProjectDuck Web Interface**: Full-featured file browser and document viewer on port 3000
- **Claude Code CLI**: AI-powered coding assistant available via `claude` command
- **Unified Workspace**: Shared workspace directory accessible by both tools
- **Development Environment**: Complete setup with Git, Python, Node.js, and build tools

## Directory Structure

```
docker/project-duck-with-claude-code/
├── Dockerfile           # Extended Docker build configuration
└── README.md           # This documentation
```

## Quick Start

### Build the Image

```bash
# Navigate to the docker directory
cd docker/project-duck-with-claude-code

# Build the extended image
docker build -t projectduck-with-claude:latest .
```

### Run the Container

```bash
# Create required projects.json configuration
echo '{
  "version": "1.0",
  "projects": [
    {
      "name": "My Workspace",
      "path": "/workspace"
    }
  ]
}' > projects.json

# Run with both ProjectDuck and Claude Code
docker run -d -p 3000:3000 \
  --name projectduck-claude \
  -v $(pwd)/projects.json:/app/projects.json \
  -v /path/to/your/workspace:/workspace \
  -e ANTHROPIC_API_KEY=your_api_key_here \
  projectduck-with-claude:latest
```

## Usage

### Access ProjectDuck Web Interface

Open your browser to `http://localhost:3000` to access the ProjectDuck file browser and document viewer.

### Use Claude Code CLI

Execute into the container to use Claude Code:

```bash
# Interactive shell access
docker exec -it projectduck-claude /bin/bash

# Use Claude Code CLI
claude --help

# Start a coding session
cd /workspace/your-project
claude
```

### Environment Setup

Claude Code requires an Anthropic API key to function:

```bash
# Set API key via environment variable
docker run -d -p 3000:3000 \
  --name projectduck-claude \
  -e ANTHROPIC_API_KEY=your_api_key_here \
  -v $(pwd)/projects.json:/app/projects.json \
  -v /workspace:/workspace \
  projectduck-with-claude:latest

# Or mount a .claude directory with configuration
docker run -d -p 3000:3000 \
  --name projectduck-claude \
  -v $(pwd)/projects.json:/app/projects.json \
  -v /workspace:/workspace \
  -v ~/.claude:/home/nextjs/.claude \
  projectduck-with-claude:latest
```

## Docker Compose Example

```yaml
version: '3.8'

services:
  projectduck-claude:
    image: projectduck-with-claude:latest
    container_name: projectduck-claude
    restart: unless-stopped
    
    ports:
      - "3000:3000"
    
    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOSTNAME=0.0.0.0
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - CLAUDE_CONFIG_DIR=/workspace/.claude
    
    volumes:
      # ProjectDuck configuration
      - ./projects.json:/app/projects.json:ro
      
      # Shared workspace for both tools
      - /path/to/your/workspace:/workspace
      
      # Claude Code configuration (optional)
      - ~/.claude:/home/nextjs/.claude
    
    # Health check inherited from base image
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    
    security_opt:
      - no-new-privileges:true
```

## Configuration

### ProjectDuck Configuration

Same as the base ProjectDuck image - requires `projects.json` file:

```json
{
  "version": "1.0",
  "projects": [
    {
      "name": "Development Workspace",
      "path": "/workspace"
    }
  ]
}
```

### Claude Code Configuration

Claude Code can be configured via:

1. **Environment Variables**:
   - `ANTHROPIC_API_KEY`: Your Anthropic API key
   - `CLAUDE_CONFIG_DIR`: Claude configuration directory (default: `/workspace/.claude`)

2. **Configuration Directory**: Mount your local `.claude` directory to persist settings

3. **Workspace Integration**: Both tools share the `/workspace` directory for seamless workflow

## Advanced Usage

### Development Workflow

1. **Browse Files**: Use ProjectDuck web interface to explore your codebase
2. **AI Assistance**: Execute into container and use Claude Code for development tasks
3. **Shared Context**: Both tools operate on the same workspace for consistent experience

### Custom Build

To customize the image for your specific needs:

```dockerfile
FROM projectduck-with-claude:latest

# Add additional development tools
USER root
RUN apk add --no-cache \
    vim \
    tmux \
    your-favorite-tools

# Custom configuration
COPY your-config.json /workspace/.claude/config.json

USER nextjs
```

## Included Tools

The extended image includes all tools from the base ProjectDuck image plus:

- **Claude Code CLI**: AI-powered development assistant
- **Git**: Version control system
- **Python 3**: Python runtime and package manager
- **Build Tools**: gcc, make, g++ for native module compilation
- **SSH Client**: For repository access and remote operations
- **Bash**: Enhanced shell environment

## Troubleshooting

### Claude Code Issues

```bash
# Check Claude Code installation
docker exec projectduck-claude which claude

# Verify API key setup
docker exec projectduck-claude claude --version

# Check logs for authentication issues
docker logs projectduck-claude
```

### Workspace Access

```bash
# Verify workspace mount
docker exec projectduck-claude ls -la /workspace

# Check permissions
docker exec projectduck-claude id
```

### ProjectDuck Issues

Refer to the base ProjectDuck documentation in `../project-duck/README.md` for web interface troubleshooting.

## Security Considerations

- Container runs as non-root user (`nextjs`, uid: 1001)
- API keys should be provided via environment variables or mounted secrets
- Workspace directories should have appropriate permissions
- Consider using Docker secrets for production deployments

## Building from Source

To build the image locally:

```bash
# Navigate to the docker directory
cd docker/project-duck-with-claude-code

# Build with custom tag
docker build -t my-projectduck-claude:latest .

# Build with build arguments
docker build \
  --build-arg CLAUDE_VERSION=latest \
  -t my-projectduck-claude:latest .
```

## Production Deployment

For production use:

1. Use specific version tags instead of `latest`
2. Implement proper secrets management for API keys
3. Configure log rotation and monitoring
4. Set up health checks and restart policies
5. Use multi-stage builds for smaller image sizes
6. Consider separate containers for web interface and CLI access