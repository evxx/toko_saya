const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

/**
 * @swagger
 * /auth/login:
 * post:
 * summary: Login pengguna
 * tags: [Authentication]
 * description: Mengautentikasi pengguna (admin/kasir) dan mengembalikan access serta refresh token.
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * username:
 * type: string
 * example: "admin"
 * password:
 * type: string
 * example: "passwordadmin"
 * responses:
 * 200:
 * description: Login berhasil
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * message:
 * type: string
 * accessToken:
 * type: string
 * refreshToken:
 * type: string
 * 401:
 * description: Username atau password salah
 */

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username dan password wajib diisi.' });
    }

    try {
        // 1. Cari user
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Username atau password salah.' });
        }
        if (!user.is_active) {
            return res.status(403).json({ message: 'Akun ini telah dinonaktifkan.' });
        }

        // 2. Cek password
        const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordMatch) {
            return res.status(401).json({ message: 'Username atau password salah.' });
        }

        // 3. Buat Payload
        const payload = { id: user.id, username: user.username, role: user.role };

        // 4. Buat Access Token (exp: 15m)
        const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
            expiresIn: process.env.JWT_ACCESS_EXPIRATION
        });

        // 5. Buat Refresh Token (exp: 7d)
        const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
            expiresIn: process.env.JWT_REFRESH_EXPIRATION
        });

        // 6. Simpan Refresh Token ke Database
        // Dapatkan timestamp kadaluwarsa dari token
        const decoded = jwt.decode(refreshToken);
        const expiresAt = new Date(decoded.exp * 1000); // `exp` adalah detik, ubah ke milidetik

        // Hapus token lama user (jika ada) agar hanya 1 sesi aktif per user
        await pool.query('DELETE FROM user_refresh_tokens WHERE user_id = $1', [user.id]);
        
        // Simpan token baru
        await pool.query(
            'INSERT INTO user_refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [user.id, refreshToken, expiresAt]
        );

        // 7. Kirim KEDUA token ke frontend
        res.json({
            message: 'Login berhasil',
            accessToken: accessToken,
            refreshToken: refreshToken
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token diperlukan.' });
    }

    try {
        // 1. Cek apakah token ada di database DAN belum kadaluwarsa
        const dbResult = await pool.query(
            'SELECT * FROM user_refresh_tokens WHERE token = $1 AND expires_at > NOW()',
            [refreshToken]
        );

        if (dbResult.rows.length === 0) {
            return res.status(403).json({ message: 'Refresh token tidak valid atau sudah kadaluwarsa.' });
        }
        
        // 2. Verifikasi token (double check)
        jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({ message: 'Refresh token gagal diverifikasi.' });
            }

            // 3. Jika semua valid, buat Access Token BARU
            const payload = { id: user.id, username: user.username, role: user.role };
            const newAccessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
                expiresIn: process.env.JWT_ACCESS_EXPIRATION
            });

            res.json({
                message: 'Token berhasil diperbarui',
                accessToken: newAccessToken
            });
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Kesalahan server.' });
    }
});

// Ambil middleware 'authenticate' yang sudah kita update
const { authenticate } = require('../middleware/auth');

router.delete('/logout', authenticate, async (req, res) => {
    // Kita tahu siapa user-nya dari `accessToken` yang mereka kirim (via middleware)
    const { id } = req.user; 

    try {
        // Hapus semua refresh token milik user tersebut dari database
        await pool.query('DELETE FROM user_refresh_tokens WHERE user_id = $1', [id]);
        res.status(200).json({ message: 'Logout berhasil.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Logout gagal.' });
    }
});

module.exports = router;