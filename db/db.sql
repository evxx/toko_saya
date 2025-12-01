-- 1. Tabel users (Sesuai Use Case: Kelola User & Login/Logout)
-- Menambahkan kolom role_id (foreign key) untuk membedakan Admin dan Kasir
-- Menambahkan is_active untuk fungsi "Deactivate User"
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Menyimpan hash kata sandi (bukan teks biasa)
    fullname VARCHAR(100),
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'kasir')), -- Role: admin atau kasir
    is_active BOOLEAN DEFAULT TRUE, -- Untuk fungsi deactivate
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel categories (Sesuai Use Case: Kelola Kategori)
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel products (Sesuai Use Case: Kelola Produk)
-- Relasi One-to-Many: products.category_id -> categories.id
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL, -- Stock Keeping Unit (kode produk)
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    stock INTEGER NOT NULL CHECK (stock >= 0),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel transactions (Sesuai Use Case: Kelola Penjualan)
-- Relasi Many-to-One: transactions.user_id -> users.id (Kasir yang membuat transaksi)
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT NOT NULL, -- Kasir yang melayani
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50), -- Contoh: 'cash', 'transfer', 'credit_card'
    customer_name VARCHAR(100),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'canceled')) DEFAULT 'completed'
);

-- 5. Tabel transaction_items (Item Transaksi / Detail Penjualan)
-- Relasi Many-to-One: transaction_items.transaction_id -> transactions.id
-- Relasi Many-to-One: transaction_items.product_id -> products.id
CREATE TABLE transaction_items (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
    product_id INTEGER REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL, -- Harga saat transaksi terjadi
    subtotal NUMERIC(10, 2) NOT NULL,
    -- Pastikan kombinasi transaksi dan produk unik dalam satu baris (Opsional, tapi bagus)
    UNIQUE (transaction_id, product_id)
);

-- 6. INDEXING (Opsional: untuk performa query cepat)
CREATE INDEX idx_products_category ON products (category_id);
CREATE INDEX idx_transactions_user ON transactions (user_id);
CREATE INDEX idx_transaction_items_transaction ON transaction_items (transaction_id);

-- 7. Trigger (Opsional: untuk otomatis memperbarui updated_at)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_product_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
