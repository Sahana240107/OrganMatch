const express = require('express');
const router  = express.Router();
router.get('/',  (req, res) => res.json({ message: 'donors route ok', user: req.user }));
router.post('/', (req, res) => res.json({ message: 'donor created (stub)', body: req.body }));
module.exports = router;