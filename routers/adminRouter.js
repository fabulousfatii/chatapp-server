const {adminLogin,getAllUsers, getAllMessages ,getAllChats,getDashboardStats} = require("../controllers/adminController")
const { verifyAdmin }  = require("../middleware/authMiddleware");
const express = require("express");

const router = express.Router();

router.post("/login", adminLogin);
router.post("/logout", verifyAdmin, adminLogout);


router.get("/getAllUsers",verifyAdmin,getAllUsers)
router.get("/getAllMessages",verifyAdmin,getAllMessages)
router.get("/getAllChats",verifyAdmin,getAllChats)
router.get("/getDashboardStats",verifyAdmin,getDashboardStats)

module.exports= router
