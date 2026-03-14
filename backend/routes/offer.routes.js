const express = require('express');
const router  = express.Router();
router.get('/',         (req, res) => res.json({ message: 'offers route ok' }));
router.patch('/:id',    (req, res) => res.json({ message: 'offer updated (stub)', id: req.params.id }));
module.exports = router;