/**
 * ProjectDuck - 檔案瀏覽器示例程式碼
 * JavaScript 語法高亮測試
 */

// ES6+ 功能示例
const API_BASE_URL = '/api';

class FileService {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * 取得目錄內容
   * @param {string} path - 目錄路徑
   * @returns {Promise<Object>} 目錄內容
   */
  async getDirectory(path = '') {
    try {
      const url = path 
        ? `${this.baseUrl}/directory?path=${encodeURIComponent(path)}`
        : `${this.baseUrl}/directory`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch directory:', error);
      throw error;
    }
  }

  /**
   * 取得檔案內容
   * @param {string} filePath - 檔案路徑
   * @returns {Promise<string>} 檔案內容
   */
  async getFileContent(filePath) {
    const encodedPath = encodeURIComponent(filePath);
    const response = await fetch(`${this.baseUrl}/file/content?path=${encodedPath}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.success ? data.data.content : null;
  }

  // 使用箭頭函數和解構賦值
  formatFileSize = (bytes) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Promise 鏈和現代 JavaScript
  async processFiles(directory) {
    const { data: { items } } = await this.getDirectory(directory);
    
    return items
      .filter(item => item.type === 'file')
      .map(file => ({
        ...file,
        formattedSize: this.formatFileSize(file.size),
        isLarge: file.size > 1024 * 1024 // 1MB
      }))
      .sort((a, b) => b.size - a.size);
  }
}

// 使用示例
const fileService = new FileService();

// 立即執行函數表達式 (IIFE)
(async () => {
  try {
    console.log('🚀 Loading file tree...');
    const directory = await fileService.getDirectory('/example');
    
    if (directory.success) {
      console.log('📁 Directory loaded:', directory.data.path);
      console.log('📄 Files found:', directory.data.items.length);
      
      // 使用 for...of 迴圈
      for (const item of directory.data.items) {
        const icon = item.type === 'file' ? '📄' : '📁';
        console.log(`${icon} ${item.name} (${fileService.formatFileSize(item.size || 0)})`);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();

// 事件處理器示例
document.addEventListener('DOMContentLoaded', () => {
  const fileTree = document.querySelector('#file-tree');
  const contentViewer = document.querySelector('#content-viewer');
  
  fileTree?.addEventListener('click', async (event) => {
    const { target } = event;
    const filePath = target.dataset.path;
    
    if (filePath && target.dataset.type === 'file') {
      try {
        contentViewer.textContent = 'Loading...';
        const content = await fileService.getFileContent(filePath);
        contentViewer.textContent = content;
      } catch (error) {
        contentViewer.textContent = `Error: ${error.message}`;
      }
    }
  });
});

// 工具函數
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// 搜尋功能
const searchFiles = debounce(async (query) => {
  if (!query.trim()) return [];
  
  const directory = await fileService.getDirectory();
  return directory.data.items.filter(item => 
    item.name.toLowerCase().includes(query.toLowerCase())
  );
}, 300);

export { FileService, searchFiles, debounce };