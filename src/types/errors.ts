/**
 * Common error types for the application
 */

export interface ApiErrorLocation {
  line: number;
  column: number;
}

export interface ApiErrorDetails {
  message: string;
  status?: number;
  locations?: ApiErrorLocation[];
  path?: string[];
  extensions?: Record<string, unknown>;
}

export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export class ApiError extends AppError {
  status?: number;
  errors?: ApiErrorDetails[];
  query?: string;
  variables?: Record<string, unknown>;

  constructor(message: string, options?: {
    status?: number;
    errors?: ApiErrorDetails[];
    query?: string;
    variables?: Record<string, unknown>;
  }) {
    super(message);
    this.name = 'ApiError';
    this.status = options?.status;
    this.errors = options?.errors;
    this.query = options?.query;
    this.variables = options?.variables;
  }
}

export class NetworkError extends ApiError {
  constructor(message: string) {
    super(message, { status: 0 });
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string) {
    super(message, { status: 401 });
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends ApiError {
  retryAfter?: number;

  constructor(message: string, retryAfter?: number) {
    super(message, { status: 429 });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}