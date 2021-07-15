const { StreamingQuerystring } = require("formidable");
const mongoose = require("mongoose")
const Schema = mongoose.Schema

const linkSchema = new Schema ({
    link : {
        type : String,
        required : true
    }, 
    link_to_share : {
        type : String,
        required : true
    },
    code : {
        type : Number,
        required : true
    },
    pin : {
        type : Number, 
        required : true
    },
    connections : {
        type : [{ipaddress : String , date : String, operating_system : String, browser : String, browser_version : Number, location : String}],
        required : false
    },
    ipaddress : {
        type : String,
        required : false
    }, 
    date : {
        type : Number,
        required : false
    },
    operating_system : {
        type : String,
        required : false
    },
    browser : {
        type : String,
        required : false
    },
    browser_version : {
        type : Number, 
        required : false
    },
    location : {
        type : String, 
        required : false
    }
}, {timestamps : true});


const Link = mongoose.model("Link", linkSchema)
module.exports = Link ;
