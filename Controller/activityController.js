const activitymodel = require('../Model/ActivityModel');
const os = require('os');

const getActivity = async (req,res)=>{
    try {
        const activity = await activitymodel.find().sort({time:-1});

        const data = activity.map((item)=>{
            return {
                __id:item._id,
                title:"login activity",
                message:`${item.userSession} logged in`,
                userId:item.userId,
                userName:item.userName,
                email:item.email || item.userSession,
                userSession:item.userSession,
                systemInfo:item.systemInfo,
                ipAddress:item.ipAddress,
                userAgent:item.userAgent,
                browserInfo:item.browserInfo,
                platform:item.platform,
                loginAt:item.loginAt,
                time:item.time,
                date:item.Date
            }
        })

        res.status(200).json({message:"activity fetched successfully",data})

    } catch (error) {
        res.status(500).json({message:error.message})
    }
}

module.exports = {
    getActivity
}
