const mongoose = require('mongoose')

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String,
        trim: true
    },

    assignTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },

    assignBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },

    status: {
        type: String,
        enum: ["pending", "in-progress", "completed"],
        default: "pending"
    },

    priority: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium"
    },

    createdDate: {
        type: Date,
        default: Date.now
    },

    dueDate: {
        type: Date,
        default: null
    },

    fileUrl: {
        type: String,
        default: ""
    },

    filePublicId: {
        type: String,
        default: ""
    },

    fileOriginalName: {
        type: String,
        default: ""
    },

    backgroundImage: {
        type: String,
        default: ""
    },

    backgroundImagePublicId: {
        type: String,
        default: ""
    },

    isDeleted: {
        type: Boolean,
        default: false
    },


}, { timestamps: true })

module.exports = mongoose.model("task", taskSchema)
