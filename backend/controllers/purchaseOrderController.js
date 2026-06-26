import { query, queryOne, run } from '../config/db.js';

// Dashboard stats aggregation API
export async function getDashboardStats(req, res, next) {
  try {
    const totalVendors = await queryOne(`
      SELECT 
        COUNT(*) as total, 
        SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active 
      FROM vendors
      WHERE COALESCE(is_deleted, 0) = 0
    `);

    const openPOs = await queryOne(`
      SELECT COUNT(*) as count 
      FROM purchase_orders 
      WHERE status IN ('Draft', 'Pending', 'Partially Delivered')
    `);

    const deliveredPOs = await queryOne(`
      SELECT COUNT(*) as count 
      FROM purchase_orders 
      WHERE status = 'Delivered'
    `);

    // Sum PO amount minus total payments
    const outstanding = await queryOne(`
      SELECT SUM(total_amount - (advance_payment + final_payment)) as balance
      FROM purchase_orders
      WHERE status != 'Cancelled'
    `);

    // Dynamic Monthly spend aggregate
    const spendRows = await query(`
      SELECT 
        DATE_FORMAT(po_date, '%Y-%m') as month_str,
        SUM(total_amount) as amount
      FROM purchase_orders
      WHERE status != 'Cancelled'
      GROUP BY month_str
      ORDER BY month_str DESC
      LIMIT 6
    `);

    // Format spend stats nicely for recharts
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlySpend = (spendRows || []).map(row => {
      if (!row || !row.month_str || typeof row.month_str !== 'string') {
        return {
          month: 'Unknown',
          name: 'Unknown',
          amount: row?.amount || 0,
        };
      }
      const parts = row.month_str.split('-');
      if (parts.length < 2) {
        return {
          month: row.month_str,
          name: row.month_str,
          amount: row.amount || 0,
        };
      }
      const monthIdx = parseInt(parts[1], 10) - 1;
      const label = `${monthNames[monthIdx] || parts[1]} ${parts[0]}`;
      return {
        month: row.month_str,
        name: label,
        amount: row.amount,
      };
    }).reverse();

    res.json({
      totalVendors: totalVendors?.total || 0,
      activeVendors: totalVendors?.active || 0,
      openPOs: openPOs?.count || 0,
      deliveredPOs: deliveredPOs?.count || 0,
      outstandingAmount: outstanding?.balance || 0,
      monthlySpend,
    });
  } catch (error) {
    next(error);
  }
}

