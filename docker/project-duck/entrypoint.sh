#!/bin/sh
# ==============================
# ProjectDuck Docker Entrypoint
# ==============================

set -e

# Function to handle graceful shutdown
cleanup() {
    echo "Received shutdown signal, gracefully stopping..."
    if [ ! -z "$child" ]; then
        kill -TERM "$child" 2>/dev/null || true
        wait "$child"
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Function to check if projects.json exists
check_projects_config() {
    if [ ! -f "/app/projects.json" ]; then
        echo "Error: projects.json configuration file not found"
        echo ""
        echo "ProjectDuck requires a projects.json configuration file to run."
        echo "Please provide one by mounting it as a volume:"
        echo ""
        echo "  docker run -v /path/to/your/projects.json:/app/projects.json kelithius/projectduck"
        echo ""
        echo "Example projects.json format:"
        echo '{'
        echo '  "version": "1.0",'
        echo '  "projects": ['
        echo '    {'
        echo '      "name": "My Documents",'
        echo '      "path": "/data/docs"'
        echo '    }'
        echo '  ]'
        echo '}'
        echo ""
        exit 1
    fi
    
    echo "Found projects.json configuration"
    echo "Note: Detailed validation will be performed by Next.js on startup"
}

# Function to check data directory accessibility
check_data_directory() {
    if [ -d "/data" ] && [ "$(ls -A /data 2>/dev/null)" ]; then
        echo "Found mounted data directory at /data"
        echo "Note: Make sure your projects.json references the correct paths"
    fi
}

# Function to ensure basic directory structure
ensure_basic_structure() {
    # Ensure data directory exists for potential volume mounts
    mkdir -p /data
    
    # Note: We no longer auto-create example directories
    # Users must provide their own project directories
}

# Function to display startup information
show_startup_info() {
    echo ""
    echo "==============================="
    echo "   ProjectDuck Docker Container"
    echo "==============================="
    echo "Version: $(node -e "console.log(require('/app/package.json').version)" 2>/dev/null || echo "unknown")"
    echo "Node.js: $(node --version)"
    echo "Port: ${PORT:-3000}"
    echo "Environment: ${NODE_ENV:-production}"
    echo ""
    echo "Access the application at: http://localhost:${PORT:-3000}"
    echo "Health check endpoint: http://localhost:${PORT:-3000}/health"
    echo "==============================="
    echo ""
}

# Main execution
main() {
    echo "Starting ProjectDuck container..."
    
    # Check projects configuration (fail fast if missing or invalid)
    check_projects_config
    
    # Setup basic directory structure
    ensure_basic_structure
    
    # Check for mounted data directories
    check_data_directory
    
    # Show startup information
    show_startup_info
    
    # Start the Next.js application
    echo "Starting Next.js server..."
    
    # Use exec to replace the shell with node process for proper signal handling
    if [ "$1" = "node" ] || [ "$1" = "npm" ] || [ "$1" = "next" ]; then
        # If explicit command provided, use it
        exec "$@"
    else
        # Default: start the Next.js server
        exec node server.js &
        child=$!
        wait "$child"
    fi
}

# Execute main function
main "$@"