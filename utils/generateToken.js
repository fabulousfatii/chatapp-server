const jwt = require("jsonwebtoken")

 const generateToken = (res,userid) => {

    const token = jwt.sign ({userid},process.env.JWT_SECRET)

    res.cookie("jwt",token,{
           httpOnly: true,     // can't access via JS
    secure: true, // only HTTPS in production
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })


}

module.exports= {generateToken}
