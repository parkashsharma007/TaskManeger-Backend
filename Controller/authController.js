const authModel = require('../Model/authModel')
const bcrypt = require('bcrypt')
const { request } = require('express')
const secretKey = 'wqer4t5yu6idgfhjbvbvnby'
const jwt = require('jsonwebtoken')
const sendmail = require('../config/nodemailer')
const moment = require('moment')
const os = require('os')
const uploadBufferToCloudinary = require('../config/cloudinaryUpload')

const ActivityModel = require('../Model/ActivityModel')




const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: "All fields are required" })
        }

        const email = req.user.email
        const user = await authModel.findOne({ email })

        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password)

        if (!isMatch) {
            return res.status(400).json({ message: "Old password is incorrect" })
        }

        const salt = bcrypt.genSaltSync(10)
        const hash = bcrypt.hashSync(newPassword, salt)

        user.password = hash
        await user.save()

        return res.status(200).json({ message: "Password changed successfully" })
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message })
    }
}

const updateProfile = async (req, res) => {
    try {
        const { name, phoneNumber } = req.body

        if (!name) {
            return res.status(400).json({ message: "Name is required" })
        }

        if (phoneNumber && !/^\d{10,15}$/.test(String(phoneNumber))) {
            return res.status(400).json({ message: "Phone number must be 10 to 15 digits" })
        }

        const updatePayload = { name, phoneNumber: phoneNumber || "" }
        let imageUploadWarning = ""
        let warnings = []

        // Handle profile image upload
        if (req.files && req.files.image && req.files.image[0]) {
            try {
                const uploadedImage = await uploadBufferToCloudinary(req.files.image[0], 'users/profile')
                updatePayload.image = uploadedImage.secure_url
                updatePayload.imagePublicId = uploadedImage.public_id
            } catch (uploadError) {
                if (!uploadBufferToCloudinary.isCloudinaryConfigError(uploadError)) {
                    throw uploadError
                }
                warnings.push(`Profile image upload failed: ${uploadError.message}`)
            }
        }

        // Handle background image upload
        if (req.files && req.files.backgroundImage && req.files.backgroundImage[0]) {
            try {
                const uploadedBgImage = await uploadBufferToCloudinary(req.files.backgroundImage[0], 'users/background')
                updatePayload.backgroundImage = uploadedBgImage.secure_url
                updatePayload.backgroundImagePublicId = uploadedBgImage.public_id
            } catch (uploadError) {
                if (!uploadBufferToCloudinary.isCloudinaryConfigError(uploadError)) {
                    throw uploadError
                }
                warnings.push(`Background image upload failed: ${uploadError.message}`)
            }
        }

        const user = await authModel
            .findByIdAndUpdate(
                req.user._id,
                updatePayload,
                { new: true, runValidators: true }
            )
            .select("_id name email phoneNumber image backgroundImage role")

        return res.status(200).json({
            message: warnings.length > 0
                ? `Profile updated successfully, but with warnings: ${warnings.join(', ')}`
                : "Profile updated successfully",
            warnings: warnings.length > 0 ? warnings : [],
            user
        })
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message })
    }
}


/* ---------- Old public signup (disabled). Admin adds users now. ----------
const signup = async (req, res) => {
    try {
        const data = req.body
        const { name, email, password } = data
        if (!(name, email, password)) {
            return res.status(400).json({ message: "all fields are required" })
        }
        const olduser = await authModel.findOne({ email: email })
        if (olduser) {
            return res.status(200).json({ message: "user already exist" })
        }
        const genSaltSync = bcrypt.genSaltSync(10)
        const hashsync = bcrypt.hashSync(password, genSaltSync)
        const result = await authModel.create({
            name, email, password: hashsync,
        })
        return res.status(200).json(result)
    } catch (error) {
        return res.status(400).json({ message: error.message })
    }
}
-------------------------------------------------------------------------- */

