import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

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

const changeCurrentpassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    const isPasswordMatch = await user.isPasswordCorrect(currentPassword);
    if (!isPasswordMatch) {
        throw new ApiError(400, "INCORRECT PASSWORD");
    }
    user.password = newPassword;
    await user.save();
    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "PASSWORD CHANGED SUCCESSFULLY"
        )
    )
}
)

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(
            200,
            req.user,
            "USER DATA FETCHED SUCCESSFULLY"
        )
    )
})

const UpdateAccountDetails = asyncHandler(async (req, res) => {
    // Function to update account details (fullName and email) for the logged-in user
    // Destructuring the fullName and email from the request body
    const { fullName, email } = req.body;
    // console.log(fullName, email)
    // Validate that both fullName and email are provided
    if (!fullName || !email) {
        // Throw an error with validation messages if any field is missing
        throw new ApiError(400, "Validation Error", [
            { field: "fullName", message: "Full name is required" },
            { field: "email", message: "Email is required" }
        ]);
    }

    // Find and update the user by their ID (retrieved from the request)
    // - $set is used to update only the specified fields (fullName and email)
    // - { new: true } ensures that the updated user object is returned
    // - runValidators: true ensures the data is validated according to the User model schema
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { fullName, email } },
        { new: true, runValidators: true }
    ).select("-password"); // Exclude the password field from the returned user object

    // Return a successful response with the updated user object and a success message
    return res.status(200).json(
        new ApiResponse(
            200,
            updatedUser, // Include updated user details in the response
            "ACCOUNT DETAILS UPDATED SUCCESSFULLY"
        )
    );
});


const updateUserAvatar = asyncHandler(async (req, res) => {

    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Please select an image");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiError(500, "Cloudinary error");
    }

    const updateUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password -refreshToken")
    //delete old image from cloudinary
    return res.status(200).json(
        new ApiResponse(
            200,
            updateUser,
            "AVATAR UPDATED SUCCESSFULLY"
        )
    )
})

const updateUserCoverImage = asyncHandler(async (req, res) => {

    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Please select an image");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage.url) {
        throw new ApiError(500, "Cloudinary error");
    }

    const updateUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password -refreshToken")

    return res.status(200).json(
        new ApiResponse(
            200,
            updateUser,
            "COVER IMAGE UPDATED SUCCESSFULLY"
        )
    )

})


const getUserChannelprofile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    // Check if username was provided
    if (!username?.trim()) {
        throw new ApiError(400, "Please provide username");
    }

    // Perform an aggregation operation on the 'User' collection
    const channel = await User.aggregate([
        {
            // Match the user by username (convert it to lowercase for case-insensitive search)
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            // First lookup to join 'User' collection with 'subscriptions' to get subscribers (people subscribed to this channel)
            $lookup: {
                from: "subscriptions",          // 'subscriptions' collection
                localField: "_id",              // '_id' of the user in 'User' collection
                foreignField: "channel",        // 'channel' field in 'subscriptions' (the channel they are subscribed to)
                as: "subscribers"               // Result will be stored in the 'subscribers' field
            }
        },
        {
            // Second lookup to join 'User' with 'subscriptions' to get the channels the user has subscribed to
            $lookup: {
                from: "subscriptions",          // 'subscriptions' collection again
                localField: "_id",              // '_id' of the user
                foreignField: "subscriber",     // 'subscriber' field in 'subscriptions' (the user who subscribed)
                as: "subscribedTo"              // Result will be stored in 'subscribedTo' field
            }
        },
        {
            // Add additional fields to the result document
            $addFields: {
                // 'subscribersCount' is the size of the 'subscribers' array
                subscribersCount: {
                    $size: "$subscribers"
                },
                // 'channelsSubscribedToCount' is the size of the 'subscribedTo' array
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                // 'isSubscribed' checks if the current logged-in user is subscribed to the channel
                isSubscribed: {
                    $cond: {
                        if: {
                            // Checks if the current user ID is in the 'subscribers.subscriber' array
                            $in: [req.user?._id, "$subscribers.subscriber"]
                        },
                        then: true,  // If user is subscribed, set 'isSubscribed' to true
                        else: false  // Otherwise, set it to false
                    }
                }
            }
        },
        {
            // Project (select) the fields to include in the final result
            $project: {
                fullName: 1,                      // Include the user's full name
                username: 1,                      // Include the username
                email: 1,                         // Include the email
                subscribersCount: 1,              // Include the count of subscribers
                channelsSubscribedToCount: 1,     // Include the count of channels the user has subscribed to
                isSubscribed: 1,                  // Include whether the current user is subscribed or not
                coverImage: 1,                    // Include the user's cover image
                avatar: 1                         // Include the user's avatar
            }
        }
    ])

    // If no channel was found, throw an error
    if (!channel?.length) {
        throw new ApiError(404, "Channel not found");
    }

    // console.log(channel)

    // Return the channel profile
    return res
        .status(200)
        .json(new ApiResponse(
            200,
            channel[0],
            "CHANNEL FETCHED SUCCESSFULLY"
        )
        )
})


const getWatchHistory = asyncHandler(async (req, res) => {
    // Start an aggregation query on the User collection
    const user = User.aggregate([
        {
            // Match the document where the user's _id is equal to the id from the request
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id), // Convert req.user._id to ObjectId
            }
        },
        {
            // Perform a $lookup to join the 'videos' collection with the 'User' collection
            $lookup: {
                from: "videos", // Collection to join (videos collection)
                localField: "watchHistory", // Field from the 'User' collection (an array of video IDs)
                foreignField: "_id", // Field from the 'videos' collection (_id field of each video)
                as: "watchHistory", // Output field name where the joined data will be stored (as 'watchHistory')
                // Sub-pipeline inside the $lookup for the 'videos' collection
                pipeline: [
                    {
                        // Another $lookup to join the 'users' collection with the 'videos' collection to get video owner info
                        $lookup: {
                            from: "users", // Collection to join (users collection)
                            localField: "owner", // Field from 'videos' collection (owner's user ID)
                            foreignField: "_id", // Field from 'users' collection (_id of the owner)
                            as: "owner", // Output field name for the joined owner data
                            // Sub-pipeline to control which fields are returned from the 'users' collection
                            pipeline: [
                                {
                                    // Use $project to return only specific fields from the owner document
                                    $project: {
                                        fullName: 1, // Include the owner's fullName
                                        username: 1, // Include the owner's username
                                        avatar: 1    // Include the owner's avatar (profile picture)
                                    }
                                }
                            ]
                        }
                    },
                    {
                        // Add a new field 'owner' to each video document, taking the first element from the 'owner' array
                        $addFields: {
                            owner: {
                                $first: "$owner" // Use the $first operator to take the first element from the 'owner' array
                            }
                        }
                    }
                ]
            }
        }
    ]);

    // Send the response back to the client
    return res
        .status(200) // HTTP status 200 means "OK"
        .json(
            new ApiResponse( // Use a custom ApiResponse object to format the response
                200, // Status code
                user[0].watchhistory, // Return the user's watch history from the first user in the result
                "WATCH HISTORY FETCHED SUCCESSFULLY" // Message to indicate successful retrieval
            )
        );
});

export {
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken,
    changeCurrentpassword,
    getCurrentUser,
    UpdateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelprofile,
    getWatchHistory
}
