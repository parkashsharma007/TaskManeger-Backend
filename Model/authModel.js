const mongoose = require('mongoose')

const schema = mongoose.Schema

const userSchema = new schema({
    name:{
        type:'String',
        required:true
    },
    email:{
        type:'String',
        required:true,
        unique:true
    },
    phoneNumber:{
        type:String,
        default:""
    },
    image:{
        type:String,
        default:""
    },
    imagePublicId:{
        type:String,
        default:""
    },
    backgroundImage:{
        type:String,
        default:""
    },
    backgroundImagePublicId:{
        type:String,
        default:""
    },
    password:{
        type:'String',
        required:true
    },
role:{
 type:String,
 enum:["user","admin"],
    default:"user"
},
isActive:{
    type:Boolean,
    default:true
},
otp:{
    type:String
},
otpExpire:{
    type:Date
}
})

module.exports  = mongoose.model('user',userSchema)
