-- ================================================================
-- Seed Data for Timi API Database
-- ================================================================
-- This file contains sample data for Users, Products, and Orders
-- Execute this script to populate your PostgreSQL database with test data
-- ================================================================

-- Clean up existing data (optional - uncomment if you want to reset)
-- TRUNCATE TABLE "user" CASCADE;
-- TRUNCATE TABLE "product" CASCADE;

-- ================================================================
-- USERS TABLE - Sample Users
-- ================================================================

INSERT INTO "user" (
    id,
    name,
    "lastName",
    role,
    status,
    phone,
    address,
    "postalCode",
    city,
    country,
    state,
    age,
    email,
    password,
    "createdAt",
    "updatedAt"
) VALUES
-- Admin User
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin',
    'system',
    'ADMIN',
    'ACTIVE',
    '1234567890',
    '123 Admin Street',
    '10001',
    'new york',
    'usa',
    'ny',
    35,
    'admin@timi.com',
    '$2b$10$rKZD8F6KqYqK9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K', -- hashed password: Admin123!
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),

-- Regular Users
(
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    'john',
    'doe',
    'USER',
    'ACTIVE',
    '5551234567',
    '456 Oak Avenue',
    '90001',
    'los angeles',
    'usa',
    'ca',
    28,
    'john.doe@example.com',
    '$2b$10$rKZD8F6KqYqK9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K', -- hashed password: User123!
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),

(
    'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
    'jane',
    'smith',
    'USER',
    'ACTIVE',
    '5559876543',
    '789 Pine Road',
    '60601',
    'chicago',
    'usa',
    'il',
    32,
    'jane.smith@example.com',
    '$2b$10$rKZD8F6KqYqK9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K', -- hashed password: User123!
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),

(
    'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
    'michael',
    'johnson',
    'USER',
    'ACTIVE',
    '5555551234',
    '321 Maple Drive',
    '33101',
    'miami',
    'usa',
    'fl',
    25,
    'michael.j@example.com',
    '$2b$10$rKZD8F6KqYqK9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K', -- hashed password: User123!
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),

(
    'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
    'sarah',
    'williams',
    'USER',
    'ACTIVE',
    '5555559876',
    '654 Elm Street',
    '98101',
    'seattle',
    'usa',
    'wa',
    29,
    'sarah.w@example.com',
    '$2b$10$rKZD8F6KqYqK9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K', -- hashed password: User123!
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),

