// Define the asyncHandler function as a higher-order function
const asyncHandler = (requestHandler) => {
    // Return a new middleware function that Express can use
    return (req, res, next) => {
        // Execute the requestHandler and ensure it's a Promise
        // This allows both synchronous and asynchronous handlers to be wrapped
        Promise.resolve(requestHandler(req, res, next))
            // If the Promise is rejected (i.e., an error occurs), catch it
            .catch((err) => next(err)) // Pass the error to Express's error-handling middleware
    }
}

// Export the asyncHandler so it can be imported and used in other files
export { asyncHandler }





// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next)
//     } catch (error) {
//         console.log(error);
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
        
//     }
// }