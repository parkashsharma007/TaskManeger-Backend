const mongoose = require('mongoose')

const schema = mongoose.Schema

const modelSchema = new schema({
    name: {
        type: String,
        unique: false
    },
    colour: {
        type: String
    },
    price: {
        type: Number
    },
    quantity: {
        type: Number
    },
    image: {
        type: String
    },
    imagePublicId: {
        type: String
    },
    uploadFileUrl: {
        type: String
    },
    uploadFilePublicId: {
        type: String
    },
    userId: {
        type:  mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: false
    },
    status: {
        type: String,
        default: 'active',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    versionKey: false
})

module.exports = mongoose.model('productt', modelSchema)
