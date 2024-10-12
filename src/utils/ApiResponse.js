/**
 * Represents an API response.
 */
class ApiResponse {
    /**
     * Creates a new ApiResponse instance.
     * @param {number} statusCode - The HTTP status code of the response. Default is 200.
     * @param {*} data - The data payload of the response. Default is null.
     * @param {string} message - A message describing the response. Default is "Success".
     * @param {*} errors - Any errors associated with the response. Default is null.
     */
    constructor(
        statusCode = 200,
        data = null,
        message = "Success",
        errors = null
    ) {
        this.statusCode = statusCode
        this.data = data
        this.message = message
        this.errors = errors
        this.success = statusCode < 400
    }
}

export { ApiResponse }