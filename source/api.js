const mongoose = require("mongoose")
const Schema = mongoose.Schema

const ApiKeySchema = new Schema ({
    name : {
        type : String,
        required : true
    },
    email : {
        type : String,
        required : true
    }, 
    usage : {
        type : String,
        required : true
    },
    lastConnection : {
        type : Date,
        required : false
    }
}, {timestamps : true});


const Apikey = mongoose.model("Apikey", ApiKeySchema)
module.exports = Apikey ;
