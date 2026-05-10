const express = require('express');
const router = express.Router();

const taskController = require('../Controller/taskController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/addtask', auth, upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'backgroundImage', maxCount: 1 }
]), taskController.addTask)
router.post("/audio", auth, taskController.genrateaudio)
router.get('/gettasks', auth, taskController.getTasks)
router.get('/viewtask/:id', auth, taskController.viewTask)
router.put('/updatetask/:id', auth, upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'backgroundImage', maxCount: 1 }
]), taskController.updateTask)
router.delete('/deletetask/:id', auth, taskController.deleteTask)
router.patch('/restore/:id', auth, taskController.restoreTask)
router.delete('/permanentdelete/:id', auth, taskController.permanentDelete)




module.exports = router;