// Admin-only: create a normal user so they can log in with email + password later.
const addUserByAdmin = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Only admin can add users" })
        }

        const { name, email, password, phoneNumber: rawPhone } = req.body

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email and password are required" })
        }

        const cleanEmail = String(email).trim()
        const cleanName = String(name).trim()
        const phoneTrimmed = rawPhone != null ? String(rawPhone).trim() : ""

        if (phoneTrimmed && !/^\d{10,15}$/.test(phoneTrimmed)) {
            return res.status(400).json({ message: "Phone number must be 10 to 15 digits (or leave empty)" })
        }

        const alreadyThere = await authModel.findOne({ email: cleanEmail })
        if (alreadyThere) {
            return res.status(400).json({ message: "This email is already in use" })
        }

        const plainPasswordForEmail = String(password)

        const salt = bcrypt.genSaltSync(10)
        const hashedPassword = bcrypt.hashSync(plainPasswordForEmail, salt)

        const createPayload = {
            name: cleanName,
            email: cleanEmail,
            phoneNumber: phoneTrimmed,
            password: hashedPassword,
            role: "user",
            isActive: true
        }
        let imageUploadWarning = ""

        if (req.file) {
            try {
                const uploadedImage = await uploadBufferToCloudinary(req.file, 'users/profile')
                createPayload.image = uploadedImage.secure_url
                createPayload.imagePublicId = uploadedImage.public_id
            } catch (uploadError) {
                if (!uploadBufferToCloudinary.isCloudinaryConfigError(uploadError)) {
                    throw uploadError
                }
                imageUploadWarning = uploadError.message
            }
        }

        const created = await authModel.create(createPayload)

        let emailSent = false
        let emailError = ""
        try {
            const phoneLine = phoneTrimmed ? `Phone on profile: ${phoneTrimmed}\n` : ""
            const emailBody =
                `Hello ${cleanName},\n\n` +
                `Your account has been created.\n\n` +
                `Login email: ${cleanEmail}\n` +
                `Login password: ${plainPasswordForEmail}\n` +
                phoneLine +
                `\nOpen the app and sign in with the above email and password.\n`

            await sendmail(
                cleanEmail,
                "Your new account – login details",
                emailBody
            )
            emailSent = true
        } catch (mailErr) {
            emailError = mailErr.message || "Could not send email"
            console.error("Welcome email failed:", emailError)
        }

        const message = emailSent
            ? "User added. Login email and password were sent to the user's inbox."
            : `User added, but email was not sent (${emailError}). Share login details manually.`

        return res.status(201).json({
            message: imageUploadWarning ? `${message} ${imageUploadWarning}` : message,
            emailSent,
            imageUploadWarning,
            user: {
                _id: created._id,
                name: created.name,
                email: created.email,
                phoneNumber: created.phoneNumber || "",
                image: created.image || "",
                role: created.role,
                isActive: created.isActive !== false
            }
        })
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message })
    }
}

const login = async (req, res) => {
    try {

        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({
                message: "all fields required"
            })
        }

        const olduser = await authModel.findOne({ email })

        if (!olduser) {
            return res.status(400).json({
                message: "No account with this email. Ask admin to add you."
            })
        }

        if (olduser.isActive === false) {
            return res.status(403).json({
                message: "Your account is inactive. Please contact admin."
            })
        }

        const compare = await bcrypt.compare(password, olduser.password)

        if (!compare) {
            return res.status(400).json({
                message: "password is wrong"
            })
        }


        // LOGIN SUCCESS ACTIVITY
        try {

            const forwardedFor = req.headers['x-forwarded-for']
            const ipAddress = Array.isArray(forwardedFor)
                ? forwardedFor[0]
                : (forwardedFor || req.socket?.remoteAddress || req.ip || '')

            await ActivityModel.create({
                userSession: olduser.email,
                userId: olduser._id,
                userName: olduser.name,
                email: olduser.email,
                systemInfo: {
                    os: `${os.type()} ${os.release()}`,
                    hostname: os.hostname(),
                    arch: os.arch(),
                    cpuCount: os.cpus().length,
                    totalMemory: os.totalmem(),
                    freeMemory: os.freemem(),
                    machine: os.machine ? os.machine() : '',
                    uptime: os.uptime()
                },
                ipAddress,
                userAgent: req.headers['user-agent'] || '',
                browserInfo: req.headers['sec-ch-ua'] || '',
                loginAt: new Date(),
                platform: os.platform()
            })

        } catch (activityErr) {
            console.error(
                "Failed to log activity:",
                activityErr.message || activityErr
            )
        }


        const token = jwt.sign(
            { email },
            secretKey,
            { expiresIn: '5h' }
        )

        const user = {
            _id: olduser._id,
            name: olduser.name,
            email: olduser.email,
            phoneNumber: olduser.phoneNumber || "",
            image: olduser.image || "",
            role: olduser.role,
            isActive: olduser.isActive !== false
        }

        return res.status(200).json({
            message: "login successfully",
            token,
            user
        })

    } catch (error) {

        return res.status(500).json({
            message: error.message
        })
    }
}

// const forgotPassword = async (req, res) => {
//     try {

//         const { email, newPassword, confirmPassword } = req.body

//         // if (!email || !newPassword || !confirmPassword) {
//         //     return res.status(400).json({
//         //         message: "All fields are required"
//         //     })
//         // }

//         if (newPassword !== confirmPassword) {
//             return res.status(400).json({
//                 message: "Passwords do not match"
//             })
//         }

//         const user = await authModel.findOne({ email })

//         if (!user) {
//             return res.status(404).json({
//                 message: "User not found"
//             })
//         }




//         let otp = Math.floor(
//             1000 +Math.random()*9000
//         ).toString()


//         let otpExpire = moment().add(5,'minutes').toDate()


//         user.otp=otp
//         user.otpExpire=otpExpire


//         await user.save()

//         await sendmail(
//             email,
//             "password reset succesfully",`your otp is ${otp}.it expire in 5 minute`
//         )



