const mongoose = require("mongoose")
const Schema = mongoose.Schema

const CookieSchema = new Schema ({
    ipaddress : {
        type : String, 
        required : true
    }, 
    used_codes : {
        type : [{code : Number, pin : Number}],
        required : false
    },
    acceptedterm : {
        type : Boolean, 
        required : true
    }
    
}, {timestamps : true});


const Cookie = mongoose.model("Cookie", CookieSchema)
module.exports = Cookie ;
