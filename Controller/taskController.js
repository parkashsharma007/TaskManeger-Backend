const sendmail = require("../config/nodemailer");
const authModel = require("../Model/authModel");
const taskModel = require("../Model/taskModel");
const Task = require("../Model/taskModel");
const tts = require("google-tts-api")
const uploadBufferToCloudinary = require("../config/cloudinaryUpload");

const isAdmin = (user) => user?.role === "admin"
const priorityOrder = { high: 1, medium: 2, low: 3 }
const validPriorities = Object.keys(priorityOrder)
const canViewTask = (task, userId) =>
    String(task.assignBy) === String(userId) || String(task.assignTo) === String(userId)
const canUpdateTaskStatus = (task, userId) =>
    String(task.assignTo) === String(userId) || String(task.assignBy) === String(userId)

const normalizePriority = (priority) => {
    if (!priority) return "medium"

    const normalizedPriority = String(priority).toLowerCase()
    return validPriorities.includes(normalizedPriority) ? normalizedPriority : null
}

const sortTasksByPriority = (tasks) => tasks.sort((a, b) => {
    const priorityDiff = (priorityOrder[a.priority] || priorityOrder.medium) - (priorityOrder[b.priority] || priorityOrder.medium)
    if (priorityDiff !== 0) return priorityDiff

    return new Date(b.createdDate || b.createdAt || 0) - new Date(a.createdDate || a.createdAt || 0)
})

const normalizeTaskDates = (createdDate, dueDate) => {
    const normalizedCreatedDate = createdDate ? new Date(createdDate) : new Date()
    const normalizedDueDate = dueDate ? new Date(dueDate) : null

    if (Number.isNaN(normalizedCreatedDate.getTime())) {
        return { error: "Invalid created date" }
    }

    if (normalizedDueDate && Number.isNaN(normalizedDueDate.getTime())) {
        return { error: "Invalid due date" }
    }

    if (normalizedDueDate && normalizedDueDate < normalizedCreatedDate) {
        return { error: "Due date cannot be earlier than created date" }
    }

    return {
        createdDate: normalizedCreatedDate,
        dueDate: normalizedDueDate
    }
}

// CREATE TASK
const createTask = async (req, res) => {
    try {
        const { title, description, assignTo, createdDate, dueDate, priority } = req.body



        if (!title || !assignTo) {
            return res.status(400).json({
                message: "Required fields missing"
            })
        }

        const normalizedDates = normalizeTaskDates(createdDate, dueDate)

        if (normalizedDates.error) {
            return res.status(400).json({ error: normalizedDates.error })
        }

        const normalizedPriority = normalizePriority(priority)

        if (!normalizedPriority) {
            return res.status(400).json({ error: "Priority must be high, medium, or low" })
        }

        const taskPayload = {
            title,
            description,
            assignTo,
            assignBy: req.user._id,
            priority: normalizedPriority,
            createdDate: normalizedDates.createdDate,
            dueDate: normalizedDates.dueDate
        }

        // Handle file upload
        if (req.files && req.files.file && req.files.file[0]) {
            const uploadedFile = await uploadBufferToCloudinary(req.files.file[0], "tasks/files")
            taskPayload.fileUrl = uploadedFile.secure_url
            taskPayload.filePublicId = uploadedFile.public_id
            taskPayload.fileOriginalName = req.files.file[0].originalname
        }

        // Handle background image upload
        if (req.files && req.files.backgroundImage && req.files.backgroundImage[0]) {
            const uploadedBgImage = await uploadBufferToCloudinary(req.files.backgroundImage[0], "tasks/background")
            taskPayload.backgroundImage = uploadedBgImage.secure_url
            taskPayload.backgroundImagePublicId = uploadedBgImage.public_id
        }

        const task = await Task.create(taskPayload)


        const assignUser = await authModel.findById(assignTo)

        if (!assignUser) {
            return res.status(404).json({
                message: "Assigned user not found"
            })
        }



        await sendmail(
            assignUser.email,
            "new task assgined",
            `hello ${assignUser.name},

    you have been assigned a task.

    task:${title}
    due date:${dueDate || "Not set"}
    file:${task.fileUrl || "No file attached"}`
        )
        res.status(201).json({
            message: "Task Created and mail send succesfuly",
            task
        })

    } catch (err) {
        res.status(err.statusCode || 500).json({ message: err.message, error: err.message })
    }
}



