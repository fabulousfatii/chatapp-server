const { getBase64 } = require("./helpers");
// const fs = require("fs");
const {v2:cloudinary} = require("cloudinary")

const userSocketIDs = new Map();






//othermember function because ===> to get receiver user-id who send msg to u (receiver)
 const getOtherMember = (members,loggedUserId)=>{
    return members.find(
        (member)=> member._id.toString() !== loggedUserId.toString()
    )
 }

 //trycatch function easy way 
 const TryCatch = (passedFunction)=> async (req,res,next) => {
    try {
        passedFunction(req,res,next)
    } catch (error) {
        next(error)
    }
 }

 const deleteFilesCloudinary= ()=>{}


   const getSocketIds= (socket,users=[])=>{
    const sockets= users.map((user)=>{
      
        return userSocketIDs.get(user.toString())
    }).filter(Boolean) //filter null/undefined values
    // console.log("sockets",sockets)
    return sockets
   }


   const emitEvent = (req, event, users, data) =>{
        const io = req.app.get("io");
        const usersSocket = getSocketIds(users);
        io.to(usersSocket).emit(event, data);
    }

const cloudinaryFilesUpload = async (files = []) => {
  const uploadFiles = files.map(async (file) => {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        resource_type: "auto"
      });
      // console.log({result})
      return {
        url: result.secure_url,
        public_id: result.public_id
      };
    } catch (err) {
      console.error("Upload failed for:", file.path, err);
      return null; // or throw err if you want to stop everything
    }
  });

  return Promise.all(uploadFiles);
};




module.exports={emitEvent,getOtherMember,TryCatch, deleteFilesCloudinary,getSocketIds, cloudinaryFilesUpload, userSocketIDs}