//         // const salt = bcrypt.genSaltSync(10)
//         // const hash = bcrypt.hashSync(newPassword, salt)

//         // user.password = hash

//         // await user.save()


//         return res.status(200).json({
//             message: "OTP send succesfully"
//         })

//     } catch (error) {
//         return res.status(500).json({
//             message: error.message
//         })
//     }
// }


const forgotPassword = async (req, res) => {
    try {

        const { email } = req.body

        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            })
        }

        const user = await authModel.findOne({ email })

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            })
        }

        let otp = Math.floor(
            1000 + Math.random() * 9000
        ).toString()

        let otpExpire = moment()
            .add(5, 'minutes')
            .toDate()

        user.otp = otp
        user.otpExpire = otpExpire

        await user.save()

        await sendmail(
            email,
            "Reset Password OTP",
            `Your OTP is ${otp}. It expires in 5 minutes`
        )

        res.status(200).json({
            message: "OTP sent successfully"
        })

    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
}


const Verifyotp = async (req, res) => {
    try {
        const { email, otp } = req.body

        if (!email || !otp) {
            return res.status(400).json({ message: "all fields are requried" })
        }

        const user = await authModel.findOne({ email })

        if (!user) {
            return res.status(400).json({ message: "user not found" })
        }

        if (user.otp !== otp) {
            return res.status(400).json({ message: "not valid otp" })
        }

        if (moment().isAfter(moment(user.otpExpire))) {
            return res.status(400).json({ message: "otp expired" })
        }

        const resetToken = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET || "secretkey",
            { expiresIn: "10m" }
        )

        res.status(200).json({ message: "otp varified", token: resetToken })

    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}






// const resetPass = async (req, res) => {
//     try {
//         const data = req.body
//         const { email, oldPassword, newPassword } = data
//         if (!email || !oldPassword || !newPassword) {
//             return res.status(400).json({ message: "all fields are required" })
//         }
//         const olduser = await authModel.findOne({ email })
//         if (!olduser) {
//             return res.status(400).json({ message: "user not found" })
//         }

//         // Verify old password
//         const ismatch = await bcrypt.compare(oldPassword, olduser.password)
//         if (!ismatch) {
//             return res.status(400).json({ message: "old password is incorrect" })
//         }

//         const salt = bcrypt.genSaltSync(10)
//         const hash = bcrypt.hashSync(newPassword, salt)

//         olduser.password = hash
//         await olduser.save()
//         return res.status(200).json({ message: "password successfully reset" })
//     } catch (error) {
//         return res.status(200).json({ message: error.message })
//     }
// }



const resetPass = async (req, res) => {
    try {

        const { email, otp, newPassword } = req.body

        if (!email || !otp || !newPassword) {
            return res.status(400).json({
                message: "All fields required"
            })
        }

        const user = await authModel.findOne({ email })

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            })
        }

        if (user.otp !== otp) {
            return res.status(400).json({
                message: "Invalid OTP"
            })
        }

        if (
            moment().isAfter(
                moment(user.otpExpire)
            )) {
            return res.status(400).json({
                message: "OTP expired"
            })
        }

        const salt = bcrypt.genSaltSync(10)

        const hash = bcrypt.hashSync(
            newPassword,
            salt
        )

        user.password = hash

        user.otp = null
        user.otpExpire = null

        await user.save()

        await sendmail(
            email,
            "Password Changed",
            "Your password changed successfully"
        )

        res.status(200).json({
            message: "Password reset successful"
        })

    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
}

const listUsers = async (req, res) => {
    try {
        const { search = "", status = "all", sortBy = "name" } = req.query
        const query = {}

        if (search.trim()) {
            query.$or = [
                { name: { $regex: search.trim(), $options: "i" } },
                { email: { $regex: search.trim(), $options: "i" } },
                { role: { $regex: search.trim(), $options: "i" } }
            ]
        }

        if (status === "active") {
            query.isActive = { $ne: false }
        }

        if (status === "inactive") {
            query.isActive = false
        }

        const allowedSortFields = ["name", "email", "role"]
        const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "name"

        const users = await authModel
            .find(query, '_id name email image role isActive')
            .sort({ [safeSortBy]: 1 })

        return res.status(200).json(users)
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

const updateUserStatus = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Only admin can update user status" })
        }

        const { isActive } = req.body

        if (typeof isActive !== "boolean") {
            return res.status(400).json({ message: "isActive must be true or false" })
        }

        if (String(req.user._id) === String(req.params.id) && isActive === false) {
            return res.status(400).json({ message: "Admin cannot inactive own account" })
        }

        const user = await authModel
            .findByIdAndUpdate(
                req.params.id,
                { isActive },
                { new: true }
            )
            .select("_id name email role isActive")

        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        return res.status(200).json({
            message: isActive ? "User activated successfully" : "User inactivated successfully",
            user
        })
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

module.exports = { addUserByAdmin, login, forgotPassword, resetPass, listUsers, updateUserStatus, Verifyotp, changePassword, updateProfile }
