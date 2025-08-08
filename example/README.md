# ProjectDuck 示例目錄

這是 ProjectDuck 的示例目錄，包含各種文件類型來測試應用程式的功能。

## 目錄結構

- `docs/` - 各種文件檔案
- `code/` - 程式碼檔案示例
- `data/` - 資料檔案 (JSON, CSV 等)
- `media/` - 多媒體檔案
- `config/` - 配置檔案

## 功能測試項目

### ✅ Markdown 渲染
- [x] 基本 Markdown 語法
- [x] GitHub Flavored Markdown
- [x] 程式碼語法高亮
- [x] 表格支援
- [x] 連結和圖片

### 🔧 語法高亮
- [x] JavaScript/TypeScript
- [x] Python
- [x] JSON
- [x] CSS/HTML
- [x] Shell Script

### 📊 圖表支援
- [ ] Mermaid 圖表
- [ ] PlantUML 圖表

### 🎨 主題切換
- [x] Light/Dark Mode
- [x] 語法高亮主題適配

## 程式碼示例

```javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10)); // 55
```

```python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)
```

## 表格示例

| 功能 | 狀態 | 優先級 |
|------|------|--------|
| 檔案瀏覽 | ✅ 完成 | 高 |
| Markdown 渲染 | ✅ 完成 | 高 |
| 語法高亮 | ✅ 完成 | 高 |
| 圖表支援 | 🔄 進行中 | 中 |

## 連結測試

- [內部連結：程式碼示例](./code/example.js)
- [文件連結：API 文件](./docs/api.md)
- [外部連結：GitHub](https://github.com)

---

**測試完成項目**: Markdown 基本功能、語法高亮、主題切換  
**待測試項目**: 圖表渲染、多媒體檔案、檔案樹互動