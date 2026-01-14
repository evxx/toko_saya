const { Pool } = require('pg');
const fs = require('fs')
const dotenv = require('dotenv')

dotenv.config({quiet:true})

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'toko_online',
    password: process.env.DB_PASS || '',
    port: process.env.DB_PORT || 5432,
    ssl: { rejectUnauthorized: false }
    //connectionString: process.env.DB_CONN || 'postgresql://postgres.gvgcfbrhgqyxpifscjpt:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres'
});

// Tes koneksi
pool.connect((err, client, release) => {
    if (err) {
        const filePath = "../logs/db.log"
        fs.promises.appendFile(filePath, err, (fsError) => {

            if (fsError) {
                console.error('Error appending to file:', fsError);
                return;
            }
        })
        return console.error('Error saat koneksi ke database', err.stack);
    }
    console.log('Koneksi ke database PostgreSQL berhasil!');
    release();
});

module.exports = pool;