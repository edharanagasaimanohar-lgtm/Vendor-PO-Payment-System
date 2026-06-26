# Purchase Order & Payment Recording Tests

## Test 1: Partial Payment
- **Action:** Pay ₹2000 for a ₹5000 PO.
- **Expected:** Balance becomes ₹3000, Status becomes `Partially Paid`.
- **Status:** PASS

## Test 2: Pay Remaining
- **Action:** Pay remaining ₹3000 for the same PO.
- **Expected:** Balance becomes ₹0. Status updates to `Awaiting Delivery` if not yet delivered.
- **Status:** PASS

## Test 3: Overpayment
- **Action:** Pay ₹6000 for a ₹5000 PO.
- **Expected:** 400 Bad Request error returned with `{"message": "Overpayment detected"}`.
- **Status:** PASS

## Test 4: Multiple Split Payments
- **Action:** 3 payments: ₹1000 + ₹2000 + ₹2000 on a ₹5000 PO.
- **Expected:** Final Balance becomes ₹0. 
- **Status:** PASS

## Test 5: First Payment Changes Status
- **Action:** Send the first advance payment.
- **Expected:** PO status shifts from `Open` to `Partially Paid`.
- **Status:** PASS

## Test 6: Invalid Payment Amount (Negative or Zero)
- **Action:** Pay ₹0 or negative amount.
- **Expected:** 400 Bad Request error with `{"message": "Payment amount must be greater than zero"}`.
- **Status:** PASS

## Test 7: Overdue Badge
- **Action:** A PO whose expected delivery was yesterday.
- **Expected:** The "Overdue" badge is visible on the Purchase Order Dashboard.
- **Status:** PASS

## Test 8: No Payments Made
- **Action:** View a newly generated PO.
- **Expected:** Total Paid is ₹0, Balance Due = Total Amount.
- **Status:** PASS

## Test 9: Full Payment + Delivered
- **Action:** PO has 0 balance and delivery is confirmed.
- **Expected:** Status automatically updates to `Settled`.
- **Status:** PASS

## Test 10: GET Purchase Order Details
- **Action:** Request `GET /api/purchase-orders/:id`.
- **Expected:** JSON payload containing `purchase_order`, `vendor`, `total_paid`, `balance_due`, `status`, and the full `payments` history.
- **Status:** PASS
