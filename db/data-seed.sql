-- SEED DATA UNTUK DATABASE POINT OF SALE

-- 1. Menambahkan data untuk tabel 'users'
-- Catatan: password_hash di sini hanyalah contoh. Dalam aplikasi nyata,
-- Anda harus menggunakan hash yang aman seperti bcrypt atau argon2.
INSERT INTO users (username, password_hash, fullname, role) VALUES
('admin', 'pbkdf2:sha256:260000$hashedpasswordplaceholder1$adminhash', 'Administrator Utama', 'admin'),
('kasir01', 'pbkdf2:sha256:260000$hashedpasswordplaceholder2$kasirhash', 'Budi Santoso', 'kasir'),
('kasir02', 'pbkdf2:sha256:260000$hashedpasswordplaceholder3$kasirhash', 'Citra Lestari', 'kasir');

-- 2. Menambahkan data untuk tabel 'categories'
INSERT INTO categories (name, description) VALUES
('Makanan Ringan', 'Berbagai macam snack, keripik, dan biskuit.'),
('Minuman Dingin', 'Minuman dalam kemasan botol atau kaleng yang disajikan dingin.'),
('Kebutuhan Dapur', 'Bahan-bahan pokok untuk memasak seperti minyak, gula, dan garam.'),
('Alat Tulis Kantor', 'Perlengkapan untuk kebutuhan sekolah dan kantor.'),
('Produk Kebersihan', 'Sabun, deterjen, dan produk pembersih lainnya.');

-- 3. Menambahkan data untuk tabel 'products'
-- Pastikan category_id sesuai dengan ID dari tabel categories di atas.
INSERT INTO products (category_id, sku, name, price, stock) VALUES
(1, 'SNK-001', 'Keripik Kentang Chitato 68g', 11000, 150),
(1, 'SNK-002', 'Biskuit Roma Kelapa 300g', 9500, 120),
(2, 'MIN-001', 'Teh Botol Sosro Kotak 250ml', 3500, 200),
(2, 'MIN-002', 'Air Mineral Aqua 600ml', 3000, 300),
(3, 'DPR-001', 'Minyak Goreng Sania 2L', 34000, 80),
(3, 'DPR-002', 'Gula Pasir Gulaku 1kg', 17500, 100),
(4, 'ATK-001', 'Buku Tulis Sinar Dunia 38 Lbr', 4500, 250),
(4, 'ATK-002', 'Pulpen Standard AE7', 2500, 400),
(5, 'KBR-001', 'Sabun Mandi Lifebuoy Total 10', 4000, 180);

-- 4. Menambahkan data untuk 'transactions' dan 'transaction_items'

-- TRANSAKSI 1 (dilayani oleh kasir01, id: 2)
-- Total: (2 * 11000) + (3 * 3500) = 22000 + 10500 = 32500
INSERT INTO transactions (id, user_id, total_amount, payment_method, customer_name, status) VALUES
(1, 2, 32500.00, 'cash', 'Andi', 'completed');

INSERT INTO transaction_items (transaction_id, product_id, quantity, unit_price, subtotal) VALUES
(1, 1, 2, 11000.00, 22000.00), -- 2x Keripik Kentang Chitato
(1, 3, 3, 3500.00, 10500.00);  -- 3x Teh Botol Sosro

-- TRANSAKSI 2 (dilayani oleh kasir02, id: 3)
-- Total: (1 * 34000) + (5 * 4500) + (10 * 2500) = 34000 + 22500 + 25000 = 81500
INSERT INTO transactions (id, user_id, total_amount, payment_method, customer_name, status) VALUES
(2, 3, 81500.00, 'transfer', 'Dewi', 'completed');

INSERT INTO transaction_items (transaction_id, product_id, quantity, unit_price, subtotal) VALUES
(2, 5, 1, 34000.00, 34000.00), -- 1x Minyak Goreng Sania 2L
(2, 7, 5, 4500.00, 22500.00),  -- 5x Buku Tulis Sinar Dunia
(2, 8, 10, 2500.00, 25000.00); -- 10x Pulpen Standard AE7

-- TRANSAKSI 3 (dilayani oleh kasir01, id: 2)
-- Total: (4 * 3000) = 12000
INSERT INTO transactions (id, user_id, total_amount, payment_method, customer_name, status) VALUES
(3, 2, 12000.00, 'credit_card', 'Rina', 'completed');

INSERT INTO transaction_items (transaction_id, product_id, quantity, unit_price, subtotal) VALUES
(3, 4, 4, 3000.00, 12000.00); -- 4x Air Mineral Aqua 600ml

-- Mengatur ulang urutan sequence untuk ID primary key agar data baru dimulai dari ID selanjutnya
-- Ini bersifat opsional tapi praktik yang baik setelah memasukkan data manual dengan ID spesifik.
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));
SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));
SELECT setval('transactions_id_seq', (SELECT MAX(id) FROM transactions));
SELECT setval('transaction_items_id_seq', (SELECT MAX(id) FROM transaction_items));