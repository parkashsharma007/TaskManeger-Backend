const productModel = require('../Model/productModel')
const cron = require('node-cron')
const XLSX = require('xlsx')
const tts = require('google-tts-api')
const https = require('https')
const sendmail = require('../config/nodemailer')
const os = require('os')
const uploadBufferToCloudinary = require('../config/cloudinaryUpload')

const getBaseUrl = (req) => `${req.protocol}://${req.get('host')}`

const getProductAudioUrl = (req, text) =>
    `${getBaseUrl(req)}/products/audio?text=${encodeURIComponent(text)}`

const notifyProductChange = async (user, subject, text) => {
    if (!user?.email) {
        return { sent: false, error: 'User email not found' }
    }

    try {
        await sendmail(user.email, subject, text)
        return { sent: true }
    } catch (err) {
        console.error('Product email error:', err.message)
        return { sent: false, error: err.message }
    }
}

const addProduct = async (req, res) => {
    try {
        const data = req.body
        const {name, colour, price, quantity} = data

        if (!name || !colour || !price || !quantity) {
            return res.status(400).json({ message: "All fields are required" })
        }
        const user = req.user._id
        data.userId = user

        if (req.file) {
            const uploadedImage = await uploadBufferToCloudinary(req.file, 'products/images')
            data.image = uploadedImage.secure_url
            data.imagePublicId = uploadedImage.public_id
        }

        const result = await productModel.create(data)
        const mail = await notifyProductChange(
            req.user,
            'Product Added Successfully',
            `Hello ${req.user.name},

Your product has been added successfully.

Product: ${name}
Colour: ${colour}
Price: ${price}
Quantity: ${quantity}`
        )
        const audioUrl = getProductAudioUrl(req, 'Product added successfully')

        return res.status(200).json({
            message: "Product added successfully",
            data: result,
            audioUrl,
            mailSent: mail.sent,
            mailError: mail.error
        })

    } catch (err) {
        res.status(err.statusCode || 500).json({ message: err.message })
    }
}

const playProductAudio = (req, res) => {
    try {
        const text = req.query.text || 'Product added successfully'
        const url = tts.getAudioUrl(text, {
            lang: 'en',
            slow: false,
            host: 'https://translate.google.com',
        })

        res.setHeader('Content-Type', 'audio/mpeg')
        res.setHeader('Cache-Control', 'no-store')

        https.get(url, (audioResponse) => {
            if (audioResponse.statusCode !== 200) {
                return res.status(502).json({ message: 'Failed to load audio' })
            }

            audioResponse.pipe(res)
        }).on('error', (err) => {
            res.status(500).json({ message: err.message })
        })
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
}

cron.schedule('0 0 0 * * *', () => {
    console.log('Running daily cleanup task at midnight');
});

// Get all products
const getAllProducts = async (req, res) => {
    try {
        console.log('>>>>cpu',os.cpus())
        console.log('>>>>cpu',os.totalmem())
        console.log('>>>>cpu',os.freemem())
        console.log('>>>>cpu',os.platform())
        const user = req.user._id
        const result = await productModel.find({ userId: user }).populate('userId')
        return res.status(200).json(result)
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
}

// Get single product
const getOneProduct = async (req, res) => {
    try {
        const { id } = req.params
        const userId = req.user._id
        const data = await productModel.findById(id)
        if (!data) {
            return res.status(404).json({ message: "Product not found" })
        }

        if (data.userId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Not authorized to access this product" })
        }

        return res.status(200).json(data)

    } catch (error) {
        res.status(400).json({ message: error.message })
    }
}

const getAllProductsAdmin = async (req,res)=>{
    console.log(req.body)
    try{
        if(req.user.role !== "admin"){
            return res.status(403).json({
                message:"Only admin can access"
            })
        }
        console.log(req.user)

        const products = await productModel
        .find({})
        .populate('userId')
        .sort({createdAt:-1})

        res.status(200).json({ total: products.length,data: products})

    }catch(err){
        res.status(500).json({
            message:err.message
        })
    }
}
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params
        const userId = req.user._id
        const data = req.body

        const product = await productModel.findById(id)

        if (!product) {
            return res.status(404).json({ message: "Product not found" })
        }

        const isOwner = product.userId.toString() === userId.toString()
        const isAdmin = req.user.role === 'admin'

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "Not authorized to update this product" })
        }

        if (req.file) {
            const uploadedImage = await uploadBufferToCloudinary(req.file, 'products/images')
            data.image = uploadedImage.secure_url
            data.imagePublicId = uploadedImage.public_id
        }

        const updated = await productModel.findByIdAndUpdate(id, data, { new: true })

        return res.status(200).json(updated)

    } catch (err) {
        res.status(500).json({ message: err.message })
    }
}

