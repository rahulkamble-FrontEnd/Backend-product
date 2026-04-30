import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

type RetryableRequest = {
  method?: string;
  url?: string;
  __dbRetryAttempted?: boolean;
};

@Injectable()
export class DbTransientRetryInterceptor implements NestInterceptor {
  private readonly logger = new Logger(DbTransientRetryInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<RetryableRequest>();
    const method = (req.method ?? '').toUpperCase();
    const canRetry =
      (method === 'GET' || method === 'HEAD') && !req.__dbRetryAttempted;

    if (!canRetry) {
      return next.handle();
    }

    return next.handle().pipe(
      catchError((err: unknown) => {
        if (!this.isTransientDbError(err)) {
          return throwError(() => err);
        }

        req.__dbRetryAttempted = true;
        this.logger.warn(
          `Transient DB error on ${method} ${req.url ?? ''}; retrying request once`,
        );
        return next.handle();
      }),
    );
  }

  private isTransientDbError(error: unknown): boolean {
    const err = error as {
      code?: string;
      driverError?: { code?: string; fatal?: boolean };
    };

    const code = err?.code ?? err?.driverError?.code;
    const retryableCodes = new Set([
      'ECONNRESET',
      'ETIMEDOUT',
      'EPIPE',
      'PROTOCOL_CONNECTION_LOST',
      'ER_LOCK_WAIT_TIMEOUT',
    ]);

    if (code && retryableCodes.has(code)) {
      return true;
    }

    return (
      error instanceof QueryFailedError && Boolean(err?.driverError?.fatal)
    );
  }
}
