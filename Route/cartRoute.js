const express = require('express')
const router = express.Router()

const controller = require('../Controller/cartController')
const auth = require('../middleware/auth')

router.post('/addone', auth, controller.adduser)
router.get('/getall', auth, controller.findAll)
router.delete('/delete/:id', auth, controller.alldelete)

module.exports = router