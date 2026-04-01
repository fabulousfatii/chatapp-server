const ChatModel = require("../model/chatModel");
const MessageModel = require("../model/messageModel");
const UserModel = require("../model/userModel");
const { TryCatch } = require("../utils/features");


export const adminLogin = async (req, res) => {
  try {
    const { secretKey } = req.body;

    // 1️⃣ Check admin secret key
    if (secretKey !== process.env.ADMIN_SECRET_KEY) {
      return res.status(401).json({ message: "Invalid admin secret key" });
    }


    // Create JWT token

    const token = jwt.sign ({secretKey},process.env.JWT_SECRET)

    res.cookie("jwt-admin",token,{
           httpOnly: true,     // can't access via JS
    secure: true, // only HTTPS in production
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })
    
    res.status(200).json({
      message: "Admin logged in successfully",
      token,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


const getAllUsers =TryCatch(async (res,req,next) => {
     const users= await UserModel.find()


     //adding user's groups and friends count 
     const allusers = users.map(async({_id,username,avatar,name})=>{

         const [groups,friends]= await Promise.all([
            ChatModel.countDocuments({groupChat:true , members:_id}),
            ChatModel.countDocuments({groupChat:false , members:_id})
         ])

         return{
           _id,
           name,
           username,
           avatar: avatar.url,
           groups,
           friends
         }

     })

     return res.status(200).json({
          success: true,
          allusers
      })
})


const getAllChats =TryCatch(async (res,req,next) => {
    
    const chats= await ChatModel.find()
    .populate({path:"members" , select:"name avatar"})
    .populate({path:"creator" , select:"name avatar"})

    const transFormChats= await Promise.all(
        chats.map(async ({_id ,groupChat,members,name,creator }) => {
             
            totalMesages= await MessageModel.countDocuments({chat:_id})

            return{
                _id,
                name,
                groupChat,
                creator: {
                    _id: creator._id,
                    name: creator.name || "" ,
                    avatar: creator.avatar.url ||""
                },
                members:members.map(({_id, name , avatar})=>{
                    return{
                        _id,
                        name ,
                        avatar : avatar.url
                    }
                }),
                members: members.length
                

                    

                
                
            }
        })
    )

      return res.status(200).json({
          success: true,
          transFormChats
      })





})

const getAllMessages =TryCatch(async (res,req,next) => {
    
    const messages= await MessageModel.find()
    .populate({path:"sender" , select:"name avatar"})
    .populate({path:"chat" , select:"groupchat"})

    const transFormMessages=  messages.map( ({_id, attachments, sender, chat, content ,createdAt}) => {

            return{
                _id,
                groupChat: chat.groupChat,
                content,
                sender: {
                    _id: sender._id,
                    name: sender.name || "" ,
                    avatar: sender.avatar.url ||""
                },
                chat:chat._id,
                attachments,
                createdAt
    
            }
        })
    

      return res.status(200).json({
          success: true,
          transFormMessages
      })





})

const getDashboardStats= TryCatch(async (res,req,next) => {

    const [groupCount,userCount,messageCount,totalChatCount]= await Promise.all([
        ChatModel.countDocuments({groupChat:true}),
        UserModel.countDocuments(),
        MessageModel.countDocuments(),
        ChatModel.countDocuments(),
    ])

    const today = new Date()

    const last7days= new Date();
    last7days.setDate(last7days.getTime() - 7)

    const last7daysMessages= await MessageModel.find({
        createdAt:{
            $gte: last7days,
            $lte: today
        }

    })

    const messages = new Array(7).fill(0)

    const milliSecondsInDay= 1000 * 60 * 60 * 24

    last7daysMessages.forEach((message)=>{
        const indexApprox= 
        (today.getTime()- message.createdAt.getTime())/ milliSecondsInDay

        const index= Math.floor(indexApprox)

        messages[6 - index]++;
    })

    

     


    const stats= {
        groupCount,
        userCount,
        messageCount,
        totalChatCount,
        messagesChart: messages   
    }

     return res.status(200).json({
          success: true,
          stats
      })



})


module.exports= {adminLogin,getAllUsers, getAllMessages ,getAllChats,getDashboardStats}

