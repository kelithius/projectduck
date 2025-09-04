# Claude Code SDK 功能說明文件

## 概述

`@anthropic-ai/claude-code` 是 Anthropic 開發的 AI 輔助編程工具 SDK，提供了在終端、IDE 和 GitHub 中與 Claude AI 模型互動的能力。這個 SDK 建立在 Claude Code 的代理框架之上，為開發者提供了構建生產級 AI 代理所需的所有構建模塊。

## 主要特色

### 🚀 核心功能
- **自然語言編程**: 使用自然語言命令執行編程任務
- **程式碼理解**: 深度理解程式碼庫結構和邏輯
- **任務自動化**: 自動執行常規編程任務
- **Git 工作流程**: 處理版本控制操作
- **多回合對話**: 支援持續對話和上下文保持

### 🛠 技術特性
- **零依賴**: 輕量級設計，無外部依賴
- **TypeScript 支援**: 完整的型別定義和 IntelliSense 支援
- **流式處理**: 即時消息流處理
- **工具生態系統**: 豐富的內建工具和 MCP 擴展性
- **權限控制**: 細粒度的代理能力控制

## 安裝

### 全域安裝 (推薦)
```bash
npm install -g @anthropic-ai/claude-code
```

### 專案內安裝
```bash
npm install @anthropic-ai/claude-code
```

## 基本使用

### 命令列介面
安裝後，在專案目錄中執行：
```bash
claude
```

### TypeScript SDK

#### 基本範例
```typescript
import { query } from "@anthropic-ai/claude-code";

for await (const message of query({
  prompt: "分析系統效能並提供優化建議",
  options: {
    maxTurns: 5,
    systemPrompt: "你是一位效能工程師",
    allowedTools: ["Bash", "Read", "WebSearch"]
  }
})) {
  if (message.type === "result") {
    console.log(message.result);
  }
}
```

#### 中斷控制
```typescript
import { query } from "@anthropic-ai/claude-code";

const abortController = new AbortController();

// 5 秒後中斷操作
setTimeout(() => abortController.abort(), 5000);

for await (const message of query({
  prompt: "執行長時間任務",
  abortController,
  options: { maxTurns: 10 }
})) {
  // 處理消息...
}
```

### 多回合對話

#### 繼續對話
```typescript
import { query } from "@anthropic-ai/claude-code";

// 第一回合
const firstResponse = await query({
  prompt: "幫我創建一個 React 元件",
  options: { maxTurns: 3 }
});

// 繼續對話
for await (const message of query({
  prompt: "現在加入 TypeScript 類型定義",
  options: { 
    continue: firstResponse,
    maxTurns: 2 
  }
})) {
  if (message.type === "result") {
    console.log(message.result);
  }
}
```

#### 流式輸入模式 (支援圖片)
```typescript
import { query } from "@anthropic-ai/claude-code";

async function* messageGenerator() {
  yield { role: "user", content: "分析這個設計圖" };
  yield { 
    role: "user", 
    content: [
      { type: "text", text: "請根據這個 UI mockup 實作元件" },
      { type: "image", source: { type: "base64", media_type: "image/png", data: imageBase64 } }
    ]
  };
}

for await (const message of query({
  messages: messageGenerator(),
  options: { maxTurns: 5 }
})) {
  // 處理回應...
}
```

## 自定義工具與 MCP

### SDK MCP 伺服器
```typescript
import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-code";
import { z } from "zod";

const customServer = createSdkMcpServer({
  name: "my-custom-tools",
  version: "1.0.0",
  tools: [
    tool(
      "calculate_compound_interest",
      "計算複利投資回報",
      {
        principal: z.number().describe("初始投資金額"),
        rate: z.number().describe("年利率 (小數)"),
        time: z.number().describe("投資年期"),
        n: z.number().default(12).describe("每年複利次數")
      },
      async (args) => {
        const { principal, rate, time, n } = args;
        const amount = principal * Math.pow(1 + rate / n, n * time);
        return {
          principal,
          finalAmount: amount,
          totalInterest: amount - principal,
          effectiveRate: Math.pow(amount / principal, 1 / time) - 1
        };
      }
    )
  ]
});

// 使用自定義工具
for await (const message of query({
  prompt: "計算投資 100000 元，年利率 5%，10 年後的回報",
  options: {
    mcpServers: [customServer],
    allowedTools: ["calculate_compound_interest"]
  }
})) {
  console.log(message);
}
```

### MCP 整合範例 (SRE 監控)
```typescript
import { query } from "@anthropic-ai/claude-code";

for await (const message of query({
  prompt: "調查支付服務中斷問題",
  options: {
    mcpConfig: "sre-tools.json",
    allowedTools: ["mcp__datadog", "mcp__pagerduty", "mcp__kubernetes"],
    systemPrompt: "你是一位 SRE 工程師，使用監控數據診斷問題",
    maxTurns: 4
  }
})) {
  if (message.type === "result") {
    console.log(message.result);
  }
}
```

## 認證設定

