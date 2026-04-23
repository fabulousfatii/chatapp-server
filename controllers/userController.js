const bcrypt = require('bcrypt');
const UserModel = require('../model/userModel');
const multerUpload = require('../middleware/multerMiddleware');
const { generateToken } = require('../utils/generateToken');
const { TryCatch, emitEvent, getOtherMember, cloudinaryFilesUpload } = require('../utils/features');
const ChatModel = require('../model/chatModel');
const RequestModel = require('../model/requestModel');


async function register(req,res) {
    const {username,name,password} = req.body
    
  const avatar = req.file

    // const avatar= {
    //   publicId: "777888",
    //   url:"//url9900"
    // }

   try {
     if(!username || !name || !password){
         return res.status(400).json({message: "All fields are required"})
     }
 
     const existingUser = await UserModel.findOne({username})
     if(existingUser){
         return res.status(409).json({message: "Username already exists"})
     }
 
     const bycryptydPassword = await bcrypt.hash(password,10)

     if(avatar){
     const avatarData= await cloudinaryFilesUpload([avatar])

     const newAvatar= {
      url: avatarData[0].url,
        publicId: avatarData[0].public_id
     }
    }
       const newUser = new UserModel({
         username,
         name,
         password: bycryptydPassword,
         avatar: avatar? newAvatar : null
     }) 
     await newUser.save()
 
     generateToken(res,newUser._id)
     
    res.status(201).json({message: "User registered successfully", newUser})

    //   res.status(201).json({
    //   message: "User registered successfully",
    //  username,
    //      name,
    //      password: bycryptydPassword,
    //      avatar: newAvatar  })
     }

      

    
 
    catch (error) {
    console.log(error)
    res.status(500).json({message:`error to register ${error}`})
    
   }}

module.exports = { register}




async function login(req,res) {

const { username, password } = req.body;

  const user = await UserModel.findOne({ username });
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: "Invalid credentials" });

  generateToken(res, user._id);

  res.json({
    _id: user._id,
    name: user.name,
    username: user.username,
  });
};


 function logout(req,res) {
    
    res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
  });
  res.json({ message: "Logged out successfully" });

}

const getMyProfile=TryCatch(async (req,res,next) => {

  // console.log({ user: req.user })
  const user = await UserModel.findById(req.user._id).select("-password")

    return res.json({
          success: true,
          user
      })

})

const searchUser= TryCatch(async (req,res,next) => {
  //  /search?name=ali or al
   const {name} = req.query
 
   const myChats = await ChatModel.find({groupChat: false, members: req.user._id})
   console.log(req.user._id)

   // all users that i chatted with
   const allUserFromMyChats = myChats.flatMap((chat)=> chat.members)

  //  console.log(allUserFromMyChats)

   const usersNotFromMyChats= await UserModel.find({
    _id: {$nin: allUserFromMyChats, $ne: req.user._id},
    name:{ $regex:name , $options:"i"}
   })

   //console.log(usersNotFromMyChats)

   const otherUsers = usersNotFromMyChats.map(({ _id, name, avatar }) => {
     return {
       _id,
       name,
       avatar: avatar && avatar.url ? avatar.url : null
     };
   });

   //console.log(otherUsers)

   //seperate requested users from other users
   const requestedUsers= await RequestModel.find({
    sender: req.user._id}).select("receiver")

   // console.log(requestedUsers)

   let others=[]
    if(requestUser){
  others= requestedUsers?.map((req)=>{
      return otherUsers.filter((user)=> user._id.toString() !== req.receiver.toString())
    }).flat()
      }

   

    // console.log("others",others)

   return res.status(200).json({
          success: true,
          otherUsers: others.length === 0? otherUsers : others
      })





})

const requestUser= TryCatch(async (req,res,next) => {
   const {userId}= req.body
   console.log("ye hai idddd",userId)

   const existingRequest= await RequestModel.findOne({
    $or:[
      { sender: req.user._id ,receiver: userId},
      {receiver: req.user._id ,sender: userId}
    ]
   })

   if (existingRequest) {
             return res.status(409).json({message: "request already sent"})

   }

   await RequestModel.create({
    sender: req.user._id,
    receiver: userId,
    status: "pending"
   })

   const realtimeNotification= {
    sender: {
      _id: req.user._id,
      name: req.user.name,
      avatar: req.user.avatar.url
    },
    receiver: userId,
    status: "pending",
    createdAt: new Date()

  };

   emitEvent(req,"NEW_REQUEST",[userId],realtimeNotification)

    return res.status(201).json({
          success: true,
          message: "request sent successfully"
      })


})
//put
const acceptRequest =TryCatch(async (req,res,next) => {
  const {requestId, accept}= req.body
  console.log("request id",requestId)

    if (!requestId) return res.status(400).json({ message: "no requestId provided" });

    const request= await RequestModel.findById(requestId)
    .populate({path:"sender",select:"name"})
    .populate({path:"receiver",select:"name"})

    const members= [request.sender._id, req.user._id]
    
    await Promise.all([
      ChatModel.create({
        name:  `${request.sender.name} - ${request.receiver.name}`,
        members
      }),
      request.deleteOne({requestId})
    ])
    console.log("request accepted")

     emitEvent(req,"ACCEPT_REQUEST",members)


    return res.status(201).json({
          success: true,
          message: "request accepted successfully"
      })

})

const getNotification =TryCatch(async (req,res,next) => {
      
   const request = await RequestModel.find({$or:[{sender: req.user._id}, {receiver: req.user._id}]}).populate({
    path:"receiver sender",
      select:"name  avatar",
  }).lean();

  const sender= request.map(({_id,sender})=>{
    return{
      _id,
      sender:{
        _id: sender._id,
        name: sender.name,
        avatar: sender.avatar.url
      }
    }
  });

    

     emitEvent(req,"SEND_NOTIFICATION",sender)


   return res.status(201).json({
          success: true,
          request
      })
  
})

const getMyFriend =TryCatch(async (res,req,next) => {
   
    const {chatId} = req.user

    const chats = await ChatModel.find({
      groupChat: false,
      members: req.user._id
    }).populate({
      path:"members" ,select:"name"
    })

    const friends= chats.map(({members})=>{
      const otherMembers= getOtherMember(members,req.user._id)
      return{
        _id: otherMembers._id,
        name:otherMembers.name,
        avatar: otherMembers.avatar.url
      }
    })


  if(chatId){
  const chat = await ChatModel.findById(chatId)

  const availableFriends= chat.members.filter((friend)=> !friend._id.toString() !== req.user._id.toString())

  return res.status(200).json({
          success: true,
          availableFriends
      })
  }else{

    return res.status(200).json({
          success: true,
          friends
      })
  }
 


})



module.exports = {register, login, logout ,getNotification , searchUser,requestUser,
  acceptRequest ,getMyProfile , getMyFriend}



