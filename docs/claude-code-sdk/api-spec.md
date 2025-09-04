# Claude Code SDK API 規格文件

## API 概述

Claude Code SDK 提供了一套完整的 TypeScript API，用於與 Claude AI 模型進行程式化互動。主要 API 基於異步迭代器模式，支援流式處理和多回合對話。

## 核心 API

### query Function

主要的 API 入口點，返回異步迭代器以流式處理訊息。

#### 函數簽名

```typescript
function query(params: QueryParams): AsyncIterable<Message>
```

#### QueryParams 介面

```typescript
interface QueryParams {
  prompt?: string;                    // 用戶輸入提示
  messages?: MessageParam[] | AsyncIterable<MessageParam[]>; // 流式輸入訊息
  abortController?: AbortController;  // 中斷控制器
  options?: QueryOptions;            // 查詢選項
}
```

#### QueryOptions 介面

```typescript
interface QueryOptions {
  maxTurns?: number;                 // 最大對話回合數 (預設: 無限制)
  systemPrompt?: string;             // 系統提示詞
  allowedTools?: string[];           // 允許使用的工具列表
  mcpConfig?: string;               // MCP 配置檔案路径
  mcpServers?: McpServer[];         // 自定義 MCP 伺服器
  continue?: QueryResult;           // 繼續先前對話
  resume?: string;                  // 恢復特定會話 ID
  
  // 進階選項
  temperature?: number;             // 模型溫度 (0-1)
  maxTokens?: number;              // 最大 token 數量
  stopSequences?: string[];        // 停止序列
  
  // 權限控制
  allowNetworkAccess?: boolean;    // 允許網路存取
  allowFileSystem?: boolean;       // 允許檔案系統存取
  allowCodeExecution?: boolean;    // 允許程式碼執行
}
```

## 訊息類型

### Message 介面

```typescript
interface Message {
  type: MessageType;
  content: string;
  timestamp?: number;
  metadata?: Record<string, any>;
}

type MessageType = 
  | "result"        // 最終結果
  | "progress"      // 進度更新  
  | "tool_use"      // 工具使用通知
  | "tool_result"   // 工具執行結果
  | "error"         // 錯誤訊息
  | "info"          // 一般資訊
  | "debug";        // 除錯訊息
```

### MessageParam 介面

```typescript
interface MessageParam {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

interface ContentBlock {
  type: "text" | "image";
  text?: string;
  source?: {
    type: "base64";
    media_type: string;
    data: string;
  };
}
```

## 工具系統

### 內建工具

```typescript
type BuiltinTool = 
  | "Bash"          // Shell 命令執行
  | "Read"          // 檔案讀取
  | "Write"         // 檔案寫入
  | "Edit"          // 檔案編輯
  | "MultiEdit"     // 多檔案編輯
  | "Glob"          // 檔案模式匹配
  | "Grep"          // 文字搜尋
  | "WebSearch"     // 網路搜尋
  | "WebFetch"      // 網頁擷取
  | "TodoWrite"     // 任務管理
  | "Task";         // 任務執行
```

### 自定義工具

#### tool Function

```typescript
function tool<T extends z.ZodSchema>(
  name: string,
  description: string,
  schema: T,
  handler: (args: z.infer<T>) => Promise<any> | any
): Tool
```

#### 範例

```typescript
import { tool } from "@anthropic-ai/claude-code";
import { z } from "zod";

const calculateTool = tool(
  "calculate",
  "執行數學計算",
  {
    expression: z.string().describe("數學表達式"),
    precision: z.number().optional().describe("小數位數")
  },
  async ({ expression, precision = 2 }) => {
    try {
      const result = eval(expression);
      return {
        expression,
        result: Number(result.toFixed(precision)),
        success: true
      };
    } catch (error) {
      return {
        expression,
        error: error.message,
        success: false
      };
    }
  }
);
```

## MCP (Model Context Protocol)

### McpServer 介面

```typescript
interface McpServer {
  name: string;
  version: string;
  tools: Tool[];
  resources?: Resource[];
}
```

### createSdkMcpServer Function

```typescript
function createSdkMcpServer(config: McpServerConfig): McpServer

interface McpServerConfig {
  name: string;
  version: string;
  tools: Tool[];
  resources?: Resource[];
  capabilities?: ServerCapabilities;
}
```

#### 範例

```typescript
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-code";

const myServer = createSdkMcpServer({
  name: "custom-tools",
  version: "1.0.0",
  tools: [
    tool("greet", "打招呼", {
      name: z.string().describe("姓名")
    }, async ({ name }) => `你好, ${name}!`)
  ]
});
```

## 會話管理

### QueryResult 介面

```typescript
interface QueryResult {
  sessionId: string;
  messages: Message[];
  metadata: SessionMetadata;
  canContinue: boolean;
}

interface SessionMetadata {
  totalTokens: number;
  totalTurns: number;
  startTime: number;
  endTime?: number;
  tools: string[];
}
```

### 會話操作

```typescript
// 開始新會話
const result = await query({
  prompt: "開始新任務",
  options: { maxTurns: 5 }
});

// 繼續會話
const continuedResult = await query({
  prompt: "繼續任務",
  options: { continue: result }
});

// 恢復會話
const resumedResult = await query({
  prompt: "恢復任務",
  options: { resume: "session-id-123" }
});
```

## 錯誤處理

### 錯誤類型

