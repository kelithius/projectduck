#!/bin/bash
# ==============================
# ProjectDuck Docker Build Script
# ==============================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="kelithius/projectduck"
CONTAINER_NAME="projectduck-test"
BUILD_CONTEXT="../.."
DOCKERFILE="../Dockerfile"
DEFAULT_PLATFORMS="linux/amd64,linux/arm64"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to cleanup existing container
cleanup_container() {
    if docker ps -a --format 'table {{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_info "Cleaning up existing container: ${CONTAINER_NAME}"
        docker stop ${CONTAINER_NAME} 2>/dev/null || true
        docker rm ${CONTAINER_NAME} 2>/dev/null || true
        log_success "Container cleaned up"
    fi
}

# Function to build Docker image (single platform)
build_image() {
    log_info "Building Docker image: ${IMAGE_NAME}"
    log_info "Build context: ${BUILD_CONTEXT}"
    log_info "Dockerfile: ${DOCKERFILE}"
    
    if docker build -t ${IMAGE_NAME}:latest -f ${DOCKERFILE} ${BUILD_CONTEXT}; then
        log_success "Docker image built successfully"
    else
        log_error "Failed to build Docker image"
        exit 1
    fi
}

# Function to build multi-platform Docker image
build_image_multiplatform() {
    local platforms=${1:-$DEFAULT_PLATFORMS}
    local push_flag=${2:-false}
    
    log_info "Building multi-platform Docker image: ${IMAGE_NAME}"
    log_info "Platforms: ${platforms}"
    log_info "Build context: ${BUILD_CONTEXT}"
    log_info "Dockerfile: ${DOCKERFILE}"
    
    # Check if buildx is available
    if ! docker buildx version > /dev/null 2>&1; then
        log_error "Docker buildx is not available. Please install Docker Desktop or enable buildx."
        exit 1
    fi
    
    # Create and use buildx builder if it doesn't exist
    local builder_name="projectduck-builder"
    if ! docker buildx ls | grep -q "${builder_name}"; then
        log_info "Creating buildx builder: ${builder_name}"
        docker buildx create --name ${builder_name} --use
    else
        log_info "Using existing buildx builder: ${builder_name}"
        docker buildx use ${builder_name}
    fi
    
    # Build command
    local build_cmd="docker buildx build --platform ${platforms} -f ${DOCKERFILE}"
    
    if [ "$push_flag" = "true" ]; then
        build_cmd="${build_cmd} --push"
        log_info "Will push to registry after build"
    else
        build_cmd="${build_cmd} --load"
        log_warning "Building for local use only (--load). Use 'buildx-push' to push to registry."
    fi
    
    build_cmd="${build_cmd} -t ${IMAGE_NAME}:latest ${BUILD_CONTEXT}"
    
    log_info "Executing: ${build_cmd}"
    if eval ${build_cmd}; then
        if [ "$push_flag" = "true" ]; then
            log_success "Multi-platform Docker image built and pushed successfully"
        else
            log_success "Multi-platform Docker image built successfully"
        fi
    else
        log_error "Failed to build multi-platform Docker image"
        exit 1
    fi
}

# Function to test the built image
test_image() {
    log_info "Testing Docker image: ${IMAGE_NAME}"
    
    # Start container
    log_info "Starting test container..."
    if docker run -d --name ${CONTAINER_NAME} -p 3000:3000 ${IMAGE_NAME}:latest; then
        log_success "Container started successfully"
    else
        log_error "Failed to start container"
        exit 1
    fi
    
    # Wait for container to be ready
    log_info "Waiting for container to be ready..."
    sleep 10
    
    # Test health endpoint
    log_info "Testing health endpoint..."
    if curl -f -s http://localhost:3000/health > /dev/null; then
        log_success "Health check passed"
    else
        log_error "Health check failed"
        docker logs ${CONTAINER_NAME}
        cleanup_container
        exit 1
    fi
    
    # Test main application
    log_info "Testing main application..."
    if curl -f -s http://localhost:3000 > /dev/null; then
        log_success "Main application is responding"
    else
        log_error "Main application is not responding"
        docker logs ${CONTAINER_NAME}
        cleanup_container
        exit 1
    fi
    
    # Show container logs
    log_info "Container logs:"
    docker logs ${CONTAINER_NAME} --tail 20
    
    # Cleanup test container
    cleanup_container
    log_success "Image testing completed successfully"
}

# Function to display image information
show_image_info() {
    log_info "Docker image information:"
    docker images ${IMAGE_NAME}:latest --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
    
    log_info "Image layers:"
    docker history ${IMAGE_NAME}:latest --format "table {{.CreatedBy}}\t{{.Size}}"
}

# Function to run interactive container
run_interactive() {
    log_info "Running interactive container..."
    log_info "The container will be available at: http://localhost:3000"
    log_info "Press Ctrl+C to stop the container"
    
    docker run --rm -it -p 3000:3000 --name ${CONTAINER_NAME}-interactive ${IMAGE_NAME}:latest
}

# Main execution
main() {
    echo "==============================="
    echo "   ProjectDuck Docker Build"
    echo "==============================="
    echo ""
    
    # Parse command line arguments
    case "${1:-build}" in
        "build")
            build_image
            show_image_info
            ;;
        "buildx")
            # Multi-platform build for local use
            platforms=${2:-$DEFAULT_PLATFORMS}
            build_image_multiplatform "$platforms" false
            ;;
        "buildx-push")
            # Multi-platform build and push to registry
            platforms=${2:-$DEFAULT_PLATFORMS}
            build_image_multiplatform "$platforms" true
            ;;
        "buildx-amd64")
            # Build only for AMD64/x64
            build_image_multiplatform "linux/amd64" false
            ;;
        "buildx-arm64")
            # Build only for ARM64
            build_image_multiplatform "linux/arm64" false
            ;;
        "test")
            test_image
            ;;
        "build-test")
            build_image
            show_image_info
            test_image
            ;;
        "run")
            run_interactive
            ;;
        "clean")
            cleanup_container
            log_info "Removing Docker image if exists..."
            docker rmi ${IMAGE_NAME}:latest 2>/dev/null || true
            log_info "Removing buildx builder if exists..."
            docker buildx rm projectduck-builder 2>/dev/null || true
            log_success "Cleanup completed"
            ;;
        *)
            echo "Usage: $0 [build|buildx|buildx-push|buildx-amd64|buildx-arm64|test|build-test|run|clean]"
            echo ""
            echo "Commands:"
            echo "  build         - Build the Docker image (current platform only)"
            echo "  buildx        - Build multi-platform image (amd64 + arm64) for local use"
            echo "  buildx-push   - Build multi-platform image and push to registry"
            echo "  buildx-amd64  - Build for AMD64/x64 only"
            echo "  buildx-arm64  - Build for ARM64 only"
            echo "  test          - Test the existing Docker image"
            echo "  build-test    - Build and test the Docker image"
            echo "  run           - Run the container interactively"
            echo "  clean         - Clean up containers, images and buildx builder"
            echo ""
            echo "Examples:"
            echo "  ./build.sh buildx                     # Build for amd64 + arm64"
            echo "  ./build.sh buildx linux/amd64        # Build for amd64 only"
            echo "  ./build.sh buildx-push               # Build and push both platforms"
            echo ""
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"