# API Endpoints Documentation

This document provides a complete list of all available API endpoints with usage examples.

## Base URL
```
http://localhost:3000
```

---

## 📊 Health & Status

### Root Endpoint
Check if the API is running.

**Endpoint:** `GET /`

**Response:**
```json
{
  "message": "Timi API is running!",
  "hint": "Visit /api/v1 for the REST API.",
  "status": "ok",
  "timestamp": "2026-01-22T16:30:00.000Z"
}
```

**Example:**
```bash
curl http://localhost:3000/
```

---

### Health Check
Get detailed health information about the API, databases, and system resources.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "app": {
    "ok": true,
    "name": "Timi API",
    "version": "1.0.0",
    "env": "development",
    "status": "healthy",
    "startTime": "2026-01-22T16:00:00.000Z",
    "uptimeMs": 1800000,
    "node": "v20.0.0"
  },
  "resources": {
    "memory": {
      "rss": 52428800,
      "heapUsed": 31457280,
      "heapTotal": 41943040
    },
    "cpu": {
      "cpuCount": 8,
      "loadAvg": [1.5, 1.2, 1.0],
      "usageMicros": { "user": 500000, "system": 200000 },
      "eventLoopDelayMs": 0.5
    }
  },
  "dynamodb": {
    "ddbHealth": {
      "ok": true,
      "message": "DynamoDB connection OK",
      "status": "healthy"
    },
    "latencyMs": 45
  },
  "postgres": {
    "pgHealth": {
      "ok": true,
      "message": "Postgres connection OK",
      "status": "healthy"
    },
    "latencyMs": 12,
    "stats": {
      "ok": true,
      "activeConnections": 5
    }
  }
}
```

**Example:**
```bash
curl http://localhost:3000/health
```

---

## 🔐 Authentication

### Sign Up
Register a new user account.

**Endpoint:** `POST /auth/sign-up`

**Request Body:**
```json
{
  "name": "john",
  "lastName": "doe",
  "phone": "1234567890",
  "email": "john.doe@example.com",
  "password": "SecurePass123",
  "address": "123 main st",
  "city": "new york",
  "state": "ny",
  "country": "usa",
  "postalCode": "10001",
  "age": 30
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "john",
  "lastName": "doe",
  "email": "john.doe@example.com",
  "phone": "1234567890",
  "createdAt": "2026-01-22T16:30:00.000Z"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "name": "john",
    "lastName": "doe",
    "phone": "1234567890",
    "email": "john.doe@example.com",
    "password": "SecurePass123",
    "city": "new york",
    "state": "ny",
    "country": "usa"
  }'
```

---

### Sign In
Authenticate and receive a JWT token.

**Endpoint:** `POST /auth/sign-in`

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "name": "john",
    "lastName": "doe"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePass123"
  }'
```

---

### Get Profile
Get the authenticated user's profile information.

**Endpoint:** `GET /auth/me`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "john",
  "lastName": "doe",
  "email": "john.doe@example.com",
  "phone": "1234567890",
  "address": "123 main st",
  "city": "new york",
  "state": "ny",
  "country": "usa",
  "age": 30
}
```

**Example:**
```bash
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 👥 Users

### Create User
Create a new user.

**Endpoint:** `POST /users`

**Request Body:**
```json
{
  "name": "jane",
  "lastName": "smith",
  "phone": "9876543210",
  "email": "jane.smith@example.com",
  "password": "SecurePass456",
  "city": "los angeles",
  "state": "ca",
  "country": "usa",
  "age": 28
}
```

**Response:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "name": "jane",
  "lastName": "smith",
  "email": "jane.smith@example.com",
  "phone": "9876543210",
  "createdAt": "2026-01-22T16:35:00.000Z"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "jane",
    "lastName": "smith",
    "phone": "9876543210",
    "email": "jane.smith@example.com",
    "password": "SecurePass456",
    "city": "los angeles",
    "state": "ca",
    "country": "usa",
    "age": 28
  }'
```

---

### Get All Users
Retrieve all users with pagination and filters.

**Endpoint:** `GET /users`

**Query Parameters:**
- `limit` (optional): Number of results per page (default: 10)
- `offset` (optional): Number of results to skip (default: 0)
- `role` (optional): Filter by user role
- `status` (optional): Filter by user status
- `phone` (optional): Filter by phone number
- `name` (optional): Filter by first name
- `lastName` (optional): Filter by last name
- `orderBy` (optional): Field to order by
- `orderDir` (optional): Order direction (ASC or DESC)

**Response:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "john",
      "lastName": "doe",
      "email": "john.doe@example.com",
      "phone": "1234567890"
    }
  ],
  "meta": {
    "total": 50,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

**Examples:**
```bash
# Get first 10 users
curl http://localhost:3000/users

