// 後端記憶體快取服務
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class BackendCacheService {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttlSeconds = 60): void {
    const ttl = ttlSeconds * 1000; // 轉換為毫秒
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // 檢查是否過期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    // 根據模式刪除快取
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
    });
  }

  // 清理過期的快取項目
  cleanup(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    return {
      totalEntries: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

export const backendCacheService = new BackendCacheService();

// 每 5 分鐘清理一次過期快取
setInterval(() => {
  backendCacheService.cleanup();
}, 5 * 60 * 1000);