# ProjectDuck

> Project Document 的諧音 - 一個專為文件檢視而設計的 Next.js Web 應用程式

ProjectDuck 是一個現代化的檔案瀏覽器和文件檢視器，基於 Next.js 15 全棧框架構建。它提供直觀的雙面板介面，專門用於檢視和瀏覽伺服器端指定目錄中的文件內容，特別針對 Markdown 文件提供豐富的渲染功能。

## ✨ 主要特色

- **🎯 現代化全棧架構**: 基於 Next.js 15 + App Router，支援 SSR/SSG
- **🎨 直觀雙面板設計**: 左側檔案樹 + 右側內容檢視器，可調整分割比例
- **📝 強化 Markdown 支援**: GitHub Flavored Markdown + Mermaid 圖表渲染
- **🎭 主題切換**: 深色/淺色模式，基於 Ant Design 主題系統
- **🌐 國際化支援**: 預設繁體中文，支援多語言切換
- **⚡ 效能優化**: API 響應緩存、懶載入、動態導入
- **🔍 智能搜尋**: 檔案樹即時搜尋與過濾功能
- **📱 響應式設計**: 適配桌面、平板等不同螢幕尺寸

## 🚀 技術棧

### 核心框架
- **Next.js 15.4.6** - 全棧 React 框架 (App Router + API Routes)
- **React 18.3.1** - 現代化前端函式庫
- **TypeScript 5.x** - 靜態類型支援

### UI 與樣式
- **Ant Design 5.26.7** - 企業級 UI 組件庫
- **Allotment 1.20.4** - 可調整分割面板
- **Tailwind CSS 4** - 實用優先的 CSS 框架
- **CSS Modules** - 組件樣式隔離

### 內容渲染
- **react-markdown 10.1.0** - Markdown 轉 React 組件
- **remark-gfm 4.0.1** - GitHub Flavored Markdown 支援
- **react-syntax-highlighter 15.6.1** - 程式碼語法高亮
- **rehype-highlight 7.0.2** - Markdown 內程式碼高亮
- **Mermaid** - 流程圖與圖表渲染

### 國際化與工具
- **next-i18next 15.4.2** - Next.js 國際化支援
- **i18next 25.3.2** - 多語言框架
- **fs-extra 11.3.1** - 增強版檔案系統操作
- **mime-types 3.0.1** - MIME 類型檢測

## 🎯 支援的檔案格式

| 檔案類型 | 支援功能 |
|----------|----------|
| **Markdown** (`.md`, `.markdown`) | GFM 語法、表格、任務清單、語法高亮、Mermaid 圖表 |
| **程式碼檔案** | JavaScript, TypeScript, Python, Java, C++, Go, Rust 等 190+ 語言 |
| **JSON** | 格式化顯示與語法高亮 |
| **圖片** | JPG, PNG, GIF, SVG, WebP 等格式 |
| **影片** | MP4, WebM, MOV 等瀏覽器支援格式 |
| **純文字** | TXT, LOG 等文字檔案 |

## 🏗️ 專案結構

```
ProjectDuck/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API 路由 (取代 Express 後端)
│   │   ├── layout.tsx         # 根佈局
│   │   └── page.tsx          # 首頁
│   ├── components/
│   │   ├── layout/AppLayout.tsx      # 主應用佈局
│   │   ├── fileTree/FileTree.tsx     # 檔案樹組件
│   │   ├── contentViewer/           # 內容檢視器群組
│   │   └── WarningSupressor.tsx    # SSR 水合警告處理
│   ├── lib/
│   │   ├── services/          # API 與工具服務
│   │   ├── providers/         # Context Providers
│   │   ├── i18n/             # 國際化配置
│   │   └── types.ts          # TypeScript 類型定義
│   └── styles/               # 全域樣式
├── public/                   # 靜態資源
├── example/                  # 範例檔案目錄
├── docs/                     # 專案文件
├── next.config.ts           # Next.js 配置
├── next-i18next.config.js   # 國際化配置
└── CLAUDE.md               # Claude Code 開發指南
```

