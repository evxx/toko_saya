const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authenticate, isAdmin, isAdminOrKasir } = require('../middleware/auth');
const bcrypt = require('bcrypt');
const saltRounds = 10;

// [GET] /profile - Ambil profil pengguna yang sedang login
// Bisa diakses Admin atau Kasir
router.get('/profile', authenticate, isAdminOrKasir, async (req, res) => {
    const userId = req.user.id;
    try {
        // HANYA ambil data users tanpa password_hash
        const result = await pool.query('SELECT id, username, fullname, role, is_active, created_at FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

router.get('/users', async (req, res) => {
    try {
        const q = `
            SELECT username, fullname, role, is_active
            FROM users
            ORDER BY id ASC;
        `;
        const result = await pool.query(q);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});


// [POST] /register - Tambah user baru
// Endpoint ini dapat digunakan Admin untuk menambah Kasir, atau tanpa otorisasi di awal.
// Kita gunakan otorisasi Admin untuk menambah user baru untuk alasan keamanan.
router.post('/register', authenticate, isAdmin, async (req, res) => {
    const { username, password, fullname, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ message: 'Username, password, dan role wajib diisi.' });
    }
    
    // Pastikan role yang didaftarkan valid
    if (role !== 'admin' && role !== 'kasir') {
         return res.status(400).json({ message: 'Role harus "admin" atau "kasir".' });
    }
    
    try {
        // Hash password sebelum disimpan
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const result = await pool.query(
            'INSERT INTO users (username, password_hash, fullname, role) VALUES ($1, $2, $3, $4) RETURNING id, username, fullname, role, is_active',
            [username, passwordHash, fullname, role]
        );
        res.status(201).json({ message: 'Pengguna berhasil didaftarkan.', data: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') { // Duplikat username
            return res.status(409).json({ message: 'Username sudah digunakan.' });
        }
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});


// [PUT] /deactivate-user - Deactivate user (specify id in request body)
// Khusus Admin
router.put('/deactivate-user', authenticate, isAdmin, async (req, res) => {
    const { id } = req.body; // Ambil ID pengguna yang akan dideactivate dari body
    
    if (!id) {
        return res.status(400).json({ message: 'ID pengguna yang akan dideactivate wajib diisi.' });
    }
    
    // Cegah admin mendeactivate dirinya sendiri
    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ message: 'Tidak dapat menonaktifkan akun sendiri.' });
    }

    try {
        const result = await pool.query(
            'UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id, username, is_active',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }

        res.status(200).json({ 
            message: `Pengguna ${result.rows[0].username} berhasil dinonaktifkan.`, 
            data: result.rows[0] 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

module.exports = router;