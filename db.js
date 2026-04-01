const mongoose = require('mongoose');
const dotenv= require("dotenv")


dotenv.config();

const connectdb= async()=> {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("mongodb connected");
    
  } catch (error) {
    console.log(error, "something occured");
    
  }

}

module.exports= {connectdb}