### Anthropic API
```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

### Amazon Bedrock
```bash
export CLAUDE_CODE_USE_BEDROCK=1
# 配置 AWS 認證
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-west-2"
```

### Google Vertex AI
```bash
export CLAUDE_CODE_USE_VERTEX=1
# 配置 Google Cloud 認證
export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"
```

## SDK 功能完整列表

### 🏗 核心 API 功能
- **query()**: 主要查詢函數，支援異步迭代器
- **tool()**: 創建自定義工具
- **createSdkMcpServer()**: 創建 MCP 伺服器
- **setApiKey()**: 設定 API 金鑰  
- **setProvider()**: 配置服務供應商

### 📁 檔案系統工具
- **Read**: 讀取檔案內容，支援分頁和偏移
- **Write**: 寫入檔案，支援覆寫模式  
- **Edit**: 精確編輯檔案內容
- **MultiEdit**: 批次編輯多個檔案
- **Glob**: 檔案模式匹配和搜尋
- **Grep**: 文字內容搜尋，支援正則表達式

### 🖥 系統執行工具
- **Bash**: 執行 shell 命令，支援背景執行
- **Task**: 啟動專用代理執行複雜任務
- **BashOutput**: 獲取背景 shell 輸出
- **KillBash**: 終止背景 shell 進程

### 🌐 網路工具
- **WebSearch**: 網路搜尋功能
- **WebFetch**: 獲取網頁內容並處理

### 🛠 開發輔助工具
- **TodoWrite**: 任務管理和追蹤
- **ExitPlanMode**: 計劃模式管理

### 🧩 MCP (Model Context Protocol) 支援
- **SDK MCP 伺服器**: 在應用程序進程中直接執行的自定義工具
- **工具註冊**: 動態註冊和管理自定義工具
- **型別安全**: 使用 Zod schemas 進行參數驗證

### 🔧 配置與管理功能
- **會話管理**: 多回合對話、會話恢復
- **權限控制**: 細粒度工具權限管理  
- **錯誤處理**: 完整的錯誤類型和處理機制
- **流式處理**: 即時消息流和進度更新
- **中斷控制**: AbortController 支援
- **認證管理**: 多供應商認證支援 (Anthropic API、Bedrock、Vertex AI)

### 📊 訊息與通信
- **多種訊息類型**: result, progress, tool_use, error, info, debug
- **流式輸入**: 支援異步生成器輸入
- **圖片支援**: Base64 圖片附件處理
- **多媒體內容**: 文字、圖片混合內容支援

### 🎯 進階功能
- **提示詞快取**: 自動優化重複查詢效能
- **批次處理**: 並行處理多個查詢  
- **會話持久化**: 跨請求保持對話上下文
- **工具權限細化**: 選擇性啟用特定工具

## 配置選項

### QueryOptions 介面
```typescript
interface QueryOptions {
  maxTurns?: number;           // 最大對話回合數
  systemPrompt?: string;       // 系統提示詞
  allowedTools?: string[];     // 允許使用的工具列表
  mcpConfig?: string;          // MCP 配置檔案路径
  mcpServers?: McpServer[];    // 自定義 MCP 伺服器
  continue?: QueryResult;      // 繼續先前對話
  resume?: string;            // 恢復特定會話
}
```

### 訊息類型
```typescript
type MessageType = 
  | "result"        // 最終結果
  | "progress"      // 進度更新
  | "tool_use"      // 工具使用
  | "error"         // 錯誤信息
  | "info";         // 一般信息
```

## 最佳實務

### 1. 權限控制
```typescript
// 限制可用工具，提高安全性
for await (const message of query({
  prompt: "分析程式碼品質",
  options: {
    allowedTools: ["Read", "Grep"],  // 僅允許唯讀工具
    maxTurns: 3
  }
})) {
  // ...
}
```

### 2. 錯誤處理
```typescript
try {
  for await (const message of query({
    prompt: "執行可能失敗的任務",
    options: { maxTurns: 5 }
  })) {
    if (message.type === "error") {
      console.error("任務執行錯誤:", message.content);
      break;
    }
  }
} catch (error) {
  console.error("SDK 錯誤:", error);
}
```

### 3. 效能優化
```typescript
// 使用合適的 maxTurns 避免無限循環
const result = await query({
  prompt: "簡單的程式碼解釋",
  options: { 
    maxTurns: 1,  // 單回合任務
    systemPrompt: "提供簡潔的解釋"
  }
});
```

## 隱私與資料處理

- **使用回饋收集**: SDK 會收集使用回饋以改善服務
- **資料保存期限**: 使用者回饋記錄保存 30 天
- **訓練資料政策**: 不會使用回饋資料訓練生成模型
- **透明度**: 提供清晰的隱私保護說明

## 疑難排解

### 常見問題

1. **認證失敗**
   ```bash
   # 檢查 API key 是否正確設定
   echo $ANTHROPIC_API_KEY
   ```

2. **工具權限錯誤**
   ```typescript
   // 確保 allowedTools 包含所需工具
   options: {
     allowedTools: ["Bash", "Read", "Write"]
   }
   ```

3. **會話恢復問題**
   ```typescript
   // 確保 continue 物件來自先前的查詢結果
   const firstResult = await query(/* ... */);
   const secondResult = await query({
     prompt: "繼續任務",
     options: { continue: firstResult }
   });
   ```

### 回報問題

在 Claude Code 中使用 `/bug` 命令回報問題，或在 GitHub 上提交 issue。

## 版本資訊

- **當前版本**: 1.0.103
- **Node.js 需求**: 18+
- **TypeScript 支援**: 完整支援
- **更新頻率**: 頻繁更新 (Beta 階段)

## 相關資源

- [Claude Code 官方文件](https://docs.anthropic.com/en/docs/claude-code)
- [NPM Package](https://www.npmjs.com/package/@anthropic-ai/claude-code)
- [Anthropic API 文件](https://docs.anthropic.com)
- [GitHub Repository](https://github.com/anthropics)