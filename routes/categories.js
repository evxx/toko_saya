const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authenticate, isAdmin } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 * name: Categories
 * description: API untuk manajemen kategori (Hanya Admin)
 */

/**
 * @swagger
 * /categories:
 * get:
 * summary: Mengambil semua kategori
 * tags: [Categories]
 * security:
 * - bearerAuth: []  # <-- Menandakan endpoint ini butuh JWT
 * responses:
 * 200:
 * description: Daftar semua kategori
 * content:
 * application/json:
 * schema:
 * type: array
 * items:
 * type: object
 * properties:
 * id:
 * type: integer
 * name:
 * type: string
 * description:
 * type: string
 * 401:
 * description: Token tidak tersedia atau kedaluwarsa
 * 403:
 * description: Token tidak valid atau peran bukan Admin
 */

// Gunakan autentikasi dan otorisasi Admin untuk semua route di sini
router.use(authenticate, isAdmin); 

// [GET] /categories - Ambil semua kategori
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM categories ORDER BY id ASC');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// [GET] /categories/:id - Ambil kategori berdasarkan ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Kategori tidak ditemukan.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// [POST] /categories - Tambah kategori baru
router.post('/', async (req, res) => {
    const { name, description } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'Nama kategori wajib diisi.' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
            [name, description]
        );
        res.status(201).json({ message: 'Kategori berhasil ditambahkan', data: result.rows[0] });
    } catch (error) {
        // Handle error jika nama kategori duplikat
        if (error.code === '23505') { 
            return res.status(409).json({ message: 'Nama kategori sudah ada.' });
        }
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// [PUT] /categories/:id - Ubah kategori
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'Nama kategori wajib diisi.' });
    }
    try {
        const result = await pool.query(
            'UPDATE categories SET name = $1, description = $2 WHERE id = $3 RETURNING *',
            [name, description, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Kategori tidak ditemukan.' });
        }
        res.status(200).json({ message: 'Kategori berhasil diperbarui', data: result.rows[0] });
    } catch (error) {
         if (error.code === '23505') { 
            return res.status(409).json({ message: 'Nama kategori sudah ada.' });
        }
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// [DELETE] /categories/:id - Hapus kategori
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Kategori tidak ditemukan.' });
        }
        res.status(200).json({ message: 'Kategori berhasil dihapus.' });
    } catch (error) {
        // Handle error jika kategori masih terikat dengan produk (ON DELETE RESTRICT)
        if (error.code === '23503') {
             return res.status(409).json({ message: 'Tidak dapat menghapus kategori. Masih ada produk yang terikat.' });
        }
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

module.exports = router;