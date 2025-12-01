const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const cors = require('cors');

// --- KONFIGURASI SWAGGER (Cara Statis) ---
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs'); // <-- Import yamljs
const path = require('path'); // <-- Import path

// Muat file swagger.yaml dari root direktori
const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));
// --- SELESAI KONFIGURASI ---


// --- MIDDLEWARE ---
app.use(cors()); 
app.use(express.json());

// --- SAJIKAN DOKUMENTASI SWAGGER ---
// Endpoint ini akan menyajikan UI Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));



const authRouter = require('./routes/auth');
app.use('/auth', authRouter);

// 1. Categories (Admin)
const categoriesRouter = require('./routes/categories');
app.use('/categories', categoriesRouter);

// 2. Products (Admin)
const productsRouter = require('./routes/products');
app.use('/products', productsRouter);

// 3. User Management (Admin & General)
// Menggunakan path root untuk /profile, /register, /deactivate-user
const usersRouter = require('./routes/users');
app.use('/', usersRouter); 

// 4. Transactions (Cashier)
const transactionsRouter = require('./routes/transactions');
app.use('/transactions', transactionsRouter);

// Endpoint Tes Sederhana
app.get('/', (req, res) => {
    res.send('API Toko Online berjalan. Akses /categories, /products, atau /transactions.');
});

// Menjalankan Server
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