const genrateaudio = async (req, res) => {
    try {
        const { text } = req.body

        if (!text) {
            return res.status(400).json({ message: "text is required" })
        }

        const url = tts.getAudioUrl(text, {
            lang: "en",
            slow: false,
            host: "https://translate.google.com",
        })

        res.json({ url })

    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}


/// GET ALL TASKS
const getAllTasks = async (req, res) => {
    try {
        const includeDeleted = isAdmin(req.user) && req.query.includeDeleted === "true"

        const query = isAdmin(req.user)
            ? { ...(includeDeleted ? {} : { isDeleted: false }) }
            : {
                isDeleted: false,
                $or: [
                    { assignTo: req.user._id },
                    { assignBy: req.user._id }
                ]
            }

        const tasks = await Task.find(query)
            .populate("assignTo", "name email")
            .populate("assignBy", "name email")

        res.json(sortTasksByPriority(tasks))

    } catch (err) {
        res.status(err.statusCode || 500).json({ message: err.message, error: err.message })
    }
}




// VIEW TASK BY ID
const viewTask = async (req, res) => {
    try {

        const task = await Task.findById(req.params.id)
            .populate("assignTo")
            .populate("assignBy")

        if (!task) {
            return res.status(404).json({
                message: "Task not found"
            })
        }

        if (task.isDeleted) {
            return res.status(404).json({
                message: "Task not found"
            })
        }

        if (!isAdmin(req.user) && !canViewTask(task, req.user._id)) {
            return res.status(403).json({
                message: "You are not allowed to view this task"
            })
        }

        res.json(task)

    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}



// ASSIGNED to me tasks
const assignedToMe = async (req, res) => {
    try {

        const tasks = await Task.find({
            assignTo: req.user._id,
            isDeleted: false
        }).populate("assignBy", "name email")

        res.json(sortTasksByPriority(tasks))

    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}



// TASKS ASSIGNED by me
const assignedByMe = async (req, res) => {
    try {

        const tasks = await Task.find({
            assignBy: req.user._id,
            isDeleted: false
        }).populate("assignTo", "name email")

        res.json(sortTasksByPriority(tasks))

    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}



// UPDATE  ke liye
const updateTask = async (req, res) => {
    try {
        const existingTask = await Task.findById(req.params.id)

        if (!existingTask || existingTask.isDeleted) {
            return res.status(404).json({ message: "Task not found" })
        }

        const {
            title,
            description,
            status,
            priority,
            assignTo,
            createdDate,
            dueDate
        } = req.body

        const requestKeys = Object.keys(req.body || {}).filter((key) => req.body[key] !== undefined)
        const isStatusOnlyUpdate = requestKeys.length === 1 && requestKeys[0] === "status"
        const assignToChanged = assignTo && String(assignTo) !== String(existingTask.assignTo)

        if (!isAdmin(req.user)) {
            if (!isStatusOnlyUpdate || !canUpdateTaskStatus(existingTask, req.user._id)) {
                return res.status(403).json({ message: "You are not allowed to update this task" })
            }
        }

        if (assignToChanged && !isAdmin(req.user)) {
            return res.status(403).json({ message: "Only admin can reassign a task" })
        }

        const normalizedDates = normalizeTaskDates(
            createdDate || existingTask.createdDate,
            dueDate === null ? null : (dueDate || existingTask.dueDate)
        )

        if (normalizedDates.error) {
            return res.status(400).json({ error: normalizedDates.error })
        }

        const normalizedPriority = normalizePriority(priority || existingTask.priority)

        if (!normalizedPriority) {
            return res.status(400).json({ error: "Priority must be high, medium, or low" })
        }

        const updatePayload = isStatusOnlyUpdate
            ? { status }
            : {
                title,
                description,
                status,
                priority: normalizedPriority,
                assignTo: assignTo || existingTask.assignTo,
                createdDate: normalizedDates.createdDate,
                dueDate: normalizedDates.dueDate
            }

        if (req.files && req.files.file && req.files.file[0] && !isStatusOnlyUpdate) {
            const uploadedFile = await uploadBufferToCloudinary(req.files.file[0], "tasks/files")
            updatePayload.fileUrl = uploadedFile.secure_url
            updatePayload.filePublicId = uploadedFile.public_id
            updatePayload.fileOriginalName = req.files.file[0].originalname
        }

        // Handle background image upload
        if (req.files && req.files.backgroundImage && req.files.backgroundImage[0] && !isStatusOnlyUpdate) {
            const uploadedBgImage = await uploadBufferToCloudinary(req.files.backgroundImage[0], "tasks/background")
            updatePayload.backgroundImage = uploadedBgImage.secure_url
            updatePayload.backgroundImagePublicId = uploadedBgImage.public_id
        }

        const task = await Task.findByIdAndUpdate(
            req.params.id,
            updatePayload,
            { new: true }
        )

        res.json(task)

    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}



// SOFT DELETE
const deleteTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)

        if (!task || task.isDeleted) {
            return res.status(404).json({ message: "Task not found" })
        }

        if (!isAdmin(req.user)) {
            return res.status(403).json({ message: "Only admin can delete tasks" })
        }

        await Task.findByIdAndUpdate(
            req.params.id,
            { isDeleted: true }
        )

        res.json({
            message: "Task soft deleted"
        })

    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}



// RESTORE SOFT DELETED TASK
const restoreTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)

        if (!task) {
            return res.status(404).json({ message: "Task not found" })
        }

        if (!isAdmin(req.user)) {
            return res.status(403).json({ message: "Only admin can restore tasks" })
        }

        await Task.findByIdAndUpdate(
            req.params.id,
            { isDeleted: false }
        )

        res.json({
            message: "Task restored"
        })

    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}



// PERMANENT DELETE
const permanentDelete = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)

        if (!task) {
            return res.status(404).json({ message: "Task not found" })
        }

        if (!isAdmin(req.user)) {
            return res.status(403).json({ message: "Only admin can permanently delete tasks" })
        }

        await Task.findByIdAndDelete(req.params.id)

        res.json({
            message: "Task deleted permanently"
        })

    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}



module.exports = {
    addTask: createTask,
    getTasks: getAllTasks,
    viewTask,
    assignedToMe,
    assignedByMe,
    updateTask,
    deleteTask,
    restoreTask,
    permanentDelete,
    genrateaudio
}
