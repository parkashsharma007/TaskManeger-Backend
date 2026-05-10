const mongoose = require('mongoose')


const schema = mongoose.Schema

const Cartschema = new schema({
    id: {
        type: Number
    },
    title: {
        type: String
    },
    price: {
        type: Number
    },
    description: {
        type: String
    },
    category: {
        type: String
    },
    image: {
        type: String
    },
    rating: {
        rate: {
            type: Number
        },
        count: {
            type: Number
        }
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    isSavedToDb: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
})

module.exports = mongoose.model('employe',Cartschema)