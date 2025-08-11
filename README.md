# ProjectDuck

> A Next.js Web Application for Document Viewing - ProjectDuck (Project Document's phonetic pun)

ProjectDuck is a modern file browser and document viewer built on the Next.js 15 full-stack framework. It provides an intuitive dual-panel interface specifically designed for viewing and browsing documents in server-side specified directories, with rich rendering capabilities especially for Markdown files.

## ✨ Key Features

- **🎯 Modern Full-Stack Architecture**: Based on Next.js 15 + App Router, supports SSR/SSG
- **🎨 Intuitive Dual-Panel Design**: File tree on the left + content viewer on the right, with adjustable split ratios
- **📝 Enhanced Markdown Support**: GitHub Flavored Markdown + Mermaid chart rendering
- **🎭 Theme Switching**: Dark/light modes based on Ant Design theme system
- **🌐 Internationalization**: Default Traditional Chinese with multi-language support
- **⚡ Performance Optimization**: API response caching, lazy loading, dynamic imports
- **🔍 Smart Search**: Real-time file tree search and filtering
- **🔄 Hot Reload Configuration**: Automatically detects changes to projects.json and updates configuration
- **📱 Responsive Design**: Adapts to desktop, tablet, and other screen sizes

## 🚀 Tech Stack

### Core Framework
- **Next.js 15.4.6** - Full-stack React framework (App Router + API Routes)
- **React 18.3.1** - Modern frontend library
- **TypeScript 5.x** - Static type support

### UI & Styling
- **Ant Design 5.26.7** - Enterprise-class UI component library
- **Allotment 1.20.4** - Resizable split panels
- **Tailwind CSS 4** - Utility-first CSS framework
- **CSS Modules** - Component style isolation

### Content Rendering
- **react-markdown 10.1.0** - Markdown to React component conversion
- **remark-gfm 4.0.1** - GitHub Flavored Markdown support
- **react-syntax-highlighter 15.6.1** - Code syntax highlighting
- **rehype-highlight 7.0.2** - Code highlighting in Markdown
- **Mermaid** - Flowchart and diagram rendering

### Internationalization & Tools
- **next-i18next 15.4.2** - Next.js internationalization support
- **i18next 25.3.2** - Multi-language framework
- **fs-extra 11.3.1** - Enhanced file system operations
- **mime-types 3.0.1** - MIME type detection
- **chokidar 4.x** - Cross-platform file watching for configuration hot reload

## 🎯 Supported File Formats

| File Type | Supported Features |
|----------|----------|
| **Markdown** (`.md`, `.markdown`) | GFM syntax, tables, task lists, syntax highlighting, Mermaid charts |
| **Code Files** | JavaScript, TypeScript, Python, Java, C++, Go, Rust and 190+ languages |
| **JSON** | Formatted display with syntax highlighting |
| **Images** | JPG, PNG, GIF, SVG, WebP and other formats |
| **Videos** | MP4, WebM, MOV and browser-supported formats |
| **Plain Text** | TXT, LOG and other text files |

## 🏗️ Project Structure

```
ProjectDuck/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes (replaces Express backend)
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx          # Home page
│   ├── components/
│   │   ├── layout/AppLayout.tsx      # Main app layout
│   │   ├── fileTree/FileTree.tsx     # File tree component
│   │   ├── contentViewer/           # Content viewer components
│   │   └── WarningSupressor.tsx    # SSR hydration warning handler
│   ├── lib/
│   │   ├── services/          # API and utility services
│   │   ├── providers/         # Context Providers
│   │   ├── i18n/             # Internationalization config
│   │   └── types.ts          # TypeScript type definitions
│   └── styles/               # Global styles
├── public/                   # Static assets
├── example/                  # Example files directory
├── next.config.ts           # Next.js configuration
├── next-i18next.config.js   # Internationalization config
└── CLAUDE.md               # Claude Code development guide
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18.0 or higher
- npm, yarn, pnpm, or bun

### Installation & Setup

1. **Install Dependencies**
```bash
npm install
# or
yarn install
# or
pnpm install
```

2. **Start Development Server**
```bash
npm run dev
# or
yarn dev
# or 
pnpm dev
```

3. **Open Browser**
Navigate to [http://localhost:3000](http://localhost:3000) to view the application

### Available Commands

```bash
# Development mode (with Turbopack support)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Linting
npm run lint
```

## ⚙️ Configuration

### Environment Variables
Configure in `next.config.ts`:
```typescript
env: {
  BASE_PATH: process.env.BASE_PATH || '/path/to/your/files',
}
```

### Internationalization Settings
Configure languages in `next-i18next.config.js`:
```javascript
module.exports = {
  i18n: {
    defaultLocale: 'zh_tw',    // Default Traditional Chinese
    locales: ['en', 'zh_tw'],  // Supported languages
  },
}
```

### Browse Directory
By default, browses files in the `/example` directory. Can be modified via the `BASE_PATH` environment variable.

## 🎨 Feature Highlights

### Dual-Panel Design
- **Left Panel**: File tree browser with expand/collapse and search filtering
- **Right Panel**: Dynamic content viewer that automatically switches rendering modes based on file type
- **Adjustable**: Drag to adjust the width ratio between left and right panels

### Enhanced Markdown Features
- ✅ Full GitHub Flavored Markdown support
- ✅ Code block syntax highlighting (190+ languages)
- ✅ Automatic Mermaid chart rendering (flowcharts, sequence diagrams, Gantt charts, etc.)
- ✅ Tables, task lists, strikethrough and other extended syntax
- 🟡 Section collapsing functionality (in development)

### Performance & Experience
- **API Caching**: Smart caching mechanism reduces duplicate requests
- **Lazy Loading**: Dynamic loading of file tree and components
- **Hot Configuration Reload**: Automatically detects and applies changes to projects.json without restart
- **Memory-based Config Cache**: Lightning-fast project configuration access
- **Responsive**: Adapts to different screen sizes
- **Theme Switching**: One-click toggle between dark/light modes
- **Search Functionality**: Real-time filename search with highlighting

## 🔧 Development Guide

### Development Tool Configuration
- **TypeScript**: Strict mode, path alias `@/*`
- **ESLint**: Next.js + TypeScript rule set
- **Tailwind CSS**: Coexisting configuration with Ant Design

### Adding Support for New File Types
Add handling logic in `src/components/contentViewer/ContentViewer.tsx`:

```typescript
const getContentType = (file: FileItem) => {
  if (file.extension === '.your-extension') {
    return 'your-custom-type';
  }
  // ... other type checks
};
```

### API Routes Development
Create new route files in the `src/app/api/` directory:

```typescript
// src/app/api/your-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Processing logic
  return NextResponse.json({ success: true, data: result });
}
```

## 🚢 Deployment

### Docker Deployment (Recommended)

ProjectDuck is containerized and available as `kelithius/projectduck` Docker image.

#### Quick Start

**Important:** ProjectDuck requires a `projects.json` configuration file. The application automatically monitors this file for changes and updates the configuration without requiring a restart.

```bash
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

# Pull and run with configuration
docker run -d -p 3000:3000 \
  --name projectduck \
  -v $(pwd)/projects.json:/app/projects.json \
  -v /path/to/your/workspace:/workspace \
  kelithius/projectduck:latest

# You can now edit projects.json and changes will be detected automatically
# Simply refresh the page to see updated project configurations
```

#### Custom Document Directories

Mount your workspace directory containing all projects:

```bash
docker run -d -p 3000:3000 \
  --name projectduck \
  -v /path/to/your/workspace:/workspace \
  -v $(pwd)/projects.json:/app/projects.json \
  kelithius/projectduck:latest
```

#### Custom Project Configuration

Create a custom `projects.json` file and mount it:

```bash
# Create custom projects.json
cat > my-projects.json << EOF
{
  "version": "1.0",
  "projects": [
    {
      "name": "My Documentation",
      "path": "/workspace/docs"
    },
    {
      "name": "Project Files",
      "path": "/workspace/project"
    }
  ]
}
EOF

# Run with custom configuration
docker run -d -p 3000:3000 \
  --name projectduck \
  -v $(pwd)/my-projects.json:/app/projects.json \
  -v /path/to/your/workspace:/workspace \
  kelithius/projectduck:latest
```

#### Docker Compose

Create a `docker-compose.yml` file for easier management:

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
    
    # Volume mounts for custom documents and configuration
    volumes:
      # Mount your workspace directory containing all projects
      - /path/to/your/workspace:/workspace
      
      # Optional: Custom projects.json configuration
      # - ./custom-projects.json:/app/projects.json
    
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

Then run:

```bash
# Start with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### Build Your Own Image

```bash
# Clone the repository
git clone <repository-url>
cd ProjectDuck

# Build using the build script
cd docker/scripts
./build.sh build

# Or build manually (from project root)
docker build -f docker/Dockerfile -t my-projectduck .

# Run your custom image
docker run -d -p 3000:3000 my-projectduck
```

#### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port number for the server |
| `NODE_ENV` | `production` | Node.js environment |
| `HOSTNAME` | `0.0.0.0` | Hostname to bind to |

#### Volume Mounts

| Path | Purpose | Example |
|------|---------|---------|
| `/workspace` | Main workspace directory | `-v /host/workspace:/workspace` |
| `/app/projects.json` | Project configuration | `-v ./my-config.json:/app/projects.json` |

#### Health Check

The container includes a health check endpoint at `/health`:

```bash
# Check container health
curl http://localhost:3000/health
```

### Vercel Deployment

1. Connect GitHub repository to Vercel
2. Automatically detect Next.js project and deploy
3. Configure environment variables as needed

### Static Export (Limited Features)

```bash
# Configure next.config.ts for static mode
npm run build
npm run export
```

**Note:** Static export has limitations with API routes and dynamic features.

For detailed Docker documentation and advanced configurations, see the [docker/README.md](docker/README.md).

## 📄 License

MIT License

## 📞 Support

- **Issues**: Submit issue reports on GitHub
- **Development Guide**: Refer to the `CLAUDE.md` file

---

**ProjectDuck** - Making document browsing elegant and efficient 🦆✨