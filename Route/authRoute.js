const express = require('express')
const router = express.Router()

const authController = require('../Controller/authController')
const auth = require('../middleware/auth')
const upload = require('../middleware/upload')


router.post('/admin/add-user', auth, upload.single('image'), authController.addUserByAdmin)
router.post('/login', authController.login)
router.post('/forgot', authController.forgotPassword)
router.post('/reset', authController.resetPass)
router.get('/users', auth, authController.listUsers)
router.patch('/users/:id/status', auth, authController.updateUserStatus)
router.post('/verify', authController.Verifyotp)
router.post('/change-password', auth, authController.changePassword)
router.patch('/profile', auth, upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'backgroundImage', maxCount: 1 }
]), authController.updateProfile)

module.exports = router