```typescript
class ClaudeCodeError extends Error {
  code: ErrorCode;
  details?: Record<string, any>;
}

type ErrorCode = 
  | "AUTH_ERROR"        // 認證錯誤
  | "RATE_LIMIT"        // 速率限制
  | "TOOL_ERROR"        // 工具執行錯誤
  | "VALIDATION_ERROR"  // 輸入驗證錯誤
  | "NETWORK_ERROR"     // 網路錯誤
  | "TIMEOUT_ERROR"     // 逾時錯誤
  | "UNKNOWN_ERROR";    // 未知錯誤
```

### 錯誤處理範例

```typescript
try {
  for await (const message of query({
    prompt: "執行任務",
    options: { maxTurns: 3 }
  })) {
    if (message.type === "error") {
      console.error("執行錯誤:", message.content);
      break;
    }
  }
} catch (error) {
  if (error instanceof ClaudeCodeError) {
    switch (error.code) {
      case "AUTH_ERROR":
        console.error("認證失敗，請檢查 API key");
        break;
      case "RATE_LIMIT":
        console.error("請求過於頻繁，請稍後再試");
        break;
      default:
        console.error("未知錯誤:", error.message);
    }
  }
}
```

## 進階功能

### 流式輸入

```typescript
async function* messageStream() {
  yield { role: "user", content: "第一個訊息" };
  await new Promise(resolve => setTimeout(resolve, 1000));
  yield { role: "user", content: "第二個訊息" };
}

for await (const message of query({
  messages: messageStream(),
  options: { maxTurns: 3 }
})) {
  console.log(message);
}
```

### 圖片支援

```typescript
const imageMessage = {
  role: "user" as const,
  content: [
    { type: "text", text: "分析這張圖片" },
    {
      type: "image",
      source: {
        type: "base64",
        media_type: "image/jpeg",
        data: base64ImageData
      }
    }
  ]
};

for await (const message of query({
  messages: [imageMessage],
  options: { maxTurns: 2 }
})) {
  console.log(message);
}
```

### 批次處理

```typescript
async function processBatch(prompts: string[]) {
  const results = await Promise.all(
    prompts.map(async (prompt) => {
      const messages: Message[] = [];
      for await (const message of query({
        prompt,
        options: { maxTurns: 1 }
      })) {
        if (message.type === "result") {
          messages.push(message);
        }
      }
      return messages;
    })
  );
  return results;
}
```

## 效能優化

### 提示詞快取

```typescript
// 使用相同的系統提示詞可以受益於快取
const systemPrompt = "你是專業的程式碼審查員";

for await (const message of query({
  prompt: "審查這個函數",
  options: {
    systemPrompt,
    maxTurns: 1
  }
})) {
  // 處理結果
}
```

### 工具權限控制

```typescript
// 只允許必要的工具以提高效能和安全性
const readOnlyTools = ["Read", "Grep", "Glob"];

for await (const message of query({
  prompt: "分析程式碼品質",
  options: {
    allowedTools: readOnlyTools,
    maxTurns: 2
  }
})) {
  // 處理結果
}
```

## 認證配置

### 環境變數

```typescript
// Anthropic API
process.env.ANTHROPIC_API_KEY = "sk-ant-...";

// Amazon Bedrock
process.env.CLAUDE_CODE_USE_BEDROCK = "1";
process.env.AWS_ACCESS_KEY_ID = "your-access-key";
process.env.AWS_SECRET_ACCESS_KEY = "your-secret-key";
process.env.AWS_REGION = "us-west-2";

// Google Vertex AI  
process.env.CLAUDE_CODE_USE_VERTEX = "1";
process.env.GOOGLE_APPLICATION_CREDENTIALS = "/path/to/credentials.json";
```

### 程式化配置

```typescript
import { query, setApiKey, setProvider } from "@anthropic-ai/claude-code";

// 設定 API key
setApiKey("sk-ant-...");

// 設定供應商
setProvider("bedrock", {
  region: "us-west-2",
  accessKeyId: "...",
  secretAccessKey: "..."
});
```

## 型別定義匯出

```typescript
// 主要介面
export interface QueryParams { /* ... */ }
export interface QueryOptions { /* ... */ }
export interface Message { /* ... */ }
export interface MessageParam { /* ... */ }

// 工具相關
export interface Tool { /* ... */ }
export interface McpServer { /* ... */ }

// 錯誤處理
export class ClaudeCodeError extends Error { /* ... */ }
export type ErrorCode = /* ... */;

// 主要函數
export function query(params: QueryParams): AsyncIterable<Message>;
export function tool<T>(name: string, description: string, schema: T, handler: Function): Tool;
export function createSdkMcpServer(config: McpServerConfig): McpServer;

// 工具函數
export function setApiKey(key: string): void;
export function setProvider(provider: string, config: any): void;
```

## 版本兼容性

| SDK 版本 | Node.js | TypeScript | 說明 |
|---------|---------|------------|------|
| 1.0.x   | >= 18   | >= 4.5     | 當前版本 |
| 0.9.x   | >= 16   | >= 4.0     | 已棄用 |

## API 速率限制

| 認證方式 | 每分鐘請求數 | 每小時 Token 數 |
|---------|-------------|---------------|
| Anthropic API | 1000 | 100,000 |
| Bedrock | 依 AWS 限制 | 依 AWS 限制 |
| Vertex AI | 依 GCP 限制 | 依 GCP 限制 |

## 最佳實務建議

1. **使用適當的 maxTurns**: 避免無限循環
2. **選擇性工具權限**: 僅啟用必要工具
3. **錯誤處理**: 實作完整錯誤處理機制
4. **資源管理**: 適當使用 AbortController
5. **快取策略**: 重複使用相同系統提示詞