const { Pool } = require('pg');

const pool = new Pool({
    // user: process.env.DB_USER || 'postgres',       
    // host: process.env.DB_HOST || 'localhost',
    // database: process.env.DB_NAME || 'toko_online',     
    // password: process.env.DB_PASS || '',   
    // port: process.env.DB_PORT || 5432,       
    connectionString: process.env.DB_CONN || 'postgresql://postgres.nbtbhczulihwyhatiycy:$4sBJgC3Z%?5hrf@aws-1-ap-south-1.pooler.supabase.com:5432/postgres'
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