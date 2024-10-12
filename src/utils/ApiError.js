/**
 * Custom error class for API-related errors
 * @extends Error
 */
class ApiError extends Error {
    /**
     * Create an ApiError
     * @param {number} statusCode - HTTP status code
     * @param {string} [message="Something went wrong"] - Error message
     * @param {Array} [errors=[]] - Array of additional error details
     * @param {string} [stack=""] - Error stack trace
     */
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = ""
    ) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.errors = errors;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export { ApiError }