const cartmodel = require('../Model/cartModel')

const adduser = async (req, res) => {
    try {
        const data = req.body

        const { title, price, category } = data

        // if (!title || !price || !category) {
        //     return res.status(400).json({ message: "Title, Price, and Category are required" })
        // }
        const result = await cartmodel.insertMany(data)
        return res.status(200).json(result)
        


    } catch (err) {
        res.status(500).json({ message: err.message })
    }
}

const findAll = async (req, res) => {
    try {
        const data = req.body
        const result = await cartmodel.find()
        return res.status(200).json(result)
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
}

const alldelete = async(req,res)=>{
    try {
         const {id} = req.params
     const result = await cartmodel.findByIdAndDelete(id)
     if(!result){
        return res.status(400).json({message:"user not found",
             data:result
        })
        
     }
      return res.status(200).json({
            message: "Deleted successfully",
            data: result
        })
    } catch (error) {
       return res.status(404).json({message:error.message})   
    }

}

module.exports  ={adduser,findAll,alldelete}
