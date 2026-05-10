const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: 'dqfhn7rw3',
    api_key: '382695276612379',
    api_secret: '3XWIpGNiRSe2K2Cs2t9-fUtPPY0'
})

const uploadBufferToCloudinary = async (file, folder) => {
    if (!file) {
        throw new Error('No file provided for upload')
    }

    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: 'auto'
            },
            (error, result) => {
                if (error) {
                    reject(error)
                } else {
                    resolve(result)
                }
            }
        ).end(file.buffer)
    })
}

uploadBufferToCloudinary.isCloudinaryConfigError = (error) => {
    return error.message && error.message.includes('Cloudinary')
}

module.exports = uploadBufferToCloudinary