// Soft delete - mark as inactive
const softDeleteProduct = async (req, res) => {
    try {
        const { id } = req.params
        const userId = req.user._id

        const product = await productModel.findById(id)

        if (!product) {
            return res.status(404).json({ message: "Product not found" })
        }

        const isOwner = product.userId.toString() === userId.toString()
        const isAdmin = req.user.role === 'admin'

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "Not authorized to delete this product" })
        }

        const updated = await productModel.findByIdAndUpdate(
            id,
            { isActive: false, status: 'inactive' },
            { new: true }
        )

        return res.status(200).json(updated)

    } catch (err) {
        res.status(500).json({ message: err.message })
    }
}

const restoreProduct = async (req, res) => {
    try {
        const { id } = req.params
        const userId = req.user._id

        const product = await productModel.findById(id)

        if (!product) {
            return res.status(404).json({ message: "Product not found" })
        }

        const isOwner = product.userId.toString() === userId.toString()
        const isAdmin = req.user.role === 'admin'

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "Not authorized to restore this product" })
        }

        const restored = await productModel.findByIdAndUpdate(
            id,
            { isActive: true, status: 'active' },
            { new: true }
        )

        return res.status(200).json({
            message: "Product restored successfully",
            data: restored
        })

    } catch (err) {
        res.status(500).json({ message: err.message })
    }
}

// Hard delete - permanently remove
const permanentDeleteProduct = async (req, res) => {
    try {
        const { id } = req.params
        const userId = req.user._id

        const product = await productModel.findById(id)

        if (!product) {
            return res.status(404).json({ message: "Product not found" })
        }

        const isOwner = product.userId.toString() === userId.toString()
        const isAdmin = req.user.role === 'admin'

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "Not authorized to delete this product" })
        }

        const deleted = await productModel.findByIdAndDelete(id)

        return res.status(200).json({
            message: "Product permanently deleted",
            data: deleted
        })

    } catch (err) {
       
        res.status(500).json({ message: err.message })
    }

}

 const uploadExcel = async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ message: "No file uploaded" })
            }

            if (!req.user?._id) {
                return res.status(401).json({ message: "Unauthorized user" })
            }

            const uploadedFile = await uploadBufferToCloudinary(req.file, 'products/excel')
            const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
            const sheetName = workbook.SheetNames[0]
            const excelData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
                defval: ''
            })

            if (!excelData.length) {
                return res.status(400).json({ message: "Excel file is empty" })
            }

            const formattedData = excelData.map((item) => ({
                name: item.name,
                colour: item.colour,
                price: Number(item.price),
                quantity: Number(item.quantity),
                userId: req.user._id
            }))

            const invalidRow = formattedData.find((item) =>
                !item.name ||
                !item.colour ||
                Number.isNaN(item.price) ||
                Number.isNaN(item.quantity)
            )

            if (invalidRow) {
                return res.status(400).json({
                    message: "Invalid Excel data. Required columns: name, colour, price, quantity"
                })
            }

            const formattedDataWithUpload = formattedData.map((item) => ({
                ...item,
                uploadFileUrl: uploadedFile.secure_url,
                uploadFilePublicId: uploadedFile.public_id
            }))

            await productModel.insertMany(formattedDataWithUpload)

            const allproducts = await productModel.find({ userId: req.user._id })
            const mail = await notifyProductChange(
                req.user,
                'Bulk Products Uploaded Successfully',
                `Hello ${req.user.name},

Your Excel bulk upload has been completed successfully.

Total products uploaded: ${formattedData.length}`
            )
            const audioUrl = getProductAudioUrl(req, 'Bulk data added successfully')

            res.status(200).json({
                message: "bulk data stored successfully",
                data: allproducts,
                file: {
                    url: uploadedFile.secure_url,
                    publicId: uploadedFile.public_id,
                    originalName: req.file.originalname
                },
                audioUrl,
                mailSent: mail.sent,
                mailError: mail.error
            })

        } catch (err) {
            res.status(500).json({ message: err.message })
        }
    }

module.exports = {
    addProduct,
    getAllProducts,
    getOneProduct,
    updateProduct,
    softDeleteProduct,
    restoreProduct,
    permanentDeleteProduct,
    getAllProductsAdmin,
    uploadExcel,
    playProductAudio
}
