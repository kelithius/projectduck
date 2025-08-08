import express from 'express';
import { FileService } from '../services/fileService';
import { DirectoryResponse, FileContentResponse, FileInfoResponse, ApiError } from '../types';

const router = express.Router();

/**
 * GET /api/directory - 取得目錄內容
 */
router.get('/directory', async (req, res) => {
  try {
    const path = (req.query.path as string) || '';
    const items = await FileService.getDirectoryContents(path);
    
    const response: DirectoryResponse = {
      success: true,
      data: {
        path,
        items
      }
    };
    
    res.json(response);
  } catch (error) {
    const errorResponse: ApiError = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    res.status(400).json(errorResponse);
  }
});

/**
 * GET /api/file/content - 取得檔案文字內容
 */
router.get('/file/content', async (req, res) => {
  try {
    const path = req.query.path as string;
    
    if (!path) {
      const errorResponse: ApiError = {
        success: false,
        error: 'Path parameter is required'
      };
      return res.status(400).json(errorResponse);
    }
    
    const content = await FileService.getFileContent(path);
    
    const response: FileContentResponse = {
      success: true,
      data: content
    };
    
    res.json(response);
  } catch (error) {
    const errorResponse: ApiError = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    res.status(400).json(errorResponse);
  }
});

/**
 * GET /api/file/info - 取得檔案資訊
 */
router.get('/file/info', async (req, res) => {
  try {
    const path = req.query.path as string;
    
    if (!path) {
      const errorResponse: ApiError = {
        success: false,
        error: 'Path parameter is required'
      };
      return res.status(400).json(errorResponse);
    }
    
    const info = await FileService.getFileInfo(path);
    
    const response: FileInfoResponse = {
      success: true,
      data: info
    };
    
    res.json(response);
  } catch (error) {
    const errorResponse: ApiError = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    res.status(400).json(errorResponse);
  }
});

/**
 * GET /api/file/raw - 取得原始檔案 (二進位)
 */
router.get('/file/raw', async (req, res) => {
  try {
    const path = req.query.path as string;
    
    if (!path) {
      return res.status(400).json({ 
        success: false, 
        error: 'Path parameter is required' 
      });
    }
    
    const fileStream = await FileService.getFileStream(path);
    const info = await FileService.getFileInfo(path);
    
    // 設定正確的 Content-Type
    res.setHeader('Content-Type', info.type);
    res.setHeader('Content-Length', info.size);
    
    // 串流檔案內容
    fileStream.pipe(res);
  } catch (error) {
    const errorResponse: ApiError = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    res.status(400).json(errorResponse);
  }
});

export default router;