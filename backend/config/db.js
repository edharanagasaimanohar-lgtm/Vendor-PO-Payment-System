import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import alasql from 'alasql';
import fs from 'fs';
import path from 'path';

const host = process.env.DB_HOST || 'localhost';
const user = process.env.DB_USER || 'root';
const password = process.env.DB_PASSWORD || '';
const database = process.env.DB_NAME || 'vendor_po_management';
const port = parseInt(process.env.DB_PORT || '3306');

let pool = null;
let isFallbackToAlaSql = false;

const DB_FILE = path.join(process.cwd(), 'database_persisted.json');

// Enable MySQL mode for AlaSQL keyword and syntax compatibility
alasql.options.mysql = true;

// Register custom MySQL Functions in AlaSQL
alasql.fn.DATE_FORMAT = function(dateStr, format) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length >= 2) {
    return `${parts[0]}-${parts[1]}`;
  }
  return dateStr;
};

alasql.fn.COALESCE = function(val, fallback) {
  return (val !== undefined && val !== null) ? val : fallback;
};

function saveDbState() {
  try {
    const data = {
      users: alasql('SELECT * FROM users'),
      vendors: alasql('SELECT * FROM vendors'),
      purchase_orders: alasql('SELECT * FROM purchase_orders'),
      payments: alasql('SELECT * FROM payments'),
      po_payments: alasql('SELECT * FROM po_payments'),
      deliveries: alasql('SELECT * FROM deliveries'),
      po_deliveries: alasql('SELECT * FROM po_deliveries')
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[AlaSQL] Failed to write database state to disk:', err.message);
  }
}

function loadDbState() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const fileData = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(fileData);
      
      if (data.users && data.users.length > 0) {
        alasql('DELETE FROM users');
        alasql('INSERT INTO users SELECT * FROM ?', [data.users]);
      }
      if (data.vendors && data.vendors.length > 0) {
        alasql('DELETE FROM vendors');
        alasql('INSERT INTO vendors SELECT * FROM ?', [data.vendors]);
      }
      if (data.purchase_orders && data.purchase_orders.length > 0) {
        alasql('DELETE FROM purchase_orders');
        alasql('INSERT INTO purchase_orders SELECT * FROM ?', [data.purchase_orders]);
      }
      if (data.payments && data.payments.length > 0) {
        alasql('DELETE FROM payments');
        alasql('INSERT INTO payments SELECT * FROM ?', [data.payments]);
      }
      if (data.po_payments && data.po_payments.length > 0) {
        alasql('DELETE FROM po_payments');
        alasql('INSERT INTO po_payments SELECT * FROM ?', [data.po_payments]);
      }
      if (data.deliveries && data.deliveries.length > 0) {
        alasql('DELETE FROM deliveries');
        alasql('INSERT INTO deliveries SELECT * FROM ?', [data.deliveries]);
      }
      if (data.po_deliveries && data.po_deliveries.length > 0) {
        alasql('DELETE FROM po_deliveries');
        alasql('INSERT INTO po_deliveries SELECT * FROM ?', [data.po_deliveries]);
      }
      console.log('[AlaSQL] Successfully pre-loaded persistent database state.');
    } catch (err) {
      console.warn('[AlaSQL] Failed to load saved state, seeding from codespace defaults:', err.message);
    }
  }
}

async function getMysqlPool() {
  if (isFallbackToAlaSql) {
    return null;
  }
  if (!pool) {
    try {
      const isSSL = process.env.DB_SSL === 'true' || (host && host.includes('aivencloud.com'));
      const connConfig = {
        host,
        port,
        user,
        password,
        connectTimeout: 5000
      };
      if (isSSL) {
        connConfig.ssl = { rejectUnauthorized: false };
      }
      const initConnection = await mysql.createConnection(connConfig);
      try {
        await initConnection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
      } catch (dbCreateError) {
        console.log(`[Database Master] Notice: CREATE DATABASE bypassed or unsupported (${dbCreateError.message}). Connecting directly to [${database}]...`);
      }
      await initConnection.end();

      pool = mysql.createPool({
        host,
        port,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 15,
        queueLimit: 0,
        ssl: isSSL ? { rejectUnauthorized: false } : undefined
      });
    } catch (err) {
      // Gracefully switch to sandboxed local memory model context if MySQL/Local server is not provisioned
      console.log('[System] Sandboxed local Database Engine initialized successfully.');
      isFallbackToAlaSql = true;
      initAlaSqlDb();
    }
  }
  return pool;
}

// Clean and transform SQL for AlaSQL compatibility
function cleanSqlForAlaSql(sql) {
  let processed = sql;
  
  // AlaSQL does not support 'total' or 'active' or 'balance' or 'count' as keyword aliases without brackets
  processed = processed.replace(/\b(as\s+total\b)/gi, 'as [total]');
  processed = processed.replace(/\b(as\s+active\b)/gi, 'as [active]');
  processed = processed.replace(/\b(as\s+balance\b)/gi, 'as [balance]');
  processed = processed.replace(/\b(as\s+count\b)/gi, 'as [count]');
  
  // Replace MySQL double quotes on items like JSON array elements if any, or general cleaning
  return processed;
}

