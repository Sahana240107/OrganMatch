const express = require('express');
const router  = express.Router();

const { login, me, logout } = require('../controllers/auth.controller');
const { verifyJWT }         = require('../middleware/auth.middleware');

router.post('/login',  login);
router.post('/logout', verifyJWT, logout);
router.get('/me',      verifyJWT, me);

module.exports = router;