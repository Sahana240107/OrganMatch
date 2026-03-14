const express = require('express');
const router  = express.Router();
router.get('/', (req, res) => res.json({ message: 'hospitals route ok' }));
module.exports = router;