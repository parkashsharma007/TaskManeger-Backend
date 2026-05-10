const mongoose = require('mongoose');

const schema = mongoose.Schema;


const activitySchema = new schema({
   userSession:{
    type:String,
   },
   userId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'user'
   },
   userName:{
    type:String
   },
   email:{
    type:String
   },
   time:{
    type:Date,
    default:Date.now
    },
    Date:{
        type:Date,
        default:Date.now
    },
    systemInfo:{
        type:Object,
    },
    ipAddress:{
        type:String,
    },
    userAgent:{
        type:String,
    },
    browserInfo:{
        type:String,
    },
    loginAt:{
        type:Date,
        default:Date.now
    },
    platform:{
        type:String,
    },
})

module.exports = mongoose.models.connectedActivity || mongoose.model('connectedActivity',activitySchema)
