
const { default: mongoose } = require('mongoose');
const {Schema} = require('mongoose');

const UserSchema= new Schema({
    username: {type: String, required: true, unique: true},
    name: {type: String, required: true},
    password: {type: String, required: true},
avatar:{
        publicId: {type: String},
        url: {type: String},
    }}, {timestamps: true})

const UserModel= mongoose.model('User', UserSchema);

 module.exports= UserModel