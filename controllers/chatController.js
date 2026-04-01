

const ChatModel = require("../model/chatModel")
const UserModel = require("../model/userModel")
const {emitEvent, getOtherMember, TryCatch, deleteFilesCloudinary, cloudinaryFilesUpload} = require("../utils/features")
const MessageModel = require("../model/messageModel")
const { default: mongoose } = require("mongoose")
const {NEW_ATTCAHMENT,NEW_ATTCAHMENT_ALERT, NEW_MESSAGE} = require("../constants/events")


async function newGroup(req, res) {

    const {name,members} = req.body

    //you can add logic to see lenght of members >2 

    try {
            const allMembers= [...members, req.user._id]

            const samegroup= await ChatModel.find({members : allMembers})
           // see if members are same in boht group 
            if(samegroup.length > 0){
                const isSameGroup = samegroup.some(group => {
                    const groupMemberIds = group.members.map(m => m.toString());
                    return allMembers.every(memberId => groupMemberIds.includes(memberId.toString()));
                });
                if (isSameGroup) {
                    return res.status(400).json({message:"group with same members already exist"})
                } 
              }

            // create new group 
            const newGroupChat = new ChatModel({
                name,
                groupChat: true,
                members: allMembers,
                creator: req.user._id
            })

            await newGroupChat.save()
            res.status(201).json(newGroupChat) 


            emitEvent(req,"ALERT",allMembers,`welcome to new group ${name}`)
            emitEvent(req,"REFETCH_CHATS",members)

    } catch (error) {
        res.status(500).json({message: `error to create group chat ${error}`})
        
    }
    
}

