#!/usr/bin/env python3
"""
ProjectDuck - 檔案瀏覽器示例程式碼
Python 語法高亮測試
"""

import os
import json
import asyncio
import aiohttp
from typing import List, Dict, Optional, Union
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass
from enum import Enum

class FileType(Enum):
    """檔案類型列舉"""
    FILE = "file"
    DIRECTORY = "directory"

@dataclass
class FileItem:
    """檔案項目資料類別"""
    name: str
    path: str
    type: FileType
    size: Optional[int] = None
    modified: Optional[datetime] = None
    extension: Optional[str] = None

class FileService:
    """檔案服務類別"""
    
    def __init__(self, base_url: str = "http://localhost:3001/api"):
        self.base_url = base_url
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        """異步上下文管理器進入"""
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """異步上下文管理器退出"""
        if self.session:
            await self.session.close()
    
    def format_file_size(self, bytes_size: int) -> str:
        """格式化檔案大小"""
        if bytes_size == 0:
            return "0 B"
        
        sizes = ["B", "KB", "MB", "GB", "TB"]
        i = 0
        while bytes_size >= 1024 and i < len(sizes) - 1:
            bytes_size /= 1024.0
            i += 1
        
        return f"{bytes_size:.1f} {sizes[i]}"
    
    async def get_directory(self, path: str = "") -> List[FileItem]:
        """
        取得目錄內容
        
        Args:
            path: 目錄路徑
            
        Returns:
            檔案項目列表
            
        Raises:
            aiohttp.ClientError: 當請求失敗時
        """
        if not self.session:
            raise RuntimeError("Session not initialized. Use async context manager.")
        
        url = f"{self.base_url}/directory"
        params = {"path": path} if path else {}
        
        try:
            async with self.session.get(url, params=params) as response:
                response.raise_for_status()
                data = await response.json()
                
                if not data.get("success"):
                    raise ValueError(f"API Error: {data.get('error', 'Unknown error')}")
                
                items = []
                for item_data in data["data"]["items"]:
                    # 處理日期轉換
                    modified = None
                    if item_data.get("modified"):
                        modified = datetime.fromisoformat(
                            item_data["modified"].replace("Z", "+00:00")
                        )
                    
                    file_item = FileItem(
                        name=item_data["name"],
                        path=item_data["path"],
                        type=FileType(item_data["type"]),
                        size=item_data.get("size"),
                        modified=modified,
                        extension=item_data.get("extension")
                    )
                    items.append(file_item)
                
                return items
                
        except aiohttp.ClientError as e:
            print(f"❌ Request failed: {e}")
            raise
    
    async def get_file_content(self, file_path: str) -> str:
        """取得檔案內容"""
        if not self.session:
            raise RuntimeError("Session not initialized")
        
        url = f"{self.base_url}/file/content"
        params = {"path": file_path}
        
        async with self.session.get(url, params=params) as response:
            response.raise_for_status()
            data = await response.json()
            
            if data.get("success"):
                return data["data"]["content"]
            else:
                raise ValueError(f"Failed to get file content: {data.get('error')}")

def filter_files_by_extension(files: List[FileItem], extensions: List[str]) -> List[FileItem]:
    """根據副檔名過濾檔案"""
    return [
        file_item for file_item in files
        if file_item.type == FileType.FILE and 
        file_item.extension and 
        file_item.extension.lower() in [ext.lower() for ext in extensions]
    ]

def sort_files_by_size(files: List[FileItem], reverse: bool = True) -> List[FileItem]:
    """根據檔案大小排序"""
    return sorted(
        files, 
        key=lambda x: x.size or 0, 
        reverse=reverse
    )

async def main():
    """主要執行函數"""
    print("🐍 Python FileService Example")
    print("=" * 40)
    
    # 使用異步上下文管理器
    async with FileService() as file_service:
        try:
            # 取得根目錄內容
            print("📁 Loading directory...")
            files = await file_service.get_directory("/example")
            
            print(f"Found {len(files)} items:")
            
            # 分類顯示
            directories = [f for f in files if f.type == FileType.DIRECTORY]
            regular_files = [f for f in files if f.type == FileType.FILE]
            
            # 顯示目錄
            if directories:
                print("\n📁 Directories:")
                for directory in directories:
                    print(f"  📁 {directory.name}")
            
            # 顯示檔案
            if regular_files:
                print("\n📄 Files:")
                sorted_files = sort_files_by_size(regular_files)
                for file_item in sorted_files:
                    size_str = file_service.format_file_size(file_item.size or 0)
                    ext_str = f".{file_item.extension}" if file_item.extension else ""
                    print(f"  📄 {file_item.name}{ext_str} ({size_str})")
            
            # 過濾特定類型檔案
            code_files = filter_files_by_extension(regular_files, ["py", "js", "ts", "md"])
            if code_files:
                print(f"\n💻 Code files ({len(code_files)}):")
                for code_file in code_files:
                    print(f"  🔧 {code_file.name}")
            
            # 讀取一個 Markdown 檔案內容
            readme_files = [f for f in regular_files if f.name.lower() == "readme.md"]
            if readme_files:
                print("\n📖 README.md content preview:")
                content = await file_service.get_file_content(readme_files[0].path)
                # 顯示前 3 行
                lines = content.split('\n')[:3]
                for line in lines:
                    print(f"  {line}")
                if len(content.split('\n')) > 3:
                    print("  ...")
                    
        except Exception as e:
            print(f"❌ Error: {e}")

# 裝飾器示例
def timing_decorator(func):
    """執行時間裝飾器"""
    import time
    async def wrapper(*args, **kwargs):
        start = time.time()
        result = await func(*args, **kwargs)
        end = time.time()
        print(f"⏱️ {func.__name__} took {end - start:.2f} seconds")
        return result
    return wrapper

@timing_decorator
async def load_and_process_files():
    """載入並處理檔案"""
    async with FileService() as service:
        files = await service.get_directory("/example")
        return filter_files_by_extension(files, ["py", "js", "md", "json"])

# 執行主程式
if __name__ == "__main__":
    # 使用 asyncio.run() 執行異步主函數
    asyncio.run(main())
    
    # 也可以這樣執行
    # loop = asyncio.get_event_loop()
    # loop.run_until_complete(main())