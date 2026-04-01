const { default: mongoose } = require('mongoose');
const {Schema} = require('mongoose')



const chatSchema = new Schema({
    name: {type: String, required: true},
    groupChat: {type: Boolean, default: false},
    members: [{type: Schema.Types.ObjectId, ref: 'User'}],
    creator: {type: Schema.Types.ObjectId, ref: 'User'},
    avatar:{
        publicId: {type: String},
        url: {type: String},
    }
}, {timestamps: true})


 const ChatModel = mongoose.model('Chat', chatSchema);

 module.exports = ChatModel