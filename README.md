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

### Vercel (Recommended)
1. Connect GitHub repository to Vercel
2. Automatically detect Next.js project and deploy
3. Set environment variable `BASE_PATH`

### Docker Deployment
```bash
# Build Docker image
docker build -t project-duck .

# Run container
docker run -p 3000:3000 -e BASE_PATH=/your/path project-duck
```

### Static Export (Limited Features)
```bash
# Configure next.config.ts for static mode
npm run build
npm run export
```

## 📄 License

MIT License

## 📞 Support

- **Issues**: Submit issue reports on GitHub
- **Development Guide**: Refer to the `CLAUDE.md` file

---

**ProjectDuck** - Making document browsing elegant and efficient 🦆✨