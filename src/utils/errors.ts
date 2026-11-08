// Throw this anywhere in a request (controller, middleware, transaction) for an
// expected failure; the global errorHandler turns it into a JSON response.
export class AppError extends Error {
  readonly statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
  }
}
