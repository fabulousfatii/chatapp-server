const express = require("express")
const router = express.Router()
const {newGroup, getMyGroups, addMembers,removeMembers,leaveChat,
     getMyChats,getMessages,
     deleteChat,
     renameGroup,attachments,
     getChatDetails}= require("../controllers/chatController")
const multerUpload = require("../middleware/multerMiddleware")

const { authMiddleware } = require("../middleware/authMiddleware")


// router.post("/register",multerUpload.single('avatar'), register)
router.post("/newGroup",authMiddleware, newGroup )

router.get("/getMyGroups",authMiddleware, getMyGroups)
router.get("/getMyChats",authMiddleware, getMyChats)

router.put("/addMembers",authMiddleware ,addMembers)
router.put("/removeMembers",authMiddleware ,removeMembers )

router.delete("/leaveChat/:id",authMiddleware ,leaveChat ) //not checked yet

router.get("/getMessages/:id",authMiddleware, getMessages) //not checked
router.get("/getChatDetails/:id",authMiddleware, getChatDetails) //not checked

router.post("/attachments",multerUpload.array("files",5),attachments) ///seee this again

router.put("/renameGroup/:id",authMiddleware, renameGroup)
router.delete("/deleteChat/:id",authMiddleware, deleteChat) //not checked





module.exports = router