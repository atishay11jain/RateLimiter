import {
  RateLimitAlgorithm,
  RateLimitConfig,
  RateLimitInfo,
  RateLimitMiddleware,
  RateLimitResult,
  RateLimitType,
} from "./types";
import { RedisStore } from "./store";
import {
  BaseRateLimitAlgorithm,
  FixedWindowAlgorithm,
  SlidingWindowAlgorithm,
} from "./algorithm";
import { NextFunction, Request, Response } from "express";

class RateLimiter {
  private config: RateLimitConfig;
  private redisStore: RedisStore;
  private algorithm: BaseRateLimitAlgorithm;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.redisStore = new RedisStore(config.redisClient);
    this.algorithm = this.createRateLimitingAlgorithm(config.algorithm);
  }

  private createRateLimitingAlgorithm(
    algorithmName: RateLimitAlgorithm
  ): BaseRateLimitAlgorithm {
    switch (algorithmName) {
      case RateLimitAlgorithm.FIXED_WINDOW:
        return new FixedWindowAlgorithm(
          this.redisStore,
          this.config.maxRequests,
          this.config.windowSizeInSeconds
        );
      case RateLimitAlgorithm.SLIDING_WINDOW:
        return new SlidingWindowAlgorithm(
          this.redisStore,
          this.config.maxRequests,
          this.config.windowSizeInSeconds
        );
      default:
        throw new Error(
          `Unsupported rate limiting algorithm: ${this.algorithm}`
        );
    }
  }

  private createKey(req: Request): string {
    let key: string;
    switch (this.config.type) {
      case RateLimitType.IP:
        key = `ip${this.config.keyPrefix ? ":" + this.config.keyPrefix : ""}:${
          req?.ip || "unknown"
        }`;
        break;
      case RateLimitType.CLIENT_ID:
        key = `client_id${
          this.config.keyPrefix ? ":" + this.config.keyPrefix : ""
        }:${req.body?.clientId || "unknown"}`;
        break;
      default:
        throw new Error(`Unsupported rate limit type: ${this.config.type}`);
    }
    return key;
  }

  private setHeaders(res: Response, info: RateLimitInfo): void {
    res.set({
      "X-RateLimit-Limit": info.limit.toString(),
      "X-RateLimit-Remaining": info.remaining.toString(),
    });
  }

  public middleware(): RateLimitMiddleware {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const key = this.createKey(req);
      const rateLimitResult: RateLimitResult =
        await this.algorithm.checkRateLimit(key);
      const rateLimitInfo: RateLimitInfo = {
        limit: this.config.maxRequests,
        remaining: rateLimitResult.remainingRequests,
      };

      this.setHeaders(res, rateLimitInfo);

      if (rateLimitResult.allowed) {
        return next();
      }
      res.status(429).json({
        error: "Rate limit exceeded",
        message: "Too many requests, please try again later",
      });
    };
  }
}

export function rateLimitMiddleware(
  config: RateLimitConfig
): RateLimitMiddleware {
  const limiter = new RateLimiter(config);
  return limiter.middleware();
}
