import { Router } from "express";
import {
    loginUser,
    logOutUser,
    registerUser,
    refreshAccessToken,
    changeCurrentpassword,
    getCurrentUser,
    UpdateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelprofile
} from '../controllers/user.controller.js'
import { upload } from '../middlewares/multer.middleware.js'
import { VerifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route('/register').post(
    upload.fields([
        {
            name: 'avatar',
            maxCount: 1
        },
        {
            name: 'coverImage',
            maxCount: 1
        }
    ]),
    registerUser
)

//secured routes
router.route("/login").post(loginUser)
router.route("/logout").post(VerifyJWT, logOutUser)
router.route("/refresh-token").post(VerifyJWT, refreshAccessToken)
router.route("/change-password").post(VerifyJWT, changeCurrentpassword)
router.route("/").get(VerifyJWT, getCurrentUser)
router.route("/update-account-details").patch(VerifyJWT, UpdateAccountDetails)
router.route("/update-avatar").patch(VerifyJWT, upload.single('avatar'), updateUserAvatar)
router.route("/update-cover-image").patch(VerifyJWT, upload.single('coverImage'), updateUserCoverImage)
router.route("/get-channel-profile/:username").get(VerifyJWT, getUserChannelprofile)



export default router