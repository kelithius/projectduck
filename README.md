# ProjectDuck

> Project Document 的諧音 - 一個專為文件檢視而設計的 Web 應用程式

ProjectDuck 是一個基於 Web 的檔案瀏覽器，專門用來檢視 server 端指定目錄中的文件檔案與內容。此專案旨在提供一個直觀、功能豐富的文件檢視平台，特別針對 Markdown 文件提供增強的顯示功能。

## 功能特色

- 🌳 **檔案樹狀瀏覽**: 直觀的目錄結構顯示，支援展開/收縮
- 📝 **Markdown 渲染**: 完整支援 GitHub Flavored Markdown (GFM)
- 🎨 **語法高亮**: 程式碼區塊的語法高亮顯示
- 🖼️ **多媒體支援**: 圖片、影片檔案的直接檢視
- 📊 **圖表渲染**: 支援 Mermaid 和 PlantUML 圖表 (規劃中)
- 📱 **響應式設計**: 支援桌面和平板裝置
- 🔍 **檔案搜尋**: 快速搜尋檔案名稱
- 📁 **檔案類型圖示**: 不同檔案類型的視覺化標示

## 技術架構

### 後端
- **Node.js** + **Express** + **TypeScript**
- RESTful API 設計
- 路徑安全驗證，防止路徑穿越攻擊
- 支援檔案大小限制與錯誤處理

### 前端
- **React 18** + **TypeScript**
- **Ant Design** UI 組件庫
- **Vite** 建置工具
- **react-markdown** Markdown 渲染
- **react-split-pane** 可調整分割面板

## 快速開始

### 前置需求
- Node.js >= 18.0
- npm 或 yarn

### 安裝與執行

1. **克隆專案**
   ```bash
   git clone <repository-url>
   cd ProjectDuck
   ```

2. **安裝後端依賴**
   ```bash
   cd backend
   npm install
   ```

3. **安裝前端依賴**
   ```bash
   cd ../frontend
   npm install
   ```

4. **啟動後端服務** (在 `backend` 目錄)
   ```bash
   npm run dev
   ```
   後端將在 http://localhost:3001 啟動

5. **啟動前端應用** (在 `frontend` 目錄)
   ```bash
   npm run dev
   ```
   前端將在 http://localhost:3000 啟動

### 環境變數設定

在 `backend` 目錄下可創建 `.env` 檔案來設定環境變數：

```env
PORT=3001
BASE_PATH=/path/to/your/documents
FRONTEND_URL=http://localhost:3000
```

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