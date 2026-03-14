const express = require('express');
const router  = express.Router();
router.get('/',  (req, res) => res.json({ message: 'recipients route ok', user: req.user }));
router.post('/', (req, res) => res.json({ message: 'recipient created (stub)', body: req.body }));
module.exports = router;