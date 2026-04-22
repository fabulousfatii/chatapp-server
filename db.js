const mongoose = require('mongoose');
const dotenv = require("dotenv");

dotenv.config();

const connectdb = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected ");
  } catch (error) {
    console.error("DB connection error:", error);
    process.exit(1);
  }
};

module.exports = { connectdb };
