import { query, queryOne, run } from '../config/db.js';

export async function getPayments(req, res, next) {
  try {
    const payments = await query(`
      SELECT p.*, po.po_number, v.name as vendor_name
      FROM payments p
      JOIN purchase_orders po ON p.po_id = po.id
      JOIN vendors v ON p.vendor_id = v.id
      ORDER BY p.payment_date DESC, p.id DESC
    `);
    res.json(payments);
  } catch (error) {
    next(error);
  }
}

export async function createPayment(req, res, next) {
  const { po_id, payment_date, amount, payment_type, payment_method, reference_number, notes } = req.body;

  if (!po_id || !payment_date || !amount || !payment_type || !payment_method || !reference_number) {
    return res.status(400).json({ error: 'Required payment fields are missing.' });
  }

  const paymentAmount = Number(amount);
  if (isNaN(paymentAmount) || paymentAmount <= 0) {
    return res.status(400).json({ error: 'Payment amount must be greater than zero.' });
  }

  try {
    const parsedPoId = parseInt(po_id, 10);

    // Check PO existence
    const po = await queryOne('SELECT * FROM purchase_orders WHERE id = ?', [parsedPoId]);
    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found.' });
    }

    const payments = await query('SELECT * FROM po_payments WHERE po_id = ?', [parsedPoId]);
    const currentPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    // Overpayment check
    if (currentPaid + paymentAmount > po.total_amount) {
      return res.status(400).json({ message: 'Overpayment detected' });
    }

    // Insert the payment into payments
    const pResult = await run(
      `INSERT INTO payments (po_id, vendor_id, payment_date, amount, payment_type, payment_method, reference_number, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [parsedPoId, po.vendor_id, payment_date, paymentAmount, payment_type, payment_method, reference_number, notes || '']
    );

    // Also insert into po_payments table for internship compliance
    await run(
      `INSERT INTO po_payments (po_id, payment_type, amount, payment_date, reference_no, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [parsedPoId, payment_type, paymentAmount, payment_date, reference_number, notes || '']
    );

    // Recalculate everything
    const updatedPayments = await query('SELECT * FROM po_payments WHERE po_id = ?', [parsedPoId]);
    const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = po.total_amount - totalPaid;

    const dCheck = await queryOne(
      `SELECT count(*) as cnt FROM deliveries WHERE po_id = ? AND (delivery_status = 'Fully Delivered' OR delivery_status = 'Delivered')`,
      [parsedPoId]
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
      [parsedPoId]
    );
    const finalSumObj = await queryOne(
      `SELECT SUM(amount) as s FROM po_payments WHERE po_id = ? AND payment_type != 'Advance'`,
      [parsedPoId]
    );
    const advance_payment = Number(advanceSumObj?.s || 0);
    const final_payment = Number(finalSumObj?.s || 0);

    await run(
      'UPDATE purchase_orders SET status = ?, advance_payment = ?, final_payment = ? WHERE id = ?',
      [newStatus, advance_payment, final_payment, parsedPoId]
    );

    const createdPayment = await queryOne('SELECT * FROM payments WHERE id = ?', [pResult.id]);
    res.status(201).json(createdPayment);
  } catch (error) {
    next(error);
  }
}
