const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',       
    host: 'localhost',
    database: 'toko_online',     
    password: '',   
    port: 5432,                 
});

// Tes koneksi
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error saat koneksi ke database', err.stack);
    }
    console.log('Koneksi ke database PostgreSQL berhasil!');
    release();
});

module.exports = pool;