const express = require('express')
const app = express()
const port = 3000
const cors = require('cors');
const {createServer}= require('http');
const cookieParser = require('cookie-parser');
const { connectdb } = require('./db');
const userRouter = require("./routers/userRouter")
const chatRouter = require("./routers/chatRouter")
const { v2: cloudinary } = require('cloudinary');





// app.use(cors({
//   origin: 'https://chatapp-client-zeta.vercel.app',  
//   credentials:true
// }
// ))

const allowedOrigins = [
  "http://localhost:5173",
  "https://chatapp-client-zeta.vercel.app"
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded())
app.use(cookieParser())
connectdb()

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_NAME, 
  api_key:  process.env.CLOUDINARY_API_KEY, 
  api_secret:  process.env.CLOUDINARY_API_SECRET
});


app.use("/api/users", userRouter)
app.use("/api/chats", chatRouter)

//require for socket.io
const {Server} = require("socket.io");
const { getSocketIds, userSocketIDs } = require('./utils/features');
const { socketAuthMiddleware } = require('./middleware/authMiddleware');
const { NEW_MESSAGE, START_TYPING, STOP_TYPING} = require('./constants/events');
const MessageModel = require('./model/messageModel');
const ChatModel = require('./model/chatModel');
const server = createServer(app)
const io = new Server(server, {
  cors: {
  origin:  [
      "http://localhost:5173",
      "https://chatapp-client-zeta.vercel.app"
    ], 
  credentials:true

  
  }
});


app.set("io",io)

io.use((socket, next) => {
  // console.log("Middleware executed");
 
  cookieParser()(
    socket.request,
    socket.request.res,
    async () => await socketAuthMiddleware(socket, next)
  )
})


io.on('connection', async (socket) => {
  //  console.log('a user connected', socket.user._id);
  userSocketIDs.set(socket.user._id.toString(), socket.id)
  
  

  let user = socket.user;

  socket.on(NEW_MESSAGE,async({chatId,message ,members })=>{

    
    const data = {
      chatId,
      content:message,
      members,
      sender:{
        _id: user._id.toString(),
        name:user.name
      },
      id: Date.now(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      // createdAt: new Date().toISOString()

    }
     
    const membersSocketId= getSocketIds(socket,members)

    // console.log(membersSocketId)

  io.to(membersSocketId).emit(NEW_MESSAGE,{  
    message:data})

   io.to(membersSocketId).emit("NEW_MESSAGE_ALERT",{ chatId, data})

      const msgForDB= {
    content: message, 
    sender: user._id, 
    chatId:chatId,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  await MessageModel.create(msgForDB)

  await ChatModel.findByIdAndUpdate(chatId, {}, {new:true})
  })

  socket.on(START_TYPING, ({chatId,members})=>{
    const membersSocketId= getSocketIds(socket,members)
    io.to(membersSocketId).emit("START_TYPING",{chatId})
  })
  socket.on(STOP_TYPING, ({chatId,members})=>{
    const membersSocketId= getSocketIds(socket,members)
    io.to(membersSocketId).emit("STOP_TYPING",{chatId})
  })

  

  socket.on("NEW_GROUP", ({groupName,members})=>{
    // console.log("new group created", groupName, members);
    const membersSocketId= getSocketIds(members)
    io.to(membersSocketId).emit("NEW_GROUP",{name:groupName})
  })

  socket.on("disconnect",()=>{
    // console.log("user disconnected");
      userSocketIDs.delete(socket.user._id.toString())

  })
})




server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

app.get('/', (req, res) => {
  res.send('Hello World!')
})