# Get users with pagination
curl "http://localhost:3000/users?limit=20&offset=10"

# Filter by name
curl "http://localhost:3000/users?name=john"

# Order by creation date
curl "http://localhost:3000/users?orderBy=createdAt&orderDir=DESC"
```

---

### Get User by ID
Retrieve a specific user by their ID.

**Endpoint:** `GET /users/:id`

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "john",
  "lastName": "doe",
  "email": "john.doe@example.com",
  "phone": "1234567890",
  "address": "123 main st",
  "city": "new york",
  "state": "ny",
  "country": "usa",
  "age": 30
}
```

**Example:**
```bash
curl http://localhost:3000/users/550e8400-e29b-41d4-a716-446655440000
```

---

### Update User
Update an existing user's information.

**Endpoint:** `PATCH /users/:id`

**Request Body:**
```json
{
  "name": "john updated",
  "age": 31
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "john updated",
  "lastName": "doe",
  "email": "john.doe@example.com",
  "age": 31,
  "updatedAt": "2026-01-22T16:40:00.000Z"
}
```

**Example:**
```bash
curl -X PATCH http://localhost:3000/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "john updated",
    "age": 31
  }'
```

---

### Delete User
Delete a user by ID.

**Endpoint:** `DELETE /users/:id`

**Response:**
```json
{
  "message": "User deleted successfully",
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Example:**
```bash
curl -X DELETE http://localhost:3000/users/550e8400-e29b-41d4-a716-446655440000
```

---

## 📦 Products

### Create Product
Create a new product.

**Endpoint:** `POST /products`

**Request Body:**
```json
{
  "title": "Premium T-Shirt",
  "price": 29.99,
  "description": "High quality cotton t-shirt",
  "slug": "premium-t-shirt",
  "stock": 100,
  "sizes": ["S", "M", "L", "XL"],
  "gender": "unisex",
  "tags": ["casual", "cotton", "comfortable"]
}
```

**Response:**
```json
{
  "id": 1,
  "title": "Premium T-Shirt",
  "price": 29.99,
  "description": "High quality cotton t-shirt",
  "slug": "premium-t-shirt",
  "stock": 100,
  "sizes": ["S", "M", "L", "XL"],
  "gender": "unisex",
  "tags": ["casual", "cotton", "comfortable"],
  "createdAt": "2026-01-22T16:45:00.000Z"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Premium T-Shirt",
    "price": 29.99,
    "description": "High quality cotton t-shirt",
    "stock": 100,
    "sizes": ["S", "M", "L", "XL"],
    "gender": "unisex",
    "tags": ["casual", "cotton"]
  }'
```

---

### Get All Products
Retrieve all products with pagination.

**Endpoint:** `GET /products`

**Query Parameters:**
- `limit` (optional): Number of results per page (default: 10)
- `offset` (optional): Number of results to skip (default: 0)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "title": "Premium T-Shirt",
      "price": 29.99,
      "slug": "premium-t-shirt",
      "stock": 100,
      "gender": "unisex"
    }
  ],
  "meta": {
    "total": 25,
    "limit": 10,
    "offset": 0
  }
}
```

**Examples:**
```bash
# Get all products
curl http://localhost:3000/products

# With pagination
curl "http://localhost:3000/products?limit=20&offset=10"
```

---

### Get Product by ID or Slug
Retrieve a specific product by ID or slug.

**Endpoint:** `GET /products/:term`

**Response:**
```json
{
  "id": 1,
  "title": "Premium T-Shirt",
  "price": 29.99,
  "description": "High quality cotton t-shirt",
  "slug": "premium-t-shirt",
  "stock": 100,
  "sizes": ["S", "M", "L", "XL"],
  "gender": "unisex",
  "tags": ["casual", "cotton", "comfortable"]
}
```

**Examples:**
```bash
# Get by ID
curl http://localhost:3000/products/1

# Get by slug
curl http://localhost:3000/products/premium-t-shirt
```

---

### Update Product
Update an existing product.

**Endpoint:** `PATCH /products/:id`

**Request Body:**
```json
{
  "price": 24.99,
  "stock": 150
}
```

**Response:**
```json
{
  "id": 1,
  "title": "Premium T-Shirt",
  "price": 24.99,
  "stock": 150,
  "updatedAt": "2026-01-22T16:50:00.000Z"
}
```

**Example:**
```bash
curl -X PATCH http://localhost:3000/products/1 \
  -H "Content-Type: application/json" \
  -d '{
    "price": 24.99,
    "stock": 150
  }'
```

---

### Delete Product
Delete a product by ID.

**Endpoint:** `DELETE /products/:id`

**Response:**
```json
{
  "message": "Product deleted successfully",
  "id": 1
}
```

