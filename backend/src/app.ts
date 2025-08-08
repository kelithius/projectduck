import express from 'express';
import cors from 'cors';
import path from 'path';
import filesRouter from './routes/files';

const app = express();
const PORT = process.env.PORT || 3001;

// 設定 CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// JSON 解析中間件
app.use(express.json());

// 設定基礎目錄 (預設使用 example 目錄)
if (!process.env.BASE_PATH) {
  process.env.BASE_PATH = path.join(process.cwd(), '..', 'example');
}

// API 路由
app.use('/api', filesRouter);

// 健康檢查端點
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    basePath: process.env.BASE_PATH 
  });
});

// 404 處理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// 錯誤處理中間件
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 啟動伺服器
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 ProjectDuck API server running on port ${PORT}`);
    console.log(`📁 Base path: ${process.env.BASE_PATH}`);
    console.log(`🌐 CORS origin: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  });
}

export default app;