(
    'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a16',
    'david',
    'brown',
    'USER',
    'INACTIVE',
    '5555556789',
    '987 Cedar Lane',
    '02101',
    'boston',
    'usa',
    'ma',
    40,
    'david.b@example.com',
    '$2b$10$rKZD8F6KqYqK9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K9K', -- hashed password: User123!
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- ================================================================
-- PRODUCTS TABLE - Sample Products
-- ================================================================

INSERT INTO "product" (
    id,
    title,
    price,
    description,
    slug,
    stock,
    sizes,
    gender,
    tags,
    "createdAt",
    "updatedAt"
) VALUES
-- Men's Clothing
(
    '11111111-1111-1111-1111-111111111111',
    'Classic Cotton T-Shirt',
    24.99,
    'Premium quality 100% cotton t-shirt with comfortable fit. Perfect for everyday wear.',
    'classic-cotton-tshirt',
    150,
    ARRAY['S', 'M', 'L', 'XL', 'XXL'],
    'men',
    ARRAY['casual', 'cotton', 'basic', 'comfortable'],
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),

(
    '22222222-2222-2222-2222-222222222222',
    'Slim Fit Jeans',
    79.99,
    'Modern slim fit jeans made with stretch denim for maximum comfort and style.',
    'slim-fit-jeans',
    100,
    ARRAY['28', '30', '32', '34', '36'],
    'men',
    ARRAY['denim', 'casual', 'slim-fit', 'pants'],
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),

(
    '33333333-3333-3333-3333-333333333333',
    'Formal Dress Shirt',
    49.99,
    'Elegant dress shirt perfect for office or formal occasions. Made with wrinkle-resistant fabric.',
    'formal-dress-shirt',
    80,
    ARRAY['S', 'M', 'L', 'XL'],
    'men',
    ARRAY['formal', 'office', 'shirt', 'elegant'],
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),

-- Women's Clothing
(
    '44444444-4444-4444-4444-444444444444',
    'Floral Summer Dress',
    89.99,
    'Beautiful floral print summer dress with a flowing silhouette. Perfect for warm weather.',
    'floral-summer-dress',
    120,
    ARRAY['XS', 'S', 'M', 'L', 'XL'],
    'women',
    ARRAY['dress', 'summer', 'floral', 'casual'],
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),

(
    '55555555-5555-5555-5555-555555555555',
    'High-Waisted Leggings',
    39.99,
    'Ultra-comfortable high-waisted leggings with moisture-wicking fabric. Ideal for yoga and fitness.',
    'high-waisted-leggings',
    200,
    ARRAY['XS', 'S', 'M', 'L', 'XL'],
    'women',
    ARRAY['activewear', 'fitness', 'yoga', 'comfortable'],
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),

(
    '66666666-6666-6666-6666-666666666666',
    'Silk Blouse',
    69.99,
    'Luxurious silk blouse with elegant draping. Perfect for business or evening wear.',
    'silk-blouse',
    60,
    ARRAY['XS', 'S', 'M', 'L'],
    'women',
    ARRAY['blouse', 'silk', 'elegant', 'formal'],
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),

-- Kids Clothing
(
    '77777777-7777-7777-7777-777777777777',
    'Kids Fun Graphic Tee',
    19.99,
    'Colorful graphic t-shirt for kids featuring fun cartoon characters. 100% cotton.',
    'kids-fun-graphic-tee',
    180,
    ARRAY['4', '6', '8', '10', '12'],
    'kid',
    ARRAY['kids', 'casual', 'graphic', 'cotton'],
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),

(
    '88888888-8888-8888-8888-888888888888',
    'Kids Denim Jacket',
    44.99,
    'Classic denim jacket for kids. Durable and stylish for everyday adventures.',
    'kids-denim-jacket',
    90,
    ARRAY['4', '6', '8', '10', '12'],
    'kid',
    ARRAY['kids', 'jacket', 'denim', 'casual'],
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),

-- Unisex Clothing
(
    '99999999-9999-9999-9999-999999999999',
    'Classic Hoodie',
    54.99,
    'Comfortable pullover hoodie with kangaroo pocket. Perfect for layering in cool weather.',
    'classic-hoodie',
    160,
    ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    'unisex',
    ARRAY['hoodie', 'casual', 'comfortable', 'streetwear'],
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),

(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Running Sneakers',
    99.99,
    'High-performance running sneakers with cushioned sole and breathable mesh upper.',
    'running-sneakers',
    140,
    ARRAY['6', '7', '8', '9', '10', '11', '12'],
    'unisex',
    ARRAY['shoes', 'running', 'athletic', 'sports'],
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),

(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Baseball Cap',
    24.99,
    'Adjustable baseball cap with embroidered logo. One size fits most.',
    'baseball-cap',
    250,
    ARRAY['One Size'],
    'unisex',
    ARRAY['accessories', 'hat', 'casual', 'cap'],
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),

(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Backpack - 25L',
    79.99,
    'Durable 25-liter backpack with multiple compartments and padded laptop sleeve.',
    'backpack-25l',
    110,
    ARRAY['One Size'],
    'unisex',
    ARRAY['accessories', 'backpack', 'travel', 'school'],
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================
-- Run these queries to verify the data was inserted correctly

-- Count users by role
-- SELECT role, COUNT(*) as count FROM "user" GROUP BY role;

-- Count users by status
-- SELECT status, COUNT(*) as count FROM "user" GROUP BY status;

-- Count products by gender
-- SELECT gender, COUNT(*) as count FROM "product" GROUP BY gender;

-- View all products with their prices
-- SELECT title, price, stock, gender FROM "product" ORDER BY price DESC;

-- View all active users
-- SELECT name, "lastName", email, city, state FROM "user" WHERE status = 'ACTIVE';

-- ================================================================
-- NOTES
-- ================================================================
-- 1. All passwords in this seed file are hashed versions of "User123!" or "Admin123!"
--    You'll need to update these with actual bcrypt hashes for your environment
-- 2. Orders are stored in DynamoDB, not PostgreSQL, so they're not included here
-- 3. UUIDs are pre-generated for consistency and easier testing
-- 4. All timestamps use CURRENT_TIMESTAMP for automatic date/time insertion
-- 5. User emails are unique - running this script twice will cause conflicts
-- 6. Product slugs are unique - ensure they don't conflict with existing data
-- ================================================================
