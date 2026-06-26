import { query, queryOne, run } from '../config/db.js';

export async function getVendors(req, res, next) {
  const { search, status, trash } = req.query;
  try {
    const showTrash = trash === 'true';
    let sql = 'SELECT * FROM vendors WHERE COALESCE(is_deleted, 0) = ?';
    const params = [showTrash ? 1 : 0];

    if (search) {
      sql += ' AND (name LIKE ? OR contact_person LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY name ASC';
    const vendors = await query(sql, params);
    res.json(vendors);
  } catch (error) {
    next(error);
  }
}

export async function getVendorById(req, res, next) {
  const { id } = req.params;
  try {
    const vendor = await queryOne('SELECT * FROM vendors WHERE id = ?', [parseInt(id, 10)]);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found.' });
    }
    res.json(vendor);
  } catch (error) {
    next(error);
  }
}

export async function createVendor(req, res, next) {
  const { name, category, payment_terms, contact_person, email, phone, address, status } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Vendor Name is required.' });
  }
  if (!phone || !phone.trim()) {
    return res.status(400).json({ error: 'Phone is required.' });
  }
  if (!payment_terms || !payment_terms.trim()) {
    return res.status(400).json({ error: 'Payment Terms are required.' });
  }

  try {
    const result = await run(
      'INSERT INTO vendors (name, category, payment_terms, contact_person, email, phone, address, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        name.trim(), 
        category ? category.trim() : 'General', 
        payment_terms.trim(), 
        contact_person ? contact_person.trim() : '', 
        email ? email.trim() : '', 
        phone.trim(), 
        address ? address.trim() : '', 
        status || 'Active'
      ]
    );
    const newVendor = await queryOne('SELECT * FROM vendors WHERE id = ?', [result.id]);
    res.status(201).json(newVendor);
  } catch (error) {
    next(error);
  }
}

export async function updateVendor(req, res, next) {
  const { id } = req.params;
  const { name, category, payment_terms, contact_person, email, phone, address, status } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Vendor Name is required.' });
  }
  if (!phone || !phone.trim()) {
    return res.status(400).json({ error: 'Phone is required.' });
  }
  if (!payment_terms || !payment_terms.trim()) {
    return res.status(400).json({ error: 'Payment Terms are required.' });
  }

  try {
    const numericId = parseInt(id, 10);
    await run(
      'UPDATE vendors SET name = ?, category = ?, payment_terms = ?, contact_person = ?, email = ?, phone = ?, address = ?, status = ? WHERE id = ?',
      [
        name.trim(), 
        category ? category.trim() : 'General', 
        payment_terms.trim(), 
        contact_person ? contact_person.trim() : '', 
        email ? email.trim() : '', 
        phone.trim(), 
        address ? address.trim() : '', 
        status, 
        numericId
      ]
    );
    const updated = await queryOne('SELECT * FROM vendors WHERE id = ?', [numericId]);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function deleteVendor(req, res, next) {
  const { id } = req.params;
  const { purge } = req.query;
  try {
    const numericId = parseInt(id, 10);
    if (purge === 'true') {
      await run('DELETE FROM vendors WHERE id = ?', [numericId]);
      res.json({ message: 'Vendor permanently deleted.' });
    } else {
      await run('UPDATE vendors SET is_deleted = 1 WHERE id = ?', [numericId]);
      res.json({ message: 'Vendor moved to trash.' });
    }
  } catch (error) {
    next(error);
  }
}

export async function restoreVendor(req, res, next) {
  const { id } = req.params;
  try {
    const numericId = parseInt(id, 10);
    await run('UPDATE vendors SET is_deleted = 0 WHERE id = ?', [numericId]);
    res.json({ message: 'Vendor restored from trash.' });
  } catch (error) {
    next(error);
  }
}

export async function getVendorStatement(req, res, next) {
  const { id } = req.params;
  try {
    const numericId = parseInt(id, 10);
    const vendor = await queryOne('SELECT * FROM vendors WHERE id = ?', [numericId]);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found.' });
    }

    // Fetch purchase orders with payment balances
    const pos = await query("SELECT * FROM purchase_orders WHERE vendor_id = ? AND status != 'Cancelled' ORDER BY po_date DESC", [numericId]);
    const purchase_orders = [];

    let totalPOAmount = 0;
    let totalPaid = 0;

    for (const po of pos) {
      const paymentsForPO = await query('SELECT * FROM po_payments WHERE po_id = ?', [po.id]);
      const paid = paymentsForPO.reduce((sum, p) => sum + p.amount, 0);
      const balance_due = po.total_amount - paid;
      
      purchase_orders.push({
        ...po,
        total_paid: paid,
        balance_due,
      });

      totalPOAmount += po.total_amount;
      totalPaid += paid;
    }

    // Fetch all payments for this vendor
    const payments = await query(`
      SELECT p.*, po.po_number 
      FROM po_payments p
      JOIN purchase_orders po ON p.po_id = po.id
      WHERE po.vendor_id = ?
      ORDER BY p.payment_date DESC
    `, [numericId]);

    const outstanding = totalPOAmount - totalPaid;

    res.json({
      vendor,
      purchase_orders,
      payments,
      total_purchase_value: totalPOAmount,
      total_paid: totalPaid,
      total_outstanding: outstanding
    });
  } catch (error) {
    next(error);
  }
}
