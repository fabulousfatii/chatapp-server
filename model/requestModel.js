const { default: mongoose } = require('mongoose');
const {Schema} = require('mongoose')

const requestSchema = new Schema({
    sender: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    receiver: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    status: {type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending'}
}, {timestamps: true})


const RequestModel = mongoose.model('Request', requestSchema);

module.exports= RequestModel
