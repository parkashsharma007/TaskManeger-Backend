const jwt = require('jsonwebtoken')
const secretKey = 'wqer4t5yu6idgfhjbvbvnby'

const authUser = require('../Model/authModel')



module.exports = async(req,res,next)=>{
       try {
        const authToken = req.headers.authorization
        if(!authToken){
             return res.status(400).json({message:"authtoken is not found"})
        }
        

        const token = authToken.split(' ')[1]
        if(!token){
             return res.status(400).json({message:"token not found"})
        }
        

        const decode = jwt.verify(token,secretKey)
        if(!decode){
        return res.status(400).json({message:"invilud user"})
        }
        
        const email  = decode.email
        const User = await authUser.findOne({email})
        
        if(!User){
                    return res.status(400).json({message:"user not found"})
        }
        if(User.isActive === false){
                    return res.status(403).json({message:"Your account is inactive. Please contact admin."})
        }
        req.user = User
        next()
       } catch (error) {
        return res.status(400).json({message:error.message})
       }
}
