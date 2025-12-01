const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

    if (token == null) {
        return res.status(401).json({ message: 'Akses ditolak. Token tidak tersedia.' });
    }

    // Verifikasi menggunakan ACCESS_SECRET
    jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, user) => {
        if (err) {
            // Jika error-nya karena token kedaluwarsa
            if (err.name === 'TokenExpiredError') {
                // Kirim kode khusus agar frontend tahu harus me-refresh token
                return res.status(401).json({ message: 'Token kedaluwarsa.', code: 'TOKEN_EXPIRED' });
            }
            // Jika token tidak valid
            return res.status(403).json({ message: 'Token tidak valid.' });
        }
        req.user = user; // Simpan payload user ke object request
        next();
    });
};

// Middleware isAdmin dan isAdminOrKasir biarkan SAMA
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ message: 'Akses terlarang. Diperlukan peran Admin.' });
    }
};

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