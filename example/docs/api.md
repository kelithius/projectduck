# API 文件

ProjectDuck 後端 API 文件說明。

## 基本資訊

- **Base URL**: `http://localhost:3001/api`
- **Content-Type**: `application/json`
- **認證**: 目前無需認證

## 端點說明

### 取得目錄內容

```http
GET /directory?path={path}
```

**參數**:
- `path` (string, optional): 目錄路徑，預設為根目錄

**回應**:
```json
{
  "success": true,
  "data": {
    "path": "/example",
    "items": [
      {
        "name": "README.md",
        "path": "/example/README.md",
        "type": "file",
        "size": 1024,
        "modified": "2025-08-08T10:00:00Z",
        "extension": "md"
      }
    ]
  }
}
```

### 取得檔案內容

```http
GET /file/content?path={path}
```

**參數**:
- `path` (string, required): 檔案路徑

**回應**:
```json
{
  "success": true,
  "data": {
    "content": "檔案內容...",
    "encoding": "utf-8"
  }
}
```

### 取得檔案資訊

```http
GET /file/info?path={path}
```

**參數**:
- `path` (string, required): 檔案路徑

**回應**:
```json
{
  "success": true,
  "data": {
    "name": "example.txt",
    "path": "/example/example.txt",
    "size": 1024,
    "modified": "2025-08-08T10:00:00Z",
    "extension": "txt"
  }
}
```

### 取得原始檔案

```http
GET /file/raw?path={path}
```

**參數**:
- `path` (string, required): 檔案路徑

**回應**: 直接回傳檔案內容，適用於圖片、影片等二進制檔案。

### 健康檢查

```http
GET /health
```

**回應**:
```json
{
  "status": "ok",
  "timestamp": "2025-08-08T10:00:00Z",
  "basePath": "/Users/Keith/Workspace/ProjectDuck/example"
}
```

## 錯誤處理

所有 API 錯誤都會回傳以下格式：

```json
{
  "success": false,
  "error": "錯誤訊息",
  "code": "ERROR_CODE"
}
```

常見錯誤碼：
- `FILE_NOT_FOUND`: 檔案不存在
- `ACCESS_DENIED`: 存取被拒絕
- `INVALID_PATH`: 無效的路徑
- `READ_ERROR`: 讀取錯誤

## 使用範例

### JavaScript Fetch

```javascript
// 取得目錄內容
const response = await fetch('/api/directory?path=/example');
const data = await response.json();

if (data.success) {
  console.log('目錄內容:', data.data.items);
} else {
  console.error('錯誤:', data.error);
}
```

### cURL

```bash
# 取得檔案內容
curl "http://localhost:3001/api/file/content?path=/example/README.md"

# 取得目錄內容
curl "http://localhost:3001/api/directory?path=/example/docs"
```

---

**版本**: v1.0  
**更新時間**: 2025-08-08  
**維護者**: ProjectDuck Team