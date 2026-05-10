const express = require('express')
const router = express.Router()

const productController = require('../Controller/productController')
const authMiddleware = require('../middleware/auth')
const upload = require('../middleware/upload')


router.post('/add', authMiddleware, upload.single('image'), productController.addProduct)
router.post('/upload', authMiddleware, upload.single('file'), productController.uploadExcel)
router.get('/audio', productController.playProductAudio)
router.get('/one/:id', authMiddleware, productController.getOneProduct)
router.get('/all', authMiddleware, productController.getAllProducts)
router.patch('/update/:id', authMiddleware, upload.single('image'), productController.updateProduct)
router.delete('/delete/:id', authMiddleware, productController.softDeleteProduct)
router.patch('/restore/:id', authMiddleware, productController.restoreProduct)
router.delete('/permanent-delete/:id', authMiddleware, productController.permanentDeleteProduct)
router.get('/admin/all', authMiddleware, productController.getAllProductsAdmin)

module.exports = router