// Purchase Orders list API
export async function getPurchaseOrders(req, res, next) {
  const { search, status, vendor_id } = req.query;
  try {
    let sql = `
      SELECT po.*, v.name as vendor_name, v.email as vendor_email
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ' AND (po.po_number LIKE ? OR po.notes LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      sql += ' AND po.status = ?';
      params.push(status);
    }

    if (vendor_id) {
      sql += ' AND po.vendor_id = ?';
      params.push(vendor_id);
    }

    sql += ' ORDER BY po.po_date DESC, po.id DESC';
    const pos = await query(sql, params);

    // Parse items JSON safely for each PO (could be object or string depending on SQL engine)
    const formatted = pos.map((po) => {
      let parsedItems = [];
      try {
        if (po.items) {
          parsedItems = typeof po.items === 'string' ? JSON.parse(po.items) : po.items;
        }
      } catch (e) {
        console.warn('Failed to parse purchase order items:', e.message, po.items);
      }
      return {
        ...po,
        items: Array.isArray(parsedItems) ? parsedItems : [],
      };
    });

    res.json(formatted);
  } catch (error) {
    next(error);
  }
}

// Generate next PO auto number pipeline
export async function getNextPoNumber(req, res, next) {
  try {
    const year = new Date().getFullYear();
    const countRow = await queryOne('SELECT count(*) as cnt FROM purchase_orders');
    const cnt = (countRow?.cnt || 0) + 1;
    const poNumber = `PP-PO-${year}-${cnt.toString().padStart(4, '0')}`;
    res.json({ poNumber });
  } catch (error) {
    next(error);
  }
}

// Create PO
export async function createPurchaseOrder(req, res, next) {
  const { vendor_id, po_date, expected_delivery_date, status, notes, items } = req.body;

  if (!vendor_id || !po_date || !expected_delivery_date || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Vendor, PO Date, Expected Delivery Date, and items list are required.' });
  }

  try {
    // Generate PO Number
    const year = new Date().getFullYear();
    const countRow = await queryOne('SELECT count(*) as cnt FROM purchase_orders');
    const cnt = (countRow?.cnt || 0) + 1;
    const poNumber = `PP-PO-${year}-${cnt.toString().padStart(4, '0')}`;

    // Calculate total amount from items
    const parsedItems = items.map(item => ({
      name: item.name,
      qty: Number(item.qty),
      price: Number(item.price)
    }));
    const totalAmount = parsedItems.reduce((acc, item) => acc + (item.qty * item.price), 0);

    const result = await run(
      `INSERT INTO purchase_orders 
       (po_number, vendor_id, po_date, expected_delivery_date, status, total_amount, advance_payment, final_payment, notes, items) 
       VALUES (?, ?, ?, ?, ?, ?, 0.0, 0.0, ?, ?)`,
      [poNumber, vendor_id, po_date, expected_delivery_date, status || 'Draft', totalAmount, notes || '', JSON.stringify(parsedItems)]
    );

    const newPO = await queryOne('SELECT * FROM purchase_orders WHERE id = ?', [result.id]);
    res.status(201).json(newPO);
  } catch (error) {
    next(error);
  }
}

// Update PO
export async function updatePurchaseOrder(req, res, next) {
  const { id } = req.params;
  const { vendor_id, po_date, expected_delivery_date, status, notes, items, advance_payment, final_payment } = req.body;

  try {
    const numericId = parseInt(id, 10);
    const previousPo = await queryOne('SELECT * FROM purchase_orders WHERE id = ?', [numericId]);
    if (!previousPo) {
      return res.status(404).json({ error: 'Purchase Order not found.' });
    }

    let updateFields = [];
    let params = [];

    if (vendor_id) { updateFields.push('vendor_id = ?'); params.push(parseInt(vendor_id, 10)); }
    if (po_date) { updateFields.push('po_date = ?'); params.push(po_date); }
    if (expected_delivery_date) { updateFields.push('expected_delivery_date = ?'); params.push(expected_delivery_date); }
    if (status) { updateFields.push('status = ?'); params.push(status); }
    if (notes !== undefined) { updateFields.push('notes = ?'); params.push(notes); }
    
    if (items && Array.isArray(items)) {
      const parsedItems = items.map(item => ({
        name: item.name,
        qty: Number(item.qty),
        price: Number(item.price)
      }));
      const totalAmount = parsedItems.reduce((acc, item) => acc + (item.qty * item.price), 0);
      updateFields.push('items = ?'); 
      params.push(JSON.stringify(parsedItems));
      updateFields.push('total_amount = ?');
      params.push(totalAmount);
    }

    if (advance_payment !== undefined) { updateFields.push('advance_payment = ?'); params.push(advance_payment); }
    if (final_payment !== undefined) { updateFields.push('final_payment = ?'); params.push(final_payment); }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields provided for updates.' });
    }

    params.push(numericId);
    await run(`UPDATE purchase_orders SET ${updateFields.join(', ')} WHERE id = ?`, params);

    const updated = await queryOne('SELECT * FROM purchase_orders WHERE id = ?', [numericId]);

    res.json(updated);
  } catch (error) {
    next(error);
  }
}

// Delete PO
export async function deletePurchaseOrder(req, res, next) {
  const { id } = req.params;
  try {
    const numericId = parseInt(id, 10);
    await run('DELETE FROM purchase_orders WHERE id = ?', [numericId]);
    res.json({ message: 'Purchase order deleted.' });
  } catch (error) {
    next(error);
  }
}

// Get PO by ID (including child components log)
export async function getPurchaseOrderById(req, res, next) {
  const { id } = req.params;
  try {
    const numericId = parseInt(id, 10);
    const po = await queryOne('SELECT * FROM purchase_orders WHERE id = ?', [numericId]);
    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found.' });
    }
    const vendor = await queryOne('SELECT * FROM vendors WHERE id = ?', [po.vendor_id]);
    const payments = await query('SELECT * FROM po_payments WHERE po_id = ?', [numericId]);
    
    const total_paid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balance_due = po.total_amount - total_paid;

    res.json({
      purchase_order: po,
      vendor: vendor || null,
      payments: payments || [],
      total_paid,
      balance_due,
      status: po.status
    });
  } catch (error) {
    next(error);
  }
}

// Register specific payment of a PO
export async function addPaymentToPo(req, res, next) {
  const { id } = req.params;
  const { amount, payment_type, payment_date, reference_no, notes } = req.body;

  const paymentAmount = Number(amount);
  if (isNaN(paymentAmount) || paymentAmount <= 0) {
    return res.status(400).json({ message: 'Payment amount must be greater than zero' });
  }

  if (!payment_type || !payment_date || !reference_no) {
    return res.status(400).json({ error: 'Payment type, date, and reference number are required.' });
  }

  try {
    const numericId = parseInt(id, 10);
    const po = await queryOne('SELECT * FROM purchase_orders WHERE id = ?', [numericId]);
    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found.' });
    }

    const payments = await query('SELECT * FROM po_payments WHERE po_id = ?', [numericId]);
    const currentPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    // Overpayment check
    if (currentPaid + paymentAmount > po.total_amount) {
      return res.status(400).json({ message: 'Overpayment detected' });
    }

    // Insert into po_payments table
    await run(
      `INSERT INTO po_payments (po_id, payment_type, amount, payment_date, reference_no, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [numericId, payment_type, paymentAmount, payment_date, reference_no, notes || '']
    );

    // Sync to payments table for backwards compatibility
    try {
      await run(
        `INSERT INTO payments (po_id, vendor_id, payment_date, amount, payment_type, payment_method, reference_number, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [numericId, po.vendor_id, payment_date, paymentAmount, payment_type, 'Bank Transfer', reference_no, notes || '']
      );
    } catch (syncErr) {
      console.warn('Sync to payments table failed:', syncErr.message);
    }

    // Recalculate everything
    const updatedPayments = await query('SELECT * FROM po_payments WHERE po_id = ?', [numericId]);
    const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = po.total_amount - totalPaid;

    const dCheck = await queryOne(
      `SELECT count(*) as cnt FROM deliveries WHERE po_id = ? AND (delivery_status = 'Fully Delivered' OR delivery_status = 'Delivered')`,
      [numericId]
    );
    const deliveryConfirmed = (dCheck && dCheck.cnt > 0) || po.status === 'Delivered' || po.status === 'Settled';

    let newStatus = po.status;
    if (balanceDue === po.total_amount) {
      newStatus = 'Open';
    } else if (balanceDue > 0 && balanceDue < po.total_amount) {
      newStatus = 'Partially Paid';
    } else if (balanceDue === 0) {
      if (!deliveryConfirmed) {
        newStatus = 'Awaiting Delivery';
      } else {
        newStatus = 'Settled';
      }
    }

    // Recalculate advance_payment and final_payment totals on the PO object
    const advanceSumObj = await queryOne(
      `SELECT SUM(amount) as s FROM po_payments WHERE po_id = ? AND payment_type = 'Advance'`,
      [numericId]
    );
    const finalSumObj = await queryOne(
      `SELECT SUM(amount) as s FROM po_payments WHERE po_id = ? AND payment_type != 'Advance'`,
      [numericId]
    );
    const advance_payment = Number(advanceSumObj?.s || 0);
    const final_payment = Number(finalSumObj?.s || 0);

    await run(
      'UPDATE purchase_orders SET status = ?, advance_payment = ?, final_payment = ? WHERE id = ?',
      [newStatus, advance_payment, final_payment, numericId]
    );

    const updatedPO = await queryOne('SELECT * FROM purchase_orders WHERE id = ?', [numericId]);

    res.json({
      purchase_order: updatedPO,
      total_paid: totalPaid,
      balance_due: balanceDue,
      status: newStatus,
      payments: updatedPayments
    });
  } catch (error) {
    next(error);
  }
}

// Confirm PO Delivery
export async function confirmDelivery(req, res, next) {
  const { id } = req.params;
  const { delivered_qty, delivery_date, delivery_notes } = req.body;

  try {
    const numericId = parseInt(id, 10);
    const po = await queryOne('SELECT * FROM purchase_orders WHERE id = ?', [numericId]);
    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found.' });
    }

    // Insert into po_deliveries
    const result = await run(
      `INSERT INTO po_deliveries (po_id, delivered_qty, delivery_date, delivery_notes)
       VALUES (?, ?, ?, ?)`,
      [numericId, delivered_qty || po.quantity || 1, delivery_date, delivery_notes || '']
    );

    // Get payment history
    const payments = await query('SELECT * FROM po_payments WHERE po_id = ?', [numericId]);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = po.total_amount - totalPaid;

    let newStatus = 'Delivered';
    if (balanceDue === 0) {
      newStatus = 'Settled';
    }

    // Update purchase_orders
    await run(
      'UPDATE purchase_orders SET actual_delivery_date = ?, status = ? WHERE id = ?',
      [delivery_date, newStatus, numericId]
    );

    const updatedPO = await queryOne('SELECT * FROM purchase_orders WHERE id = ?', [numericId]);
    const deliveryRecord = await queryOne('SELECT * FROM po_deliveries WHERE id = ?', [result.id]);

    res.json({
      purchase_order: updatedPO,
      balance_due: balanceDue,
      status: newStatus,
      delivery: deliveryRecord
    });
  } catch (error) {
    next(error);
  }
}

// Spend monthly report aggregation
export async function getMonthlySpendReport(req, res, next) {
  try {
    const monthlySummary = await query(`
      SELECT 
        DATE_FORMAT(po.po_date, '%Y-%m') as month_str,
        v.name as vendor_name,
        SUM(po.total_amount) as total_amount,
        COUNT(po.id) as po_count
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      WHERE po.status != 'Cancelled'
      GROUP BY month_str, v.name
      ORDER BY month_str DESC, total_amount DESC
    `);
    res.json(monthlySummary);
  } catch (error) {
    next(error);
  }
}

// Vendor Performance metrics report aggregation
export async function getVendorPerformanceReport(req, res, next) {
  try {
    const performances = await query(`
      SELECT 
        v.id as vendor_id,
        v.name as vendor_name,
        COUNT(po.id) as total_orders,
        SUM(po.total_amount) as total_spend,
        SUM(CASE WHEN po.status = 'Delivered' THEN 1 ELSE 0 END) as delivered_orders,
        SUM(CASE WHEN po.status = 'Partially Delivered' THEN 1 ELSE 0 END) as partial_orders,
        SUM(CASE WHEN po.status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled_orders
      FROM vendors v
      LEFT JOIN purchase_orders po ON v.id = po.vendor_id
      WHERE COALESCE(v.is_deleted, 0) = 0
      GROUP BY v.id, v.name
      ORDER BY total_spend DESC
    `);
    res.json(performances);
  } catch (error) {
    next(error);
  }
}
