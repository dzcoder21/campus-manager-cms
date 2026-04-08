const express = require('express');
const router = express.Router();
const { askAssistant } = require('../../controllers/assistantController');
const assistantRateLimit = require('../../middleware/assistantRateLimit');

router.post('/ask', assistantRateLimit, askAssistant);

module.exports = router;