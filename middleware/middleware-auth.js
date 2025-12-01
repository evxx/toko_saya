// middleware/auth.js
const jwt = require('jsonwebtoken');

// Middleware untuk otentikasi menggunakan JWT
const authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

    if (token == null) {
        return res.status(401).json({ message: 'Akses ditolak. Token tidak tersedia.' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'RAHASIA_SUPER_PENTING', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token tidak valid atau sudah kedaluwarsa.' });
        }
        req.user = user; // Simpan payload user ke object request
        next();
    });
};

// Middleware untuk mengecek hanya Admin
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ message: 'Akses terlarang. Diperlukan peran Admin.' });
    }
};

// Middleware untuk mengecek Admin atau Kasir
const isAdminOrKasir = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'kasir')) {
        next();
    } else {
        return res.status(403).json({ message: 'Akses terlarang. Diperlukan peran Admin atau Kasir.' });
    }
};

module.exports = {
    authenticate,
    isAdmin,
    isAdminOrKasir
};