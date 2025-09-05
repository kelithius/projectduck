# Deprecated API: /api/claude/chat

This API endpoint has been **deprecated** in favor of the new simplified architecture.

## Migration Information

- **Old Endpoint**: `POST /api/claude/chat`
- **New Endpoint**: `POST /api/claude/query`
- **Architecture**: Simplified Claude Code SDK integration
- **Session Management**: Now handled directly by Claude Code SDK with `resumeSessionId`

## Key Changes

1. **No Server-Side Session State**: The server no longer maintains conversation history
2. **Client Session ID**: Each tab/reload gets a unique `clientSessionId` 
3. **Claude SDK Resume**: Uses native Claude Code SDK resume functionality
4. **Simplified Flow**: Direct SDK communication without abstraction layers

## Status

- ❌ **Deprecated**: This endpoint is no longer maintained
- 🔄 **Replacement**: Use `/api/claude/query` instead
- 📅 **Deprecated Date**: 2025-01-08
- 🗑️ **Removal Schedule**: Will be removed in next major version

## File Status

The `route.ts` file in this directory should be considered legacy code and will be removed in a future cleanup.