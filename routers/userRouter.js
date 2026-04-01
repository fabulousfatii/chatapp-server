
const express = require("express")
const router = express.Router()
const { register,login ,logout, searchUser, requestUser, acceptRequest, getNotification, getMyProfile } = require("../controllers/userController")
const multerUpload = require("../middleware/multerMiddleware")
const { authMiddleware } = require("../middleware/authMiddleware")


// router.post("/register",multerUpload.single('avatar'), register)
router.post("/register",multerUpload.single("avatar"), register)
router.post("/login", login)
router.post("/logout",authMiddleware, logout)

router.get("/myProfile",authMiddleware,getMyProfile)
router.get("/searchUser",authMiddleware,searchUser)
router.put("/sendRequest",authMiddleware,requestUser)
router.put("/acceptRequest",authMiddleware, acceptRequest)
router.get("/getNotifications",authMiddleware, getNotification)


module.exports = router