export async function query(sql, params = []) {
  if (isFallbackToAlaSql) {
    if (sql.trim().toUpperCase() === 'SHOW TABLES') {
      return [
        { Tables_in_vendor_po_management: 'users' },
        { Tables_in_vendor_po_management: 'vendors' },
        { Tables_in_vendor_po_management: 'purchase_orders' },
        { Tables_in_vendor_po_management: 'payments' },
        { Tables_in_vendor_po_management: 'po_payments' },
        { Tables_in_vendor_po_management: 'deliveries' },
        { Tables_in_vendor_po_management: 'po_deliveries' }
      ];
    }
    const cleanSql = cleanSqlForAlaSql(sql);
    try {
      const rows = alasql(cleanSql, params);
      return rows;
    } catch (err) {
      console.error('[AlaSQL Error] Query failed:', { cleanSql, params, error: err.message });
      throw err;
    }
  }
  
  const p = await getMysqlPool();
  if (isFallbackToAlaSql) {
    return query(sql, params);
  }
  const [rows] = await p.query(sql, params);
  return rows;
}

export async function queryOne(sql, params = []) {
  if (isFallbackToAlaSql) {
    const rows = await query(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }
  
  const p = await getMysqlPool();
  if (isFallbackToAlaSql) {
    return queryOne(sql, params);
  }
  const [rows] = await p.query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function run(sql, params = []) {
  if (isFallbackToAlaSql) {
    const cleanSql = cleanSqlForAlaSql(sql);
    try {
      const result = alasql(cleanSql, params);
      
      let insertId = null;
      const match = sql.match(/INSERT\s+INTO\s+([_a-zA-Z0-9]+)/i);
      if (match && match[1]) {
        const tableName = match[1];
        const maxIdRes = alasql(`SELECT MAX(id) as max_id FROM ${tableName}`);
        insertId = maxIdRes && maxIdRes[0] ? maxIdRes[0].max_id : null;
      }
      
      // Auto-save state to disk if writing
      if (!sql.trim().toUpperCase().startsWith('SELECT')) {
        saveDbState();
      }
      
      return {
        id: insertId,
        changes: typeof result === 'number' ? result : 1
      };
    } catch (err) {
      console.error('[AlaSQL Error] Run failed:', { cleanSql, params, error: err.message });
      throw err;
    }
  }

  const p = await getMysqlPool();
  if (isFallbackToAlaSql) {
    return run(sql, params);
  }
  const [result] = await p.query(sql, params);
  return {
    id: result?.insertId || null,
    changes: result?.affectedRows || 0
  };
}

function initAlaSqlDb() {
  console.log('[AlaSQL] Initializing sandboxed local database schema...');
  
  alasql('CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, name STRING, username STRING, email STRING, password STRING, password_hash STRING, role STRING, reset_token STRING, reset_token_expiry STRING, created_at STRING)');
  alasql('CREATE TABLE IF NOT EXISTS vendors (id INT AUTO_INCREMENT PRIMARY KEY, name STRING, category STRING, contact_person STRING, phone STRING, email STRING, payment_terms STRING, active INT, status STRING, is_deleted INT, address STRING, created_at STRING)');
  alasql('CREATE TABLE IF NOT EXISTS purchase_orders (id INT AUTO_INCREMENT PRIMARY KEY, po_number STRING, vendor_id INT, po_date STRING, expected_delivery_date STRING, actual_delivery_date STRING, status STRING, total_amount NUMBER, advance_payment NUMBER, final_payment NUMBER, notes STRING, items STRING, material_name STRING, quantity INT, unit STRING, unit_price NUMBER, created_at STRING)');
  alasql('CREATE TABLE IF NOT EXISTS payments (id INT AUTO_INCREMENT PRIMARY KEY, po_id INT, vendor_id INT, payment_date STRING, amount NUMBER, payment_type STRING, payment_method STRING, reference_number STRING, reference_no STRING, notes STRING, created_at STRING)');
  alasql('CREATE TABLE IF NOT EXISTS po_payments (id INT AUTO_INCREMENT PRIMARY KEY, po_id INT, payment_type STRING, amount NUMBER, payment_date STRING, reference_no STRING, notes STRING)');
  alasql('CREATE TABLE IF NOT EXISTS deliveries (id INT AUTO_INCREMENT PRIMARY KEY, po_id INT, delivery_date STRING, received_by STRING, delivery_status STRING, delivery_notes STRING, created_at STRING)');
  alasql('CREATE TABLE IF NOT EXISTS po_deliveries (id INT AUTO_INCREMENT PRIMARY KEY, po_id INT, delivered_qty INT, delivery_date STRING, delivery_notes STRING)');

  // Load from disk if available
  loadDbState();

  // Seed Admin if empty or obsolete
  alasql('DELETE FROM users WHERE email = ?', ['admin@paperplane.com']);
  const uCount = alasql('SELECT COUNT(*) as cnt FROM users WHERE email = ?', ['edharanagasaimanohar@gmail.com'])[0].cnt;
  if (uCount === 0) {
    const pwHash = bcrypt.hashSync('PaperPlane@2026', 10);
    alasql('INSERT INTO users (name, username, email, password, password_hash, role, reset_token, reset_token_expiry) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['Administrator', 'admin', 'edharanagasaimanohar@gmail.com', null, pwHash, 'admin', null, null]
    );
    console.log('[AlaSQL] Seeded custom Administrator user credentials (hashed only).');
  }
}

export async function initDb() {
  // Let isFallbackToAlaSql stay false to test MySQL first
  isFallbackToAlaSql = false;
  console.log(`[Database Master] Target configured dialect: [MYSQL] on database: [${database}]`);
  
  // Connect/ping MySQL to discover if local server is active
  await getMysqlPool();

  if (isFallbackToAlaSql) {
    // AlAsql initialization has already run inside getMysqlPool catch block
    return;
  }

  // Create MySQL Tables
  // 1. Users Table
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NULL,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'admin',
      reset_token VARCHAR(255) NULL,
      reset_token_expiry DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  try {
    await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255) NULL;`);
    await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry DATETIME NULL;`);
  } catch (err) {
    // Ignore error if column already exists or IF NOT EXISTS syntax fails on some platforms
  }

  // 2. Vendors Table
  await run(`
    CREATE TABLE IF NOT EXISTS vendors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100) DEFAULT 'General',
      contact_person VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      email VARCHAR(255) NOT NULL,
      payment_terms VARCHAR(50) DEFAULT 'Net 30',
      active TINYINT DEFAULT 1,
      status VARCHAR(50) DEFAULT 'Active',
      is_deleted INT DEFAULT 0,
      address VARCHAR(500) DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  // 3. Purchase Orders Table
  await run(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      po_number VARCHAR(100) UNIQUE NOT NULL,
      vendor_id INT NOT NULL,
      po_date VARCHAR(50) NOT NULL,
      expected_delivery_date VARCHAR(50) NOT NULL,
      actual_delivery_date VARCHAR(50) NULL,
      status VARCHAR(50) NOT NULL,
      total_amount DOUBLE NOT NULL DEFAULT 0.0,
      advance_payment DOUBLE NOT NULL DEFAULT 0.0,
      final_payment DOUBLE NOT NULL DEFAULT 0.0,
      notes TEXT NULL,
      items TEXT NULL,
      material_name VARCHAR(255) NULL,
      quantity INT NULL,
      unit VARCHAR(50) NULL,
      unit_price DOUBLE NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  // 4. Payments Table
  await run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      po_id INT NOT NULL,
      vendor_id INT NOT NULL,
      payment_date VARCHAR(50) NOT NULL,
      amount DOUBLE NOT NULL,
      payment_type VARCHAR(50) NOT NULL,
      payment_method VARCHAR(50) NOT NULL,
      reference_number VARCHAR(100) NOT NULL,
      reference_no VARCHAR(100) NULL,
      notes TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  // 5. po_payments Table
  await run(`
    CREATE TABLE IF NOT EXISTS po_payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      po_id INT NOT NULL,
      payment_type VARCHAR(50) NOT NULL,
      amount DOUBLE NOT NULL,
      payment_date VARCHAR(50) NOT NULL,
      reference_no VARCHAR(100) NOT NULL,
      notes TEXT NULL,
      FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  // 6. Deliveries Table
  await run(`
    CREATE TABLE IF NOT EXISTS deliveries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      po_id INT NOT NULL,
      delivery_date VARCHAR(50) NOT NULL,
      received_by VARCHAR(255) NOT NULL,
      delivery_status VARCHAR(50) NOT NULL,
      delivery_notes TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  // 7. po_deliveries Table
  await run(`
    CREATE TABLE IF NOT EXISTS po_deliveries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      po_id INT NOT NULL,
      delivered_qty INT NOT NULL,
      delivery_date VARCHAR(50) NOT NULL,
      delivery_notes TEXT NULL,
      FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  // Delete obsolete administrator and seed new custom administrator user
  await run('DELETE FROM users WHERE email = ?', ['admin@paperplane.com']);
  const uCountCustom = await queryOne('SELECT count(*) as cnt FROM users WHERE email = ?', ['edharanagasaimanohar@gmail.com']);
  if (!uCountCustom || uCountCustom.cnt === 0) {
    const pwHash = bcrypt.hashSync('PaperPlane@2026', 10);
    await run(
      'INSERT INTO users (name, username, email, password, password_hash, role, reset_token, reset_token_expiry) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['Administrator', 'admin', 'edharanagasaimanohar@gmail.com', null, pwHash, 'admin', null, null]
    );
    console.log('[MySQL] Custom administrator user seeded (hashed only).');
  }

}
