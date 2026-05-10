const express = require('express');
const router = express.Router();

const activityController = require('../Controller/activityController');
const auth = require('../middleware/auth');


router.get('/activity',auth,activityController.getActivity)

module.exports = router;