const getMyChats = async (req, res) => {
  try {
    const userId = req.user._id;

    const chats = await ChatModel.find({
      members: userId
    })
    .populate("members", "name avatar")
    .sort({updatedAt: -1});

    const transformedChats = chats.map(chat => {
      const members = [...chat.members];

      if (chat.groupChat) {
        return {
          _id: chat._id,
          groupChat: true,
          avatar: members.slice(0, 3).map(m => m.avatar?.url || null),
          name: chat.name,
          members: members.map(m => m._id)
        };
      }

      const otherMember = members.find(
        m => m._id.toString() !== userId.toString()
      );

      return {
        _id: chat._id,
        groupChat: false,
        avatar: [otherMember?.avatar?.url || null],
        name: otherMember?.name,
        members: [otherMember?._id]
      };
    });

    return res.status(200).json({
      success: true,
      chats: transformedChats
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getMyGroups=  async (req, res, next) => {
    try {
      const chats = await ChatModel.find({
          members: req.user._id,
          groupChat: true,
         creator: req.user._id
      }).populate("members","name avatar")

  
      const groups= chats.map(({_id,name,members,groupchat,avatar})=>{
          return {
              _id,
              name,
              groupchat,
              members,
              avatar: members.slice(0,3).map(({avatar})=>avatar?.url), }
      })
  
      return res.status(201).json({
          success: true,
          groups
      })
    } catch (error) {
      console.log(error)
      return res.status(500).json({
     success: false,
     meassage: message.error ,
   });
    }
};

//put
const addMembers = async (req, res, next) => {
  try {
    const { chatId, members } = req.body;

    console.log("Received chatId:", chatId, members);  

    if (!chatId || !members || members.length === 0) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    const chat = await ChatModel.findById(chatId);

    if (!chat) {
      return res.status(400).json({ message: "Chat not found" });
    }
    if (!chat.groupChat) {
      return res.status(400).json({ message: "Chat is not a group chat" });
    }
    // Only the creator of the group can add members
    if (chat.creator.toString() !== req.user._id.toString()) {
      return res.status(400).json({ message: "Only the creator can add members" });
    }

    // Find all new members' details from the UserModel
    // 'name' is selected for notification message
    
    // DEBUG: Check what member IDs are received
    console.log("DEBUG - Received members:", members);
    
    // Validate member IDs before querying
    const validMemberIds = members.filter(id => {
      const isValid = mongoose.Types.ObjectId.isValid(id);
      if (!isValid) {
        console.log("DEBUG - Invalid ObjectId:", id);
      }
      return isValid;
    });
    
    console.log("DEBUG - Valid member IDs:", validMemberIds);
    
    const allNewMembersPromises = validMemberIds.map((memberId) =>
      UserModel.findById(memberId, "name")
    );


    // Wait for all member queries to finish
    const allNewMembers = await Promise.all(allNewMembersPromises);

        console.log("DEBUG - allNewMembers:", allNewMembers);
        
    // Filter out any null results (users not found in database)
    const foundMembers = allNewMembers.filter(m => m !== null);
    console.log("DEBUG - Found members:", foundMembers);


    // Filter out null results (users not found) and members already in the chat
    // Convert chat.members to strings for proper comparison
    const existingMemberIds = chat.members.map(m => m.toString());
    const validNewMembers = allNewMembers.filter((i) => i && !existingMemberIds.includes(i._id.toString()));

    console.log("DEBUG - validNewMembers:", validNewMembers)



    // Extract their _id for adding to chat
    const uniqueMembers = validNewMembers.map((i) => i);

    // Add all unique new members to the chat
    chat.members.push(...uniqueMembers);

    // Create a readable list of names for alert message
    const allNewUsers = validNewMembers.map((i) => i.name).join(", ");

    await chat.save();

    // Emit socket events to notify all members
    // ALERT event: informs members about new members added
    emitEvent(req, "ALERT", chat.members, `New members added: ${allNewUsers}`);

    // REFETCH_CHATS event: triggers chat refresh on client side
    emitEvent(req, "REFETCH_CHATS", chat.members);

    return res.status(201).json({
      success: true,
      message: "Members added successfully",
      chat
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};


//put
const removeMembers= async (req,res,next)=>{
  try {
    const {chatId, memberId } = req.body
  
    const [chat, userThatWillRemove] = await Promise.all([
      ChatModel.findById(chatId),
      UserModel.findById(memberId,"name")
    ])
  
     if (!chat) {
              return res.status(400).json({message:"chat not found"})
      }
      if (!chat.groupChat) {
              return res.status(400).json({message:"chat not a group chat"})
      }
     if(chat.creator.toString() !== req.user._id.toString()){
          return res.status(400).json({message:"only creator can remove members"})
      }
     
      chat.members= chat.members.filter( userid=> userid._id.toString() !== memberId.toString())
  
      await chat.save()
  
      emitEvent(req ,"ALERT", chat.members, `chat member ${userThatWillRemove} removed`)
  
       return res.status(201).json({
          success: true,
          members:"members removed successfully"
      }) 
  } catch (error) {
              console.log(error)
      return res.status(500).json({
     success: false,
     meassage: error ,
   });
  }


}

const leaveChat= async(req,res,next)=>{
   try {
       const chatId = req.params.id
 
       const chat = await ChatModel.findById(chatId)
 
        if (!chat) {
             return res.status(400).json({message:"chat not found"})
     }
    if (!chat.groupChat) {
             return res.status(400).json({message:"chat not a group chat"})
     }


       const remainingMembers = chat.members.filter(member => member.toString() !== req.user._id.toString())

 
       if(chat.creator.toString() === req.user._id.toString() ){
           const randomMember = Math.floor(Math.random()*remainingMembers.length)
 
           const newCreator = remainingMembers[randomMember]
           chat.creator= newCreator
 
       }

       if (remainingMembers.length === 0) {
        await ChatModel.deleteOne({_id: chatId})
       }else{
 
       chat.members= remainingMembers
 
       await chat.save()}


   } catch (error) {
              console.log(error)
      return res.status(500).json({
     success: false,
     meassage: message.error ,
   });
    
   }
}

const attachments= TryCatch(async(req,res,next)=>{
   const {chatId} = req.body

   console.log(chatId)

   if(!chatId){
        return res.status(400).json({message:"please provide chatId"})
   }

   const [chat, user] = await Promise.all([
    ChatModel.findById(chatId),
    UserModel.findOne(req.user , "name")
   ])

   const files= req.files || []
   console.log(files)

   const attachments= await cloudinaryFilesUpload(files)

   const messageForRealtime= {content:"", 
    attachments,
     sender: {
      name:user.name,
      _id: user._id
     },
     chat:chatId}

   const messageForMongodb={content:"", attachments, sender: user._id, chatId: chatId}

    await MessageModel.create(messageForMongodb)

   emitEvent(req,NEW_MESSAGE,chat.members,{
    message:messageForRealtime,
    chatId
   })
   emitEvent(req,NEW_ATTCAHMENT_ALERT,chat.members,{chatId})
})

const getChatDetails= TryCatch(async(req,res,next)=>{

  if (req.query.populate === true) {
       const chat = await ChatModel.findById(req.params.id).populate({
        path:"members",
        select: "name avatar"
       })
       .lean()  //seee what is lean  ---> without it , it function was giving error

       if (!chat) {return res.status(400).json({message:"chat not found"}) }

      chat.members = chat.members.map(({ _id, name, avatar }) => {
        return{
          _id,
          name,
          avatar:avatar.url
        }
      })

      return res.status(201).json({
          success: true,
          chat
      })

  } else {
    const chat = await ChatModel.findById(req.params.id)

    if (!chat) {return res.status(400).json({message:"chat not found"}) }


    return res.status(201).json({
          success: true,
          chat
      })
  
  }
})

const renameGroup= TryCatch(async(req,res,next)=>{
  const {name} = req.body

  if (!name || name.trim() === "") {
    return res.status(400).json({message: "Name is required"});
  }

 const chat = await ChatModel.findById(req.params.id)
  if (!chat) {return res.status(400).json({message:"chat not found"}) }

  if (!chat.groupChat) {return res.status(400).json({message:"chat not a group chat"}) }

  if(chat.creator.toString() !== req.user._id.toString()){
          return res.status(400).json({message:"only creator can rename"})
      }

  chat.name= name.trim()
  await chat.save()

   return res.status(201).json({
          success: true,
          chat
      })

})

const deleteChat= TryCatch(async(req,res,next)=>{
        const chatId = req.params.id
 
       const chat = await ChatModel.findById(chatId)
 
    if (!chat) {
             return res.status(400).json({message:"chat not found"})
     }
    if (!chat.groupChat) {
             return res.status(400).json({message:"chat not a group chat"})
     }
    if(chat.creator.toString() !== req.user.toString()){
          return res.status(400).json({message:"only creator can rename"})
      }

      // delete from cloudinary

      const messageWithAttachments = await MessageModel.find({
        chat: chatId,
        "attachments.0": { $exists: true , $ne:[] }
      })

      const public_ids= []

      messageWithAttachments.forEach((attachments)=>{
        attachments.forEach((public_id)=> public_ids.push(public_id) )
      })

      await Promise.all([
        //delete from cloudinary
        deleteFilesCloudinary(public_ids),
        chat.deleteOne(),
        MessageModel.deleteMany({chat:chatId})
      ])

      emitEvent(req,"REFETCH_CHATS",members)

      return res.status(201).json({
          success: true,
          message:"deleted sucessfully"
      })
})


const getMessages= TryCatch(async(req,res,next)=>{

  const chatId = req.params.id
  const{ page=1 } = req.query

  console.log(chatId)

  if (!chatId) { return res.status(400).json({message:"chat not found"}) }

  const resultPerPage= 20 // u can say it as limit
  const skip = (page-1)* resultPerPage

  const [messages, getTotalMessages] = await Promise.all([
    MessageModel.find({chatId})
    .sort({createdAt:-1})
    .limit(resultPerPage)
    .skip(skip)
    .populate({path:"sender",select:"name"}),
    MessageModel.countDocuments({chatId})
  ])

  //suppose ---->  totalMessages = 79 ,   limit=20
  //dividing ---> 79/20 = 3.95
  //  math.ceil will give (3.95)= 4

  const totalpages= Math.ceil(getTotalMessages/ resultPerPage) || 0

  return res.status(201).json({
          success: true,
          messages,
          totalpages
      })
})




module.exports= {newGroup, getMyGroups, addMembers,removeMembers,leaveChat, getMyChats ,attachments,
  getChatDetails,renameGroup, deleteChat, getMessages
}





