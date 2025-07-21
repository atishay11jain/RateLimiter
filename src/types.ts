import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';


export enum RateLimitType {
  IP = 'ip',
  CLIENT_ID = 'client_id'
}

export enum RateLimitAlgorithm {
  FIXED_WINDOW = 'fixed_window',
  SLIDING_WINDOW = 'sliding_window',
  TOKEN_BUCKET = 'token_bucket'
}

export interface RateLimitConfig {
    type: RateLimitType;
    algorithm: RateLimitAlgorithm;
    maxRequests: number; 
    windowSizeInSeconds: number;
    redisClient: Redis;
    keyPrefix?: string;
    tokenBucket?: {
    refillRate: number;
    capacity: number;
  };
}

export interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
}

export type RateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export interface IRateLimitStore {
  increment(key: string, ttl: number): Promise<number>;
  removeFromSortedSet(key: string, minScore: number, maxScore: number): Promise<number>;
  getSortedSetCount(key: string): Promise<number>;
  addToSortedSet(key: string, score: number, value: string, ttl: number): Promise<void>;
}