-- Seed Script for Paper Plane
-- Database: vendor_po_management

USE `vendor_po_management`;

-- Clear existing data
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `po_deliveries`;
TRUNCATE TABLE `deliveries`;
TRUNCATE TABLE `po_payments`;
TRUNCATE TABLE `payments`;
TRUNCATE TABLE `purchase_orders`;
TRUNCATE TABLE `vendors`;
TRUNCATE TABLE `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Insert Administrator user (password is 'PaperPlane@2026' hashed with bcrypt, no plain text stored)
INSERT INTO `users` (`name`, `username`, `email`, `password`, `password_hash`, `role`, `reset_token`, `reset_token_expiry`) VALUES
('Administrator', 'admin', 'edharanagasaimanohar@gmail.com', NULL, '$2b$10$U6YIeXXNIZw5mtjAoxP8J.9TFAC/yGG7w1Eat677VdBTj/cPhLdgO', 'admin', NULL, NULL);

-- 2. Insert standard suppliers requested
INSERT INTO `vendors` (`name`, `category`, `payment_terms`, `contact_person`, `email`, `phone`, `address`, `status`, `active`) VALUES
('BoxCraft Supplies', 'Packaging & Boxes', 'Net 30', 'Sarah Jenkins', 'contact@boxcraft.com', '+1-555-0192', '102 Industrial Way, Suite B, Seattle, WA', 'Active', 1),
('Ribbon World', 'Ribbons & Tags', 'Net 15', 'David Cho', 'sales@ribbonworld.com', '+1-555-0143', '45 Grace St, San Francisco, CA', 'Active', 1),
('PrintPerfect', 'Custom Printing', 'Due on Receipt', 'Michael O\'Brien', 'orders@printperfect.com', '+44-20-7946-0192', 'Unit 12, Parkside Industrial Estate, London', 'Active', 1),
('Wrap & Flair', 'Wrapping Paper', 'Net 45', 'Elena Rostova', 'elena@wrapflair.com', '+1-555-0177', '789 Craft Ave, Portland, OR', 'Active', 1),
('Filler House', 'Protective Fillers', 'Net 30', 'Robert Peterson', 'rob@fillerhouse.com', '+1-555-0182', '24 High Shine Road, Austin, TX', 'Active', 1),
('Deco Mart', 'Corporate Decorations', 'Net 30', 'Linda Zhang', 'linda@decomart.com', '+1-555-0155', '56 Decorative Blvd, Los Angeles, CA', 'Inactive', 0);

-- 3. Insert Purchase Orders
INSERT INTO `purchase_orders` (`id`, `po_number`, `vendor_id`, `po_date`, `expected_delivery_date`, `status`, `total_amount`, `advance_payment`, `final_payment`, `notes`, `items`, `material_name`, `quantity`, `unit`, `unit_price`) VALUES
(1, 'PP-PO-2026-0001', 1, '2026-05-10', '2026-05-18', 'Delivered', 1200.00, 400.00, 800.00, 'Custom kraft paper boxes for personalized wine gift packages.', '[{"name":"Custom Kraft Boxes (Wine)","qty":600,"price":1.50},{"name":"Cardboard Dividers","qty":600,"price":0.50}]', 'Custom Kraft Boxes', 600, 'pcs', 1.50),
(2, 'PP-PO-2026-0002', 2, '2026-05-15', '2026-05-25', 'Delivered', 450.00, 150.00, 300.00, 'Assorted satin ribbons (red, gold, forest green).', '[{"name":"Gold Satin Ribbon Spools","qty":100,"price":2.50},{"name":"Red Satin Ribbon Spools","qty":80,"price":2.50}]', 'Gold Satin Ribbon Spools', 100, 'spools', 2.50),
(3, 'PP-PO-2026-0003', 1, '2026-06-01', '2026-06-12', 'Partially Delivered', 2500.00, 1000.00, 0.00, 'Mailing tubes and tissue wrapping sheets.', '[{"name":"Eco Kraft Mailing Tubes","qty":1000,"price":2.00},{"name":"Recycled Wrapping tissue packs","qty":100,"price":5.00}]', 'Eco Kraft Mailing Tubes', 1000, 'pcs', 2.00),
(4, 'PP-PO-2026-0004', 3, '2026-06-03', '2026-06-16', 'Pending', 4000.00, 1200.00, 0.00, 'Heavy corrugated shipping containers for bulk packing.', '[{"name":"Premium Corrugated Boxes 12x12x12","qty":1000,"price":3.00},{"name":"Premium Corrugated Boxes 18x18x18","qty":500,"price":2.00}]', 'Premium Corrugated Boxes', 1000, 'pcs', 3.00),
(5, 'PP-PO-2026-0005', 4, '2026-06-05', '2026-06-20', 'Draft', 850.00, 0.00, 0.00, 'Textured cover stocks for gift tags and thank you notes.', '[{"name":"Textured Gift Card Cover Stock","qty":500,"price":1.70}]', 'Textured Gift Card Cover Stock', 500, 'pcs', 1.70);

-- 4. Insert Payments (Dual table inserts)
INSERT INTO `payments` (`po_id`, `vendor_id`, `payment_date`, `amount`, `payment_type`, `payment_method`, `reference_number`, `reference_no`, `notes`) VALUES
(1, 1, '2026-05-11', 400.00, 'Advance', 'Bank Transfer', 'TXN-9821-BCDF', 'TXN-9821-BCDF', '40% advance payment.'),
(1, 1, '2026-05-20', 800.00, 'Final', 'Bank Transfer', 'TXN-9856-BC90', 'TXN-9856-BC90', 'Final payment upon receipt of satisfactory materials.'),
(2, 2, '2026-05-16', 150.00, 'Advance', 'UPI', 'UPI-GOLD-4451', 'UPI-GOLD-4451', 'Standard advance amount for ribbons startup.'),
(2, 2, '2026-05-26', 300.00, 'Final', 'Card', 'CRD-CHASE-0941', 'CRD-CHASE-0941', 'Completed settlement of PO-0002.'),
(3, 1, '2026-06-02', 1000.00, 'Advance', 'Bank Transfer', 'TXN-0103-WETR', 'TXN-0103-WETR', '40% advance paid for mailing tubes batch.'),
(4, 3, '2026-06-04', 1200.00, 'Advance', 'Bank Transfer', 'TXN-0111-PLMK', 'TXN-0111-PLMK', '30% advance on corrugated paper board containers.');

INSERT INTO `po_payments` (`po_id`, `payment_type`, `amount`, `payment_date`, `reference_no`, `notes`) VALUES
(1, 'Advance', 400.00, '2026-05-11', 'TXN-9821-BCDF', '40% advance payment.'),
(1, 'Final', 800.00, '2026-05-20', 'TXN-9856-BC90', 'Final payment upon receipt of satisfactory materials.'),
(2, 'Advance', 150.00, '2026-05-16', 'UPI-GOLD-4451', 'Standard advance amount for ribbons startup.'),
(2, 'Final', 300.00, '2026-05-26', 'CRD-CHASE-0941', 'Completed settlement of PO-0002.'),
(3, 'Advance', 1000.00, '2026-06-02', 'TXN-0103-WETR', '40% advance paid for mailing tubes batch.'),
(4, 'Advance', 1200.00, '2026-06-04', 'TXN-0111-PLMK', '30% advance on corrugated paper board containers.');

-- 5. Insert Deliveries (Dual table inserts)
INSERT INTO `deliveries` (`po_id`, `delivery_date`, `received_by`, `delivery_status`, `delivery_notes`) VALUES
(1, '2026-05-18', 'John Doe', 'Fully Delivered', 'All 600 box units and dividers verified. Quality pristine.'),
(2, '2026-05-25', 'John Doe', 'Fully Delivered', 'Ribbon spools delivered in perfect order.'),
(3, '2026-06-08', 'Sarah Jenkins', 'Partially Delivered', 'Received 500 out of 1000 Eco Kraft Mailing Tubes. Wrapping tissue packs fully delivered. Remaining 500 mailing tubes scheduled for next week.');

INSERT INTO `po_deliveries` (`po_id`, `delivered_qty`, `delivery_date`, `delivery_notes`) VALUES
(1, 600, '2026-05-18', 'All 600 box units and dividers verified. Quality pristine.'),
(2, 100, '2026-05-25', 'Ribbon spools delivered in perfect order.'),
(3, 500, '2026-06-08', 'Received 500 out of 1000 Eco Kraft Mailing Tubes.');
