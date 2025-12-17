const { Pool } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_W1zKbYhnac6s@ep-gentle-paper-ad7n0kvg.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({
  connectionString,
});

const initDb = async () => {
    try {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS visits (
                id SERIAL PRIMARY KEY,
                path TEXT NOT NULL,
                method TEXT NOT NULL,
                ip TEXT,
                user_agent TEXT,
                timestamp TIMESTAMPTZ DEFAULT NOW()
            );
        `;
        await pool.query(createTableQuery);

        // Add platform column if it doesn't exist (migration)
        await pool.query(`ALTER TABLE visits ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'Web'`);
        
        console.log('Visits table ready.');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
};

module.exports = {
  pool,
  initDb
};
