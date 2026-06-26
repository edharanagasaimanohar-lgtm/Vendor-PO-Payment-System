# Delivery Confirmation & Vendor Statement Tests

## Test 1: Fully Paid PO Confirm Delivery
- **Action:** Open a Fully Paid PO lacking delivery on the Deliveries dashboard. Click "Confirm Delivery", fill out the modal, and submit.
- **Expected:** Status automatically updates to `Settled` since balance is zero.
- **Status:** PASS

## Test 2: Partially Paid PO Confirm Delivery
- **Action:** Open a Partially Paid PO lacking delivery on the Deliveries dashboard. Click "Confirm Delivery", fill out the modal, and submit.
- **Expected:** Status automatically updates to `Delivered` since there remains an outstanding balance.
- **Status:** PASS

## Test 3: No Payment Made Confirm Delivery
- **Action:** Open an Open PO (No Payments Made). Click "Confirm Delivery".
- **Expected:** Status automatically updates to `Delivered` since there remains an outstanding balance equal to the full total.
- **Status:** PASS

## Test 4: Vendor Statement View
- **Action:** Load the Vendor Statement Module from the sidebar and select a Vendor.
- **Expected:** All Purchase Orders accurately populate the "ALL PURCHASE ORDERS" table. The "PAYMENT HISTORY" accurately correlates to all payments made over the duration of the account.
- **Status:** PASS

## Test 5: Vendor Total Outstanding
- **Action:** Read the top cards of a Vendor Statement.
- **Expected:** The "Total Purchase Value", "Total Paid", and "Total Outstanding" balances reflect the absolute double-entry sum over all loaded POs.
- **Status:** PASS

## Test 6: Payment History UI
- **Action:** Assess the table records in the "Payment History" section arrays.
- **Expected:** The history correctly outputs Payment Date, Reference Number, Payment Type, and formatting Amount values.
- **Status:** PASS
