import { Redis } from "ioredis";
import { IRateLimitStore } from "./types";

export class RedisStore implements IRateLimitStore {
  private redis: Redis;

  constructor(redisClient: Redis) {
    this.redis = redisClient;
  }

  async increment(key: string, ttl:number): Promise<number>{
    try{
        const multi = this.redis.multi();
        multi.incr(key);
        multi.expire(key, ttl, 'NX');
        const results = await multi.exec();
        if (!results || !results[0] || results[0][0]) {
            throw new Error('Redis increment failed');
        }
        return results[0][1] as number;
    }catch(error) {
      console.error("Redis increment error:", error);
      return 0;
    }
  }

  async removeFromSortedSet(key: string, minScore: number, maxScore: number): Promise<number>{
    try {
      const result = await this.redis.zremrangebyscore(key, minScore, maxScore);
      return result;
    } catch (error) {
      console.error("Redis removeFromSortedSet error:", error);
      return 0;
    }
  }

  async getSortedSetCount(key:string): Promise<number> {
    try {
      const count = await this.redis.zcard(key);
      return count;
    } catch (error) {
      console.error("Redis getSortedSetCount error:", error);
      return 0;
    }
  }

  async addToSortedSet(key: string, score:number, value:string, ttl: number): Promise<void> {
    try {
      const multi = this.redis.multi();
      multi.zadd(key, score, value);
      multi.expire(key, ttl);
      await multi.exec();
    } catch (error) {
      console.error("Redis addToSortedSet error:", error);
    }
  }
}
