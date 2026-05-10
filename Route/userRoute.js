const express = require('express')
const router = express.Router()

const usercontroller = require('../Controller/userController')
const auth = require('../middleware/auth')

router.post('/add', usercontroller.adduser)
router.get('/one/:id',auth, usercontroller.addOne)
router.get('/all', usercontroller.findAll)
router.patch('/update/:id',auth, usercontroller.updateUser)
router.delete('/delete/:id',auth, usercontroller.deleteUser)
router.delete('/permanent-delete/:id',auth, usercontroller.permanentDeleteUser)

module.exports = router