## 🚀 快速開始

### 環境需求
- Node.js 18.0 或更高版本
- npm, yarn, pnpm 或 bun

### 安裝與運行

1. **安裝相依套件**
```bash
npm install
# 或
yarn install
# 或
pnpm install
```

2. **啟動開發伺服器**
```bash
npm run dev
# 或
yarn dev
# 或 
pnpm dev
```

3. **開啟瀏覽器**
前往 [http://localhost:3000](http://localhost:3000) 檢視應用程式

### 可用指令

```bash
# 開發模式 (支援 Turbopack)
npm run dev

# 生產建置
npm run build

# 啟動生產伺服器
npm start

# 程式碼檢查
npm run lint
```

## ⚙️ 配置

### 環境變數
在 `next.config.ts` 中配置：
```typescript
env: {
  BASE_PATH: process.env.BASE_PATH || '/path/to/your/files',
}
```

### 國際化設定
在 `next-i18next.config.js` 中配置語言：
```javascript
module.exports = {
  i18n: {
    defaultLocale: 'zh_tw',    // 預設繁體中文
    locales: ['en', 'zh_tw'],  // 支援語言
  },
}
```

### 瀏覽目錄
預設瀏覽 `/example` 目錄中的檔案，可透過環境變數 `BASE_PATH` 修改。

## 🎨 功能特色

### 雙面板設計
- **左側**: 檔案樹瀏覽器，支援展開/收縮、搜尋過濾
- **右側**: 動態內容檢視器，根據檔案類型自動切換渲染模式
- **可調整**: 透過拖拉調整左右面板寬度比例

### Markdown 增強功能
- ✅ GitHub Flavored Markdown 完整支援
- ✅ 程式碼區塊語法高亮 (190+ 語言)
- ✅ Mermaid 圖表自動渲染 (流程圖、序列圖、甘特圖等)
- ✅ 表格、任務清單、刪除線等擴展語法
- 🟡 Section 折疊功能 (開發中)

### 效能與體驗
- **API 緩存**: 智能緩存機制減少重複請求
- **懶載入**: 檔案樹與組件動態載入
- **響應式**: 適配不同螢幕尺寸
- **主題切換**: 一鍵切換深色/淺色模式
- **搜尋功能**: 即時檔案名稱搜尋與高亮

## 🔧 開發指南

### 開發工具配置
- **TypeScript**: 嚴格模式，路徑別名 `@/*`
- **ESLint**: Next.js + TypeScript 規則集
- **Tailwind CSS**: 與 Ant Design 共存配置

### 新增檔案類型支援
在 `src/components/contentViewer/ContentViewer.tsx` 中新增處理邏輯：

```typescript
const getContentType = (file: FileItem) => {
  if (file.extension === '.your-extension') {
    return 'your-custom-type';
  }
  // ... 其他類型判斷
};
```

### API Routes 開發
在 `src/app/api/` 目錄下建立新的路由檔案：

```typescript
// src/app/api/your-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // 處理邏輯
  return NextResponse.json({ success: true, data: result });
}
```

## 🚢 部署

### Vercel (推薦)
1. 連結 GitHub 儲存庫到 Vercel
2. 自動檢測 Next.js 專案並部署
3. 設定環境變數 `BASE_PATH`

### Docker 部署
```bash
# 建置 Docker 映像
docker build -t project-duck .

# 運行容器
docker run -p 3000:3000 -e BASE_PATH=/your/path project-duck
```

### 靜態輸出 (限制功能)
```bash
# 配置 next.config.ts 為靜態模式
npm run build
npm run export
```

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📄 授權

MIT License

## 📞 支援

- **Issue**: 在 GitHub 上提交問題回報
- **文件**: 查看 `docs/` 目錄中的詳細文件
- **開發指南**: 參考 `CLAUDE.md` 文件

---

**ProjectDuck** - 讓文件瀏覽變得優雅而高效 🦆✨