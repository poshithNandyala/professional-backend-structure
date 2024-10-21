import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        if (!user) {
            throw new ApiError(404, "USER NOT FOUND FROM generateAccessAndRefreshTokens FUNCTION")
        }

        const accessToken = user.generateAccessToken()

        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken

        // Save the updated user document to the database
        // The 'validateBeforeSave: false' option skips validation before saving
        // This is useful when we want to update only specific fields without triggering full model validation
        await user.save({
            validateBeforeSave: false
        })

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "SOMETHING WENT WRONG WHILE GENERATING ACCESS AND REFRESH TOKENS", error)
    }
}

const registerUser = asyncHandler(async (req, res) => {
    //get user details from frontend
    //validation
    //check if user already exists: username, email
    //take files from multer local filepath
    //upload avatar, cover image on cloudinary
    //create user object - create entry in db
    //update data in database
    //remove password and refresh token fields from response
    //check for user creation
    //return response

    const { fullName, email, username, password } = req.body

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "ALL FIELDS ARE REQUIRED")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "USER ALREADY EXISTS")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage[0].path) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "AVATAR LOCAL PATH IS REQUIRED")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "AVATAR IS REQUIRED")
    }

    const user = await User.create({
        fullName,
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    })

    const createdUser = await User.findOne(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "USER NOT CREATED")
    }

    return res.status(200).json(
        new ApiResponse(200,
            createdUser,
            "USER CREATED"
        )
    )
})

const loginUser = asyncHandler(async (req, res) => {
    // req.body -> data
    // validation  username or email
    //find user
    //password check
    //generate access token and refresh token
    //send cookie

    const { username, email, password } = req.body
    // console.log(`username : ${username} , email : ${email} , password : ${password}`);
    if (!username && !email) {
        throw new ApiError(400, "USERNAME OR EMAIL IS REQUIRED")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "USER NOT FOUND")
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(400, "INCORRECT PASSWORD")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "USER LOGGED IN SUCCESSFULLY"
            )
        )
})

const logOutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: ""
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200,
                null,
                "USER LOGGED OUT SUCCESSFULLY"
            )
        )


})


const refreshAccessToken = asyncHandler(async (req, res) => {

    // Retrieve refresh token from cookies or request body
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    // If no refresh token is provided, return a more informative error message
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token missing. Please log in again.");
    }

    try {
        // Verify the refresh token using the secret key
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        // If token verification fails, return an invalid token error message
        if (!decodedToken) {
            throw new ApiError(401, "Invalid refresh token. Please log in again.");
        }

        // Check if the user exists in the database
        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(404, "User not found. Please log in again.");
        }

        // Ensure the refresh token in the user record matches the incoming token
        if (user?.refreshToken !== incomingRefreshToken) {
            throw new ApiError(403, "Refresh token mismatch. Please log in again.");
        }

        // Define cookie options for security (httpOnly, secure)
        const options = {
            httpOnly: true,
            secure: true
        };

        // Generate new access and refresh tokens for the user
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

        // Set cookies and return success response with new tokens
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken: accessToken,  // corrected variable name from 'accesssToken'
                        refreshToken: newRefreshToken  // corrected variable name from 'refreshtoken'
                    },
                    "Access token successfully refreshed."
                )
            );
    } catch (error) {
        // Catch any other errors and return a clear message
        throw new ApiError(401, "Token refresh failed. Please try logging in again.");
    }
});


export {
    registerUser,
    loginUser,
    logOutUser,
    refreshAcessToken
}
