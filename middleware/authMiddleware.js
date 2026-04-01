 const jwt = require("jsonwebtoken")
const  UserModel = require("../model/userModel")


 async function authMiddleware(req,res,next) {
    const token =  req.cookies.jwt
    // console.log("auth middleware token:",req.cookies)


    if (!token) return res.status(401).json({ message: "Not authorized, no token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await UserModel.findById(decoded.userid).select("-password");
    next();

  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
 }



 async function verifyAdmin(req,res,next) {
    const token =  req.cookies["jwt-admin"]


    if (!token) return res.status(401).json({ message: "Not authorized, no token" });

  try {
    const secretKey = jwt.verify(token, process.env.JWT_SECRET);
    const adminSecretKey= process.env.ADMIN_SECRET_KEY

    const isMatched= secretKey === adminSecretKey

     if (!isMatched) return res.status(401).json({ message: "wrong admin key" });


    //  console.log({req.user})
    next();

  } catch (err) {
    res.status(401).json({ message: "Invalid admin token" });
  }
 }


 async function socketAuthMiddleware(socket, next) {
  try {
    const token = socket.request.cookies.jwt;

    if (!token) {
      return next(new Error("Not authorized, no token"));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await UserModel.findById(decoded.userid).select("-password");
    if (!user) {
      return next(new Error("User not found"));
    }
    socket.user = user;
    next();
    
  } catch (error) {
    next(new Error("Invalid token"));
    
  }
}



module.exports= {authMiddleware, verifyAdmin, socketAuthMiddleware}