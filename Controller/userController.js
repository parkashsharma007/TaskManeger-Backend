const usermodel = require('../Model/userModel')
const mongoose = require('mongoose')

const getProductQuery = (id) => {
    if (mongoose.Types.ObjectId.isValid(id)) {
        return { _id: id }
    }

    const numericId = Number(id)
    if (!Number.isNaN(numericId)) {
        return { id: numericId }
    }

    return { _id: id }
}

const adduser = async (req, res) => {
    try {
        const data = req.body

        const { title, price, category } = data



        if (!title || !price || !category) {
            return res.status(400).json({ message: "Title, Price, and Category are required" })
        }

        const result = await usermodel.create(data)
        return res.status(200).json(result)

    } catch (err) {
        res.status(500).json({ message: err.message })
    }
}




const permanentDeleteUser = async (req, res) => {
    try {
        const { id } = req.params

        const deletedUser = await usermodel.findOneAndDelete(getProductQuery(id))

        if (!deletedUser) {
            return res.status(404).json({ message: "Product not found" })
        }

        return res.status(200).json({
            message: "User permanently deleted",
            data: deletedUser
        })

    } catch (err) {
        res.status(500).json({ message: err.message })
    }
}



const addOne = async (req, res) => {
    try {
        const { id } = req.params

        const data = await usermodel.findOne(getProductQuery(id))

        if (!data) {
            return res.status(404).json({ message: "Product not found" })
        }

        return res.status(200).json(data)

    } catch (error) {
        res.status(400).json({ message: error.message })
    }
}



const findAll = async (req, res) => {
    try {
        // const {searching}=req.query.searching?.trim()
        // let filter = {}
        // if(searching){
        //     filter.title={$regex:searching,$options:'i'}
        // }
        const result = await usermodel.find()
        return res.status(200).json(result)
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
}


const updateUser = async (req, res) => {
    try {
        const { id } = req.params
        const data = req.body

        const cleanData = {
            title: data.title,
            price: data.price ? Number(data.price) : undefined,
            category: data.category,
            description: data.description,
            image: data.image,
            rating: data.rating,
            status: data.status
        }
        Object.keys(cleanData).forEach(key => cleanData[key] === undefined && delete cleanData[key])

        const updated = await usermodel.findOneAndUpdate(getProductQuery(id), cleanData, { new: true })

        if (!updated) {
            return res.status(404).json({ message: "Product not found" })
        }

        return res.status(200).json(updated)

    } catch (err) {
        res.status(500).json({ message: err.message })
    }
}



const deleteUser = async (req, res) => {
    try {
        const { id } = req.params

        const existingUser = await usermodel.findOne(getProductQuery(id))

        if (!existingUser) {
            return res.status(404).json({ message: "Product not found" })
        }
        const newStatus = existingUser.status === 'active' ? 'inactive' : 'active'

        const updated = await usermodel.findOneAndUpdate(
            getProductQuery(id),
            { status: newStatus },
            { new: true }
        )

        return res.status(200).json(updated)

    } catch (err) {
        res.status(500).json({ message: err.message })
    }
}


module.exports = {
    adduser,
    addOne,
    findAll,
    updateUser,
    deleteUser,
    permanentDeleteUser
}
