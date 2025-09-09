# ==============================
# ProjectDuck + Claude Code Dockerfile
# Extends ProjectDuck image with Claude Code CLI
# ==============================

# Base on existing ProjectDuck image
FROM kelithius/projectduck:latest

# Switch to root to install additional packages
USER root

# Install Claude Code CLI dependencies
RUN apk add --no-cache \
    curl \
    git \
    bash \
    openssh-client \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Install Claude Code CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Create Claude workspace directory
RUN mkdir -p /workspace && chown nextjs:nodejs /workspace

# Find Claude executable path and set it as environment variable
RUN CLAUDE_PATH=$(which claude) && \
    echo "Claude executable found at: $CLAUDE_PATH"

ENV CLAUDE_CONFIG_DIR=/workspace/.claude

# Switch back to nextjs user
USER nextjs

# ProjectDuck web app runs on port 3000 (inherited from base image)
# Claude Code CLI available via 'claude' command
# Health check and entrypoint inherited from base image