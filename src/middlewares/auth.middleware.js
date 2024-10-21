import { asyncHandler } from "../utils/asyncHandler";
import { jwt } from 'jsonwebtoken';
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";

export const VerifyJWT = asyncHandler(async (req, _, next) => {
    try {
        const token = req.cookie?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        if (!token) {
            throw new ApiError(401, "UNAUTHORIZED")
        }
        const decodedtoken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        const user = await User.findById(decodedtoken?._id).select(
            "-password -refreshToken"
        )
        if (!user) {
            //DISCUSS ABOUT FRONTEND
            throw new ApiError(404, "INVALID ACCESS TOKEN")
        }
        req.user = user
        next()
    } catch (error) {
        throw new ApiError(
            error?.status || 500,
            error?.message || "INTERNAL SERVER ERROR"

        )

    }

})