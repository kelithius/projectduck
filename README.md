# ProjectDuck 🦆

> Project Document 的諧音 - 一個專為文件檢視而設計的 Web 應用程式

ProjectDuck 是一個基於 Web 的檔案瀏覽器，專門用來檢視 server 端指定目錄中的文件檔案與內容。此專案旨在提供一個直觀、功能豐富的文件檢視平台，特別針對 Markdown 文件提供增強的顯示功能。

## 功能特色

- 📁 **檔案瀏覽** - 樹狀結構瀏覽檔案系統，支援點擊展開/收折
- 📄 **Markdown 支援** - 完整的 GitHub Flavored Markdown 渲染
- 🎨 **語法高亮** - 支援多種程式語言的語法高亮顯示
- 📊 **Mermaid 圖表** - 支援 Mermaid 圖表渲染
- 🌓 **主題切換** - 支援淺色/深色模式切換
- 🔍 **檔案搜尋** - 快速搜尋檔案名稱
- 📱 **響應式設計** - 適配不同螢幕尺寸
- 📁 **檔案類型圖示** - 不同檔案類型的視覺化標示

## 技術架構

### 整合式架構
- **單一服務部署** - 前後端整合，簡化部署流程
- **Node.js** + **Express** + **TypeScript** 後端
- **React 18** + **TypeScript** + **Vite** 前端
- **Ant Design** UI 組件庫
- **react-markdown** + **Mermaid** 文件渲染

## 快速開始

### 前置需求
- Node.js >= 18.0
- npm 或 yarn

### 安裝依賴

```bash
npm install
```

### 開發模式

```bash
# 同時啟動前端開發伺服器和後端 API
npm run dev
```

- 前端開發伺服器: http://localhost:3000
- 後端 API 伺服器: http://localhost:3001

### 生產部署

```bash
# 構建前端和後端
npm run build

# 啟動生產伺服器
npm start
```

訪問: http://localhost:3001

## 環境變數

- `BASE_PATH`: 指定要瀏覽的根目錄（預設為 `./example`）
- `PORT`: 伺服器端口（預設為 3001）
- `FRONTEND_URL`: 前端 URL（開發模式使用，預設為 http://localhost:3000）

## 項目結構

```
ProjectDuck/
├── backend/           # 後端 API 代碼
│   ├── src/
│   │   ├── routes/    # API 路由
│   │   ├── services/  # 業務邏輯
│   │   └── types/     # TypeScript 類型定義
│   └── dist/          # 後端編譯輸出
├── client/            # 前端 React 代碼
│   ├── src/
│   │   ├── components/ # React 組件
│   │   ├── services/   # API 服務
│   │   └── types/      # 前端類型定義
│   └── vite.config.ts  # Vite 配置
├── public/            # 前端打包後的靜態檔案
├── example/           # 示例檔案目錄
└── docs/             # 項目文檔
```

## 可用腳本

- `npm run dev` - 開發模式（前後端同時啟動）
- `npm run build` - 構建生產版本
- `npm start` - 啟動生產伺服器
- `npm run lint` - 代碼檢查
- `npm run type-check` - TypeScript 類型檢查
- `npm run clean` - 清理構建檔案

## API 端點

| 方法 | 端點 | 描述 |
|------|------|------|
| `GET` | `/api/directory?path=<路徑>` | 取得目錄結構 |
| `GET` | `/api/file/content?path=<路徑>` | 取得檔案文字內容 |
| `GET` | `/api/file/info?path=<路徑>` | 取得檔案基本資訊 |
| `GET` | `/api/file/raw?path=<路徑>` | 取得原始檔案 (二進位) |
| `GET` | `/health` | 健康檢查 |

## 專案結構

```
ProjectDuck/
├── backend/                    # Node.js API 服務
│   ├── src/
│   │   ├── routes/            # API 路由
│   │   ├── services/          # 業務邏輯
│   │   ├── middleware/        # 中間件
│   │   ├── types/            # TypeScript 類型
│   │   └── app.ts            # Express 應用入口
│   ├── package.json
│   └── tsconfig.json
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── components/        # React 組件
│   │   ├── hooks/            # 自訂 Hooks
│   │   ├── services/         # API 服務
│   │   ├── types/           # TypeScript 類型
│   │   └── App.tsx          # 應用入口
│   ├── package.json
│   └── tsconfig.json
├── docs/                      # 專案文件
├── .gitignore
└── README.md
```

## 開發指令

### 後端
```bash
npm run dev      # 開發模式 (使用 nodemon)
npm run build    # 建置 TypeScript
npm run start    # 生產模式執行
npm run lint     # ESLint 檢查
npm run type-check # TypeScript 類型檢查
```

### 前端
```bash
npm run dev      # 開發伺服器
npm run build    # 生產建置
npm run preview  # 預覽建置結果
npm run lint     # ESLint 檢查
npm run type-check # TypeScript 類型檢查
```

## 支援的檔案格式

| 類型 | 格式 | 功能 |
|------|------|------|
| **Markdown** | `.md`, `.markdown` | 完整 GFM 渲染、語法高亮 |
| **程式碼** | `.js`, `.ts`, `.py`, `.java`, etc. | 語法高亮顯示 |
| **文字** | `.txt`, `.json`, `.xml`, `.csv` | 純文字顯示 |
| **圖片** | `.jpg`, `.png`, `.gif`, `.svg` | 直接顯示 |
| **影片** | `.mp4`, `.webm`, `.mov` | 內嵌播放器 |

## 安全性

- **路徑驗證**: 防止路徑穿越攻擊
- **檔案大小限制**: 最大支援 10MB 檔案
- **CORS 設定**: 嚴格的跨域存取控制
- **輸入驗證**: 所有 API 輸入參數驗證

## 開發路線圖

- [x] 基礎檔案瀏覽功能
- [x] Markdown 渲染與語法高亮
- [x] 多媒體檔案支援
- [ ] Mermaid 圖表渲染
- [ ] PlantUML 圖表支援
- [ ] Markdown Section 折疊功能
- [ ] 檔案內容搜尋
- [ ] 主題切換 (深色模式)
- [ ] PWA 支援

## 授權

MIT License

## 貢獻

歡迎提交 Issues 和 Pull Requests！

---

**ProjectDuck** - 讓文件檢視更加優雅 🦆