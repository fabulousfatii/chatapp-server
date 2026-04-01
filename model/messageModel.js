const { default: mongoose } = require('mongoose');
const {Schema} = require('mongoose')

const messageSchema = new Schema({
    sender: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    content: {type: String, trim: true},
    chatId: {type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true},
    attachments: [{
        publicId: {type: String},
        url: {type: String},
    }]
}, {timestamps: true})

const MessageModel = mongoose.model('Message', messageSchema);
module.exports= MessageModel