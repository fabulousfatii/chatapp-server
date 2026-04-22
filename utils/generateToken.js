const jwt = require("jsonwebtoken")

 const generateToken = (res,userid) => {

    const token = jwt.sign ({userid},process.env.JWT_SECRET)

    res.cookie("jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // false for localhost
      sameSite: process.env.NODE_ENV === 'production' ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });


}

module.exports= {generateToken}
