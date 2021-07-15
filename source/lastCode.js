const mongoose = require("mongoose")
const Schema = mongoose.Schema

const LastCodeSchema = new Schema ({
    lastCode : {
        type : Number,
        required : true
    }
}, {timestamps : true});


const LastCode = mongoose.model("LastCode", LastCodeSchema)
module.exports = LastCode ;
