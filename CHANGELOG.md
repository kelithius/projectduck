# Changelog

All notable changes to ProjectDuck will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2025-10-15]

### Changed

- **refactor**: Translate all Chinese comments to English and remove pointless try-catch blocks
- **feat**: Implement comprehensive code quality improvements and development workflow
- **chore**: Add prettier as dev dependency for code formatting

## [2025-10-14]

### Added

- **feat**: Add Markmap mind map preview support for Markdown files
- **feat**: Add ENABLE_CLAUDE_CODE feature flag with configuration (default: disabled)

## [2025-09-09]

### Changed

- **refactor**: Implement unified design system and resolve CSS style dispersion
- **fix**: Fix critical security vulnerabilities and memory leaks
- **refactor**: Restructure Docker configuration and add Claude Code integration

## [2025-09-05]

### Fixed

- **fix**: Add 'session' to StreamEvent type definition (TypeScript error)
- **fix**: Fix session ID management and browser isolation
- **fix**: Fix Claude Code session isolation and API improvements

## [2025-09-04]

### Added

- **feat**: Implement file context awareness and improve ChatPanel UI
- **feat**: Add Claude Code chat integration with three-pane layout

### Fixed

- **fix**: Fix ChatPanel state persistence, visual layering, and error handling
- **fix**: Fix Claude SDK conversation continuity and enhance ChatPanel UI
- **fix**: Implement comprehensive UI improvements and fix real-time file watching
- **fix**: Fix file watching SSE issues and add no-cache headers

## [2025-08-11]

### Added

- **feat**: Implement enhanced search functionality with smart expansion
- **feat**: Implement projects.json hot reload with Docker multi-platform support
- **feat**: Add Docker containerization with fail-fast configuration system
- **feat**: Add multi-project management system

### Changed

- **refactor**: Improve search UI by replacing Search with Input component
- **docs**: Update README.md project structure and remove ignored files

### Fixed

- **fix**: Fix SVG display and enhance search functionality
- **fix**: Fix file size display showing 0 B for all files
- **fix**: Fix comprehensive i18n implementation and remove hardcoded text
- **fix**: Fix project sidebar alignment and selected project behavior

## [2025-08-09]

### Added

- **feat**: Add scrollbar support to FileTree for long directory listings

### Changed

- **refactor**: Migrate from React+Express to Next.js with SSR
- **refactor**: Optimize performance and clean up codebase
- **refactor**: Improve FileTree UI and performance
- **refactor**: Consolidate frontend and backend architecture with i18n support

## [2025-08-08]

### Added

- **feat**: Complete dark theme adaptation for all UI components
- **feat**: Implement initial ProjectDuck application
- **chore**: Add .gitignore

---

## Legend

- **feat**: New feature
- **fix**: Bug fix
- **refactor**: Code refactoring
- **docs**: Documentation changes
- **chore**: Maintenance tasks
- **perf**: Performance improvements
