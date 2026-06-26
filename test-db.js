import alasql from 'alasql';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

console.log('--- GENERATING PUBLIC FAVICONS & STATIC ASSETS ---');
try {
  const publicDir = path.resolve('./public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const masterSource = path.resolve('./frontend/src/assets/images/paper_plane_logo_1782193203592.jpg');
  if (fs.existsSync(masterSource)) {
    const fileBytes = fs.readFileSync(masterSource);
    const targetPaths = [
      'favicon.ico',
      'favicon-16x16.png',
      'favicon-32x32.png',
      'apple-touch-icon.png',
      'android-chrome-192x192.png',
      'android-chrome-512x512.png'
    ];
    for (const filename of targetPaths) {
      const fullDest = path.join(publicDir, filename);
      fs.writeFileSync(fullDest, fileBytes);
      console.log(`[Success] Written public asset: ${filename}`);
    }

    // Write standard manifest.json
    const manifestContent = {
      short_name: "Paper Plane",
      name: "Paper Plane Procurement SaaS",
      icons: [
        {
          src: "/favicon.ico",
          sizes: "64x64 32x32 24x24 16x16",
          type: "image/x-icon"
        },
        {
          src: "/android-chrome-192x192.png",
          type: "image/png",
          sizes: "192x192"
        },
        {
          src: "/android-chrome-512x512.png",
          type: "image/png",
          sizes: "512x512"
        }
      ],
      start_url: ".",
      display: "standalone",
      theme_color: "#000000",
      background_color: "#ffffff"
    };
    fs.writeFileSync(path.join(publicDir, 'manifest.json'), JSON.stringify(manifestContent, null, 2));
    console.log('[Success] Written public asset: manifest.json');
  } else {
    console.warn(`[Warning] Master logo image not found at ${masterSource}`);
  }
} catch (error) {
  console.error('[Error] Writing favicon assets failed:', error.message);
}

console.log('--- TESTING ALASQL FALLBACK DIAGNOSTICS ---');

alasql.options.mysql = true;

// Define custom functions
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

try {
  // Declare schema
  alasql('CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, name STRING, username STRING, email STRING, password STRING, password_hash STRING, role STRING, created_at STRING)');
  alasql('CREATE TABLE IF NOT EXISTS vendors (id INT AUTO_INCREMENT PRIMARY KEY, name STRING, category STRING, contact_person STRING, phone STRING, email STRING, payment_terms STRING, active INT, status STRING, is_deleted INT, address STRING, created_at STRING)');
  alasql('CREATE TABLE IF NOT EXISTS purchase_orders (id INT AUTO_INCREMENT PRIMARY KEY, po_number STRING, vendor_id INT, po_date STRING, expected_delivery_date STRING, actual_delivery_date STRING, status STRING, total_amount NUMBER, advance_payment NUMBER, final_payment NUMBER, notes STRING, items STRING, material_name STRING, quantity INT, unit STRING, unit_price NUMBER, created_at STRING)');
  alasql('CREATE TABLE IF NOT EXISTS payments (id INT AUTO_INCREMENT PRIMARY KEY, po_id INT, vendor_id INT, payment_date STRING, amount NUMBER, payment_type STRING, payment_method STRING, reference_number STRING, reference_no STRING, notes STRING, created_at STRING)');
  alasql('CREATE TABLE IF NOT EXISTS po_payments (id INT AUTO_INCREMENT PRIMARY KEY, po_id INT, payment_type STRING, amount NUMBER, payment_date STRING, reference_no STRING, notes STRING)');
  
  console.log('Tables created successfully in AlaSQL!');

  // Seed default dataset
  const pwHash = bcrypt.hashSync('PaperPlane@2026', 10);
  alasql('INSERT INTO users (name, username, email, password, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)',
    ['Administrator', 'admin', 'edharanagasaimanohar@gmail.com', 'PaperPlane@2026', pwHash, 'admin']
  );

  alasql(`INSERT INTO vendors (id, name, category, payment_terms, contact_person, email, phone, address, status, active) VALUES
    (1, 'BoxCraft Supplies', 'Packaging & Boxes', 'Net 30', 'Sarah Jenkins', 'contact@boxcraft.com', '+1-555-0192', '102 Industrial Way, Suite B, Seattle, WA', 'Active', 1),
    (2, 'Ribbon World', 'Ribbons & Tags', 'Net 15', 'David Cho', 'sales@ribbonworld.com', '+1-555-0143', '45 Grace St, San Francisco, CA', 'Active', 1)`);

  alasql(`INSERT INTO purchase_orders (id, po_number, vendor_id, po_date, expected_delivery_date, status, total_amount, advance_payment, final_payment, notes, items, material_name, quantity, unit, unit_price) VALUES
    (1, 'PP-PO-2026-0001', 1, '2026-05-10', '2026-05-18', 'Delivered', 1200.00, 400.00, 800.00, 'Custom kraft paper boxes for personalized wine gift packages.', '[]', 'Custom Kraft Boxes', 600, 'pcs', 1.50),
    (2, 'PP-PO-2026-0002', 2, '2026-05-15', '2026-05-25', 'Delivered', 450.00, 150.00, 300.00, 'Assorted satin ribbons.', '[]', 'Gold Satin Ribbon Spools', 100, 'spools', 2.50)`);

  console.log('Data seeded successfully in AlaSQL!');

  // Query 1: SELECT with email filter
  const user = alasql('SELECT * FROM users WHERE email = ?', ['edharanagasaimanohar@gmail.com']);
  console.log('Query 1 (Users):', user);

  // Query 2: SELECT COUNT(*), SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END)
  // Let's test the database cleaner helper directly
  function cleanSqlForAlaSql(sql) {
    let processed = sql;
    processed = processed.replace(/\b(as\s+total\b)/gi, 'as [total]');
    processed = processed.replace(/\b(as\s+active\b)/gi, 'as [active]');
    processed = processed.replace(/\b(as\s+balance\b)/gi, 'as [balance]');
    processed = processed.replace(/\b(as\s+count\b)/gi, 'as [count]');
    return processed;
  }

  const q1Raw = `
    SELECT 
      COUNT(*) as total, 
      SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active 
    FROM vendors
    WHERE COALESCE(is_deleted, 0) = 0
  `;
  const totalVendors = alasql(cleanSqlForAlaSql(q1Raw));
  console.log('Query 1 (totalVendors):', totalVendors);

  const q2Raw = `
    SELECT COUNT(*) as count 
    FROM purchase_orders 
    WHERE status IN ('Draft', 'Pending', 'Partially Delivered')
  `;
  const openPOs = alasql(cleanSqlForAlaSql(q2Raw));
  console.log('Query 2 (openPOs):', openPOs);

  const q3Raw = `
    SELECT COUNT(*) as count 
    FROM purchase_orders 
    WHERE status = 'Delivered'
  `;
  const deliveredPOs = alasql(cleanSqlForAlaSql(q3Raw));
  console.log('Query 3 (deliveredPOs):', deliveredPOs);

  const q4Raw = `
    SELECT SUM(total_amount - (advance_payment + final_payment)) as balance
    FROM purchase_orders
    WHERE status != 'Cancelled'
  `;
  const outstanding = alasql(cleanSqlForAlaSql(q4Raw));
  console.log('Query 4 (outstanding):', outstanding);

  const q5Raw = `
    SELECT 
      DATE_FORMAT(po_date, '%Y-%m') as month_str,
      SUM(total_amount) as amount
    FROM purchase_orders
    WHERE status != 'Cancelled'
    GROUP BY month_str
    ORDER BY month_str DESC
    LIMIT 6
  `;
  const spendRows = alasql(cleanSqlForAlaSql(q5Raw));
  console.log('Query 5 (spendRows):', spendRows);

  console.log('--- ALL ALASQL TESTS PASSED SUCCESSFULLY! ---');

  // Live Aiven MySQL Connection Verification
  console.log('--- TESTING LIVE AIVEN MYSQL DATABASE CONNECTION ---');
  if (process.env.DB_HOST) {
    console.log(`Attempting connection to Host: ${process.env.DB_HOST}:${process.env.DB_PORT || 3306} as User: ${process.env.DB_USER}`);
    try {
      const connConfig = {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        connectTimeout: 5000
      };
      if (process.env.DB_SSL === 'true') {
        connConfig.ssl = { rejectUnauthorized: false };
      }
      
      const connection = await mysql.createConnection(connConfig);
      console.log('[Success] Connection to Aiven MySQL established successfully!');
      
      const [threeResult] = await connection.query('SELECT 1 + 2 as three');
      console.log(`[Success] Verified Query "SELECT 1 + 2 as three" output:`, threeResult);
      
      const [tables] = await connection.query('SHOW TABLES');
      console.log(`[Success] Retreived tables list from "${process.env.DB_NAME}":`, tables);
      
      await connection.end();
      console.log('--- ALL LIVE MYSQL TESTS PASSED SUCCESSFULLY! ---');
    } catch (mysqlErr) {
      console.error('[Error] LIVE AIVEN MYSQL DIAGNOSTIC FAILURE:', mysqlErr.message);
      console.log('Please ensure database credentials in /.env are valid and SSL is enabled.');
    }
  } else {
    console.log('No DB_HOST environment variable configured. Skipping live MySQL tests.');
  }

} catch (err) {
  console.error('DIAGNOSTIC FAILURE:', err.message);
  console.error(err.stack);
  process.exit(1);
}
