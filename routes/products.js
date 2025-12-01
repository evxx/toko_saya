const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authenticate, isAdmin } = require('../middleware/auth');

// Gunakan autentikasi dan otorisasi Admin untuk semua route di sini
router.use(authenticate, isAdmin); 

// [GET] /products - Ambil semua produk (dengan nama kategori)
router.get('/', async (req, res) => {
    try {
        const q = `
            SELECT 
                p.id, p.sku, p.name, p.price, p.stock, p.description, 
                c.name as category_name 
            FROM products p
            JOIN categories c ON p.category_id = c.id
            ORDER BY p.id ASC;
        `;
        const result = await pool.query(q);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// [GET] /products/:id - Ambil produk berdasarkan ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const q = `
            SELECT 
                p.id, p.category_id, p.sku, p.name, p.price, p.stock, p.description, 
                c.name as category_name 
            FROM products p
            JOIN categories c ON p.category_id = c.id
            WHERE p.id = $1;
        `;
        const result = await pool.query(q, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Produk tidak ditemukan.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// [POST] /products - Tambah produk baru
router.post('/', async (req, res) => {
    const { category_id, sku, name, price, stock, description } = req.body;
    if (!category_id || !sku || !name || price === undefined || stock === undefined) {
        return res.status(400).json({ message: 'Data produk (category_id, sku, name, price, stock) wajib diisi.' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO products (category_id, sku, name, price, stock, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [category_id, sku, name, price, stock, description]
        );
        res.status(201).json({ message: 'Produk berhasil ditambahkan', data: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') { // Duplikat SKU
            return res.status(409).json({ message: 'SKU produk sudah ada.' });
        }
        if (error.code === '23503') { // category_id tidak valid (Foreign Key)
            return res.status(400).json({ message: 'ID kategori tidak valid.' });
        }
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// [PUT] /products/:id - Ubah produk
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { category_id, sku, name, price, stock, description } = req.body;
    if (!category_id || !sku || !name || price === undefined || stock === undefined) {
        return res.status(400).json({ message: 'Data produk (category_id, sku, name, price, stock) wajib diisi.' });
    }
    try {
        const result = await pool.query(
            'UPDATE products SET category_id = $1, sku = $2, name = $3, price = $4, stock = $5, description = $6, updated_at = NOW() WHERE id = $7 RETURNING *',
            [category_id, sku, name, price, stock, description, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Produk tidak ditemukan.' });
        }
        res.status(200).json({ message: 'Produk berhasil diperbarui', data: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') { // Duplikat SKU
            return res.status(409).json({ message: 'SKU produk sudah ada.' });
        }
        if (error.code === '23503') { // category_id tidak valid (Foreign Key)
            return res.status(400).json({ message: 'ID kategori tidak valid.' });
        }
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// [DELETE] /products/:id - Hapus produk
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Produk tidak ditemukan.' });
        }
        res.status(200).json({ message: 'Produk berhasil dihapus.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

module.exports = router;