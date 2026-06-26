import { query, queryOne, run } from '../config/db.js';

export async function getDeliveries(req, res, next) {
  try {
    const deliveries = await query(`
      SELECT d.*, po.po_number, v.name as vendor_name
      FROM deliveries d
      JOIN purchase_orders po ON d.po_id = po.id
      JOIN vendors v ON po.vendor_id = v.id
      ORDER BY d.delivery_date DESC, d.id DESC
    `);
    res.json(deliveries);
  } catch (error) {
    next(error);
  }
}

export async function createDelivery(req, res, next) {
  const { po_id, delivery_date, received_by, delivery_status, delivery_notes } = req.body;

  if (!po_id || !delivery_date || !received_by || !delivery_status) {
    return res.status(400).json({ error: 'Required fields are missing.' });
  }

  try {
    const parsedPoId = parseInt(po_id, 10);

    // Save to delivery log
    await run(
      'INSERT INTO deliveries (po_id, delivery_date, received_by, delivery_status, delivery_notes) VALUES (?, ?, ?, ?, ?)',
      [parsedPoId, delivery_date, received_by, delivery_status, delivery_notes || '']
    );

    // Also populate po_deliveries for internship schema compliance
    let deliveredQty = 0;
    try {
      const poDetails = await queryOne('SELECT items FROM purchase_orders WHERE id = ?', [parsedPoId]);
      if (poDetails && poDetails.items) {
        const parsed = typeof poDetails.items === 'string' ? JSON.parse(poDetails.items) : poDetails.items;
        if (Array.isArray(parsed)) {
          deliveredQty = parsed.reduce((acc, it) => acc + Number(it.qty || 0), 0);
        }
      }
    } catch (e) {
      console.warn('Could not parse items for delivered quantity, defaulting:', e.message);
    }
    
    await run(
      'INSERT INTO po_deliveries (po_id, delivered_qty, delivery_date, delivery_notes) VALUES (?, ?, ?, ?)',
      [parsedPoId, deliveredQty || 1, delivery_date, delivery_notes || '']
    );

    // Automatically update Purchase Order status (as per the exact specification)
    const po = await queryOne('SELECT * FROM purchase_orders WHERE id = ?', [parsedPoId]);
    if (po) {
      const payments = await query('SELECT * FROM po_payments WHERE po_id = ?', [parsedPoId]);
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const balanceDue = po.total_amount - totalPaid;

      const deliveryConfirmed = (delivery_status === 'Fully Delivered' || delivery_status === 'Delivered');

      let poStatus = po.status;
      if (balanceDue === po.total_amount) {
        poStatus = deliveryConfirmed ? 'Delivered' : (delivery_status === 'Partially Delivered' ? 'Partially Delivered' : 'Open');
      } else if (balanceDue > 0 && balanceDue < po.total_amount) {
        poStatus = deliveryConfirmed ? 'Delivered' : (delivery_status === 'Partially Delivered' ? 'Partially Delivered' : 'Partially Paid');
      } else if (balanceDue === 0) {
        if (!deliveryConfirmed) {
          poStatus = 'Awaiting Delivery';
        } else {
          poStatus = 'Settled';
        }
      } else {
        poStatus = deliveryConfirmed ? 'Settled' : 'Awaiting Delivery';
      }

      await run('UPDATE purchase_orders SET status = ? WHERE id = ?', [poStatus, parsedPoId]);
      res.status(201).json({ message: 'Delivery log registered successfully and PO status updated to ' + poStatus });
    } else {
      res.status(404).json({ error: 'Purchase Order not found' });
    }
  } catch (error) {
    next(error);
  }
}
