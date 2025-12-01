const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authenticate, isAdminOrKasir,isAdmin } = require ('../middleware/auth');

// Gunakan autentikasi Admin atau Kasir untuk semua route transaksi
router.use(authenticate, isAdminOrKasir); 

// [GET] /transactions - Ambil semua transaksi
router.get('/', async (req, res) => {
    try {
        const q = `
            SELECT t.*, u.username as cashier_username
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            ORDER BY t.transaction_date DESC;
        `;
        const result = await pool.query(q);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// [GET] /transactions/:id - Ambil detail transaksi beserta itemnya
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Ambil detail header transaksi
        const headerQ = `
            SELECT t.*, u.username as cashier_username
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            WHERE t.id = $1;
        `;
        const headerResult = await pool.query(headerQ, [id]);
        if (headerResult.rows.length === 0) {
            return res.status(404).json({ message: 'Transaksi tidak ditemukan.' });
        }
        const transaction = headerResult.rows[0];

        // 2. Ambil item-item transaksi
        const itemsQ = `
            SELECT ti.product_id, ti.quantity, ti.unit_price, ti.subtotal, p.sku, p.name as product_name
            FROM transaction_items ti
            JOIN products p ON ti.product_id = p.id
            WHERE ti.transaction_id = $1;
        `;
        const itemsResult = await pool.query(itemsQ, [id]);
        
        // Gabungkan
        transaction.items = itemsResult.rows;

        res.status(200).json(transaction);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// [POST] /transactions - Simpan transaksi baru
router.post('/', async (req, res) => {
    const { items, payment_method, customer_name } = req.body;
    const userId = req.user.id; // Kasir yang membuat transaksi
    
    if (!items || items.length === 0 || !payment_method) {
        return res.status(400).json({ message: 'Item, dan metode pembayaran wajib diisi.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Mulai transaksi DB
        
        let totalAmount = 0;
        let productPrices = {}; // Untuk menyimpan harga produk
        let productStocks = {}; // Untuk menyimpan stok produk

        // 1. Validasi produk, hitung subtotal, dan cek stok
        for (const item of items) {
            const productRes = await client.query('SELECT price, stock, name FROM products WHERE id = $1', [item.product_id]);
            if (productRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ message: `Produk dengan ID ${item.product_id} tidak ditemukan.` });
            }
            const product = productRes.rows[0];

            if (item.quantity > product.stock) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: `Stok tidak cukup untuk produk ${product.name}. Tersisa: ${product.stock}` });
            }
            
            const unitPrice = parseFloat(product.price);
            const subtotal = unitPrice * item.quantity;
            totalAmount += subtotal;

            productPrices[item.product_id] = unitPrice;
            productStocks[item.product_id] = product.stock;
        }

        // 2. Insert ke tabel transactions
        const transactionRes = await client.query(
            'INSERT INTO transactions (user_id, total_amount, payment_method, customer_name, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, transaction_date',
            [userId, totalAmount, payment_method, customer_name, 'completed']
        );
        const transactionId = transactionRes.rows[0].id;

        // 3. Insert ke tabel transaction_items dan update stok
        for (const item of items) {
            const unitPrice = productPrices[item.product_id];
            const subtotal = unitPrice * item.quantity;
            
            // Insert item
            await client.query(
                'INSERT INTO transaction_items (transaction_id, product_id, quantity, unit_price, subtotal) VALUES ($1, $2, $3, $4, $5)',
                [transactionId, item.product_id, item.quantity, unitPrice, subtotal]
            );

            // Update stok produk
            const newStock = productStocks[item.product_id] - item.quantity;
            await client.query(
                'UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2',
                [newStock, item.product_id]
            );
        }

        await client.query('COMMIT'); // Commit transaksi DB
        res.status(201).json({ 
            message: 'Transaksi berhasil disimpan!', 
            transaction_id: transactionId, 
            total_amount: totalAmount 
        });
        
    } catch (error) {
        await client.query('ROLLBACK'); // Rollback jika ada error
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada saat menyimpan transaksi.' });
    } finally {
        client.release();
    }
});

// [PUT] /transactions/:id - Ubah status transaksi (Minimal Admin)
router.put('/:id', authenticate, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['completed', 'canceled', 'pending'].includes(status)) {
        return res.status(400).json({ message: 'Status harus diisi dan valid ("completed", "canceled", atau "pending").' });
    }
    
    try {
        const result = await pool.query(
            'UPDATE transactions SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Transaksi tidak ditemukan.' });
        }
        res.status(200).json({ message: 'Status transaksi berhasil diperbarui', data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// Catatan: DELETE untuk transaksi umumnya tidak direkomendasikan, biasanya menggunakan status 'canceled'.

module.exports = router;