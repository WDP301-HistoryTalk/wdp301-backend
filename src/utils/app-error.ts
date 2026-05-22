/**
 * Custom application operational error class.
 * Used for representing client-side errors (4xx) and expected server-side errors (5xx)
 * with descriptive status codes and detailed validation payload.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly status: string;
  public readonly isOperational: boolean;
  public readonly errors: unknown;

  constructor(message: string, statusCode: number, errors: unknown = null) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}
