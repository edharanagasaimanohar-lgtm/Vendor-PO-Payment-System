-- Paper Plane Vendor & Procurement Management System
-- MySQL Relational Database Schema Creation Script
-- Default Database: vendor_po_management

CREATE DATABASE IF NOT EXISTS `vendor_po_management`;
USE `vendor_po_management`;

-- 1. Users Table (Core Auth & Session Management)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NULL,
  `username` VARCHAR(255) UNIQUE NOT NULL,
  `email` VARCHAR(255) UNIQUE NOT NULL,
  `password` VARCHAR(255) NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) DEFAULT 'admin',
  `reset_token` VARCHAR(255) NULL,
  `reset_token_expiry` DATETIME NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Vendors Table (Active Directory and Contact Handshakes)
CREATE TABLE IF NOT EXISTS `vendors` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) DEFAULT 'General',
  `contact_person` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `payment_terms` VARCHAR(50) DEFAULT 'Net 30',
  `active` TINYINT DEFAULT 1,
  `status` VARCHAR(50) DEFAULT 'Active',
  `is_deleted` INT DEFAULT 0,
  `address` VARCHAR(500) DEFAULT '',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Purchase Orders Table (Procurement Pipelines and Item Manifests)
CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `po_number` VARCHAR(100) UNIQUE NOT NULL,
  `vendor_id` INT NOT NULL,
  `po_date` VARCHAR(50) NOT NULL,
  `expected_delivery_date` VARCHAR(50) NOT NULL,
  `actual_delivery_date` VARCHAR(50) NULL,
  `status` VARCHAR(50) NOT NULL, -- 'Draft', 'Pending', 'Partially Delivered', 'Delivered', 'Cancelled'
  `total_amount` DOUBLE NOT NULL DEFAULT 0.0,
  `advance_payment` DOUBLE NOT NULL DEFAULT 0.0,
  `final_payment` DOUBLE NOT NULL DEFAULT 0.0,
  `notes` TEXT NULL,
  `items` TEXT NULL, -- JSON formatted array
  `material_name` VARCHAR(255) NULL,
  `quantity` INT NULL,
  `unit` VARCHAR(50) NULL,
  `unit_price` DOUBLE NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Payments Table (Financial ledger - core runtime support)
CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `po_id` INT NOT NULL,
  `vendor_id` INT NOT NULL,
  `payment_date` VARCHAR(50) NOT NULL,
  `amount` DOUBLE NOT NULL,
  `payment_type` VARCHAR(50) NOT NULL, -- 'Advance' or 'Final'
  `payment_method` VARCHAR(50) NOT NULL,
  `reference_number` VARCHAR(100) NOT NULL,
  `reference_no` VARCHAR(100) NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. po_payments Table (Internship spec representation)
CREATE TABLE IF NOT EXISTS `po_payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `po_id` INT NOT NULL,
  `payment_type` VARCHAR(50) NOT NULL,
  `amount` DOUBLE NOT NULL,
  `payment_date` VARCHAR(50) NOT NULL,
  `reference_no` VARCHAR(100) NOT NULL,
  `notes` TEXT NULL,
  FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Deliveries Table (Logistic handshakes - core runtime support)
CREATE TABLE IF NOT EXISTS `deliveries` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `po_id` INT NOT NULL,
  `delivery_date` VARCHAR(50) NOT NULL,
  `received_by` VARCHAR(255) NOT NULL,
  `delivery_status` VARCHAR(50) NOT NULL, -- 'Partially Delivered', 'Fully Delivered'
  `delivery_notes` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. po_deliveries Table (Internship spec representation)
CREATE TABLE IF NOT EXISTS `po_deliveries` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `po_id` INT NOT NULL,
  `delivered_qty` INT NOT NULL,
  `delivery_date` VARCHAR(50) NOT NULL,
  `delivery_notes` TEXT NULL,
  FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
