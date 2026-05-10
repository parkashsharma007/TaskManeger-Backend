const multer = require('multer');

const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true)
        return
    }

    cb(new Error('Only Excel, image, PDF, text, Word and PPT files are allowed'))
}

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024
    }
})

module.exports = upload

