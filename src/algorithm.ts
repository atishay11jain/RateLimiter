import { RedisStore } from "./store";
import { RateLimitResult } from "./types";

export abstract class BaseRateLimitAlgorithm {
    protected redisStore: RedisStore;
    protected maxRequests: number;
    protected windowSizeInSeconds: number;

    constructor(redisStore: RedisStore, maxRequests: number, windowSizeInSeconds: number) {
        this.redisStore = redisStore;
        this.maxRequests = maxRequests;
        this.windowSizeInSeconds = windowSizeInSeconds;
    }

    abstract checkRateLimit(key: string): Promise<RateLimitResult>;
}

export class FixedWindowAlgorithm extends BaseRateLimitAlgorithm {
  async checkRateLimit(key: string): Promise<RateLimitResult> {
    try {
      const currentCount = await this.redisStore.increment(
        key,
        this.windowSizeInSeconds
      );
      const allowed = currentCount <= this.maxRequests;
      const remainingRequests = Math.max(0, this.maxRequests - currentCount);
      return { allowed, remainingRequests };
    } catch (error) {
      console.error("FixedWindowAlgorithm error:", error);
      return { allowed: true, remainingRequests: this.maxRequests - 1 };
    }
  }
}

export class SlidingWindowAlgorithm extends BaseRateLimitAlgorithm {
  async checkRateLimit(key: string): Promise<RateLimitResult> {
    try {
      const currentTime = Date.now();
      const windowStart = currentTime - this.windowSizeInSeconds * 1000;
      const sortedSetKey = `${key}:sliding_window`;

      await this.redisStore.removeFromSortedSet(sortedSetKey, 0, windowStart);
      const currentCount = await this.redisStore.getSortedSetCount(sortedSetKey);
      const allowed = currentCount < this.maxRequests;
      if(allowed){
        await this.redisStore.addToSortedSet(sortedSetKey, currentTime, JSON.stringify(currentTime), this.windowSizeInSeconds);
      }
      const remainingRequests = Math.max(0, this.maxRequests - currentCount);
      return { allowed, remainingRequests };
    } catch (error) {
      console.error("SlidingWindowAlgorithm error:", error);
      return { allowed: true, remainingRequests: this.maxRequests - 1 };
    }
  }
}