**Example:**
```bash
curl -X DELETE http://localhost:3000/products/1
```

---

## 🛒 Orders

### Create Order
Create a new order (stored in DynamoDB).

**Endpoint:** `POST /orders`

**Request Body:**
```json
{
  "orderId": "770e8400-e29b-41d4-a716-446655440002",
  "customerId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "items": [
    {
      "productId": "880e8400-e29b-41d4-a716-446655440003",
      "quantity": 2,
      "unitPrice": 29.99,
      "title": "Premium T-Shirt"
    }
  ],
  "total": 59.98,
  "currency": "USD",
  "notes": "Please deliver before 5 PM",
  "createdAt": "2026-01-22T16:55:00.000Z",
  "updatedAt": "2026-01-22T16:55:00.000Z"
}
```

**Response:**
```json
{
  "orderId": "770e8400-e29b-41d4-a716-446655440002",
  "customerId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "items": [
    {
      "productId": "880e8400-e29b-41d4-a716-446655440003",
      "quantity": 2,
      "unitPrice": 29.99,
      "title": "Premium T-Shirt"
    }
  ],
  "total": 59.98,
  "currency": "USD",
  "notes": "Please deliver before 5 PM",
  "createdAt": "2026-01-22T16:55:00.000Z",
  "updatedAt": "2026-01-22T16:55:00.000Z"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "770e8400-e29b-41d4-a716-446655440002",
    "customerId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "pending",
    "items": [
      {
        "productId": "880e8400-e29b-41d4-a716-446655440003",
        "quantity": 2,
        "unitPrice": 29.99,
        "title": "Premium T-Shirt"
      }
    ],
    "total": 59.98,
    "currency": "USD",
    "createdAt": "2026-01-22T16:55:00.000Z",
    "updatedAt": "2026-01-22T16:55:00.000Z"
  }'
```

---

### Get All Orders
Retrieve all orders.

**Endpoint:** `GET /orders`

**Response:**
```json
[
  {
    "orderId": "770e8400-e29b-41d4-a716-446655440002",
    "customerId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "pending",
    "total": 59.98,
    "currency": "USD",
    "createdAt": "2026-01-22T16:55:00.000Z"
  }
]
```

**Example:**
```bash
curl http://localhost:3000/orders
```

---

### Get Order by ID
Retrieve a specific order by its ID.

**Endpoint:** `GET /orders/:id`

**Response:**
```json
{
  "orderId": "770e8400-e29b-41d4-a716-446655440002",
  "customerId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "items": [
    {
      "productId": "880e8400-e29b-41d4-a716-446655440003",
      "quantity": 2,
      "unitPrice": 29.99,
      "title": "Premium T-Shirt"
    }
  ],
  "total": 59.98,
  "currency": "USD",
  "notes": "Please deliver before 5 PM",
  "createdAt": "2026-01-22T16:55:00.000Z",
  "updatedAt": "2026-01-22T16:55:00.000Z"
}
```

**Example:**
```bash
curl http://localhost:3000/orders/770e8400-e29b-41d4-a716-446655440002
```

---

### Update Order
Update an existing order.

**Endpoint:** `PATCH /orders/:id`

**Request Body:**
```json
{
  "status": "confirmed",
  "notes": "Updated delivery instructions"
}
```

**Response:**
```json
{
  "orderId": "770e8400-e29b-41d4-a716-446655440002",
  "status": "confirmed",
  "notes": "Updated delivery instructions",
  "updatedAt": "2026-01-22T17:00:00.000Z"
}
```

**Example:**
```bash
curl -X PATCH http://localhost:3000/orders/770e8400-e29b-41d4-a716-446655440002 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "confirmed",
    "notes": "Updated delivery instructions"
  }'
```

---

### Delete Order
Delete an order by ID.

**Endpoint:** `DELETE /orders/:id`

**Response:**
```json
{
  "deleted": true
}
```

**Example:**
```bash
curl -X DELETE http://localhost:3000/orders/770e8400-e29b-41d4-a716-446655440002
```

---

## 🌱 Seed

### Run Database Seed
Populate the database with initial data.

**Endpoint:** `GET /seed`

**Response:**
```json
{
  "message": "Seed executed"
}
```

**Example:**
```bash
curl http://localhost:3000/seed
```

---

## 📝 Notes

### Status Codes
- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

### Order Statuses
Available order statuses:
- `pending`: Order placed but not confirmed
- `confirmed`: Order confirmed and being processed
- `shipped`: Order has been shipped
- `delivered`: Order delivered to customer
- `cancelled`: Order cancelled

### Product Genders
Available product genders:
- `men`
- `women`
- `kid`
- `unisex`

### Authentication
Most endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

Get your token by calling the `/auth/sign-in` endpoint.
