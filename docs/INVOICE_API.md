# Invoice Workflow API Documentation

## Overview
This document provides example payloads and usage instructions for the invoice workflow system.

---

## 🎯 Workflow Summary

1. **Admin creates/edits shipment** with optional `invoiceAmount`
2. **Backend automatically generates invoice** (if amount provided)
3. **Invoice is linked to shipment** (one-to-one relationship)
4. **Admin can view invoices** in Payments & Billing page
5. **Admin can mark invoice as PAID** when payment is received

---

## 📋 API Endpoints

### 1. Create Shipment with Invoice

**Endpoint:** `POST /api/shipments`

**Request Body:**
```json
{
  "customerName": "Acme Corporation",
  "customerId": "507f1f77bcf86cd799439011",
  "source": "Mumbai",
  "destination": "Delhi",
  "pickupDate": "2026-01-15T10:00:00Z",
  "eta": "2026-01-17T18:00:00Z",
  "priority": "HIGH",
  "assignedVehicleNumber": "MH12AB1234",
  "assignedDriverName": "Rajesh Kumar",
  "invoiceAmount": 15000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Shipment created successfully",
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "referenceId": "SHP001",
    "customerName": "Acme Corporation",
    "source": "Mumbai",
    "destination": "Delhi",
    "status": "PENDING",
    "invoice": "65a1b2c3d4e5f6g7h8i9j0k2",
    "createdAt": "2026-01-10T14:30:00Z"
  }
}
```

**Console Log:**
```
✅ Created new invoice INV-1001 for shipment 65a1b2c3d4e5f6g7h8i9j0k1
💰 Invoice INV-1001 created for shipment SHP001
```

---

### 2. Update Shipment with Invoice

**Endpoint:** `PUT /api/shipments/:id`

**Request Body:**
```json
{
  "invoiceAmount": 18000
}
```

**Behavior:**
- If invoice exists → **Updates amount** (does NOT create new invoice)
- If invoice doesn't exist → **Creates new invoice**

**Response:**
```json
{
  "success": true,
  "message": "Shipment updated successfully",
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "referenceId": "SHP001",
    "invoice": "65a1b2c3d4e5f6g7h8i9j0k2"
  }
}
```

**Console Log:**
```
📝 Updated invoice INV-1001 with new amount: ₹18000
```

---

### 3. Get All Invoices

**Endpoint:** `GET /api/invoices`

**Query Parameters:**
- `status` (optional): `PENDING` or `PAID`
- `search` (optional): Search by invoice ID or customer name

**Example:**
```
GET /api/invoices?status=PENDING
GET /api/invoices?search=Acme
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "invoiceId": "INV-1001",
      "shipmentId": "SHP001",
      "shipmentObjectId": "65a1b2c3d4e5f6g7h8i9j0k1",
      "customerName": "Acme Corporation",
      "amount": 18000,
      "status": "PENDING",
      "paymentDate": null,
      "createdAt": "2026-01-10T14:30:00Z",
      "shipmentDetails": {
        "source": "Mumbai",
        "destination": "Delhi",
        "status": "IN_TRANSIT"
      }
    },
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k3",
      "invoiceId": "INV-1002",
      "shipmentId": "SHP002",
      "shipmentObjectId": "65a1b2c3d4e5f6g7h8i9j0k4",
      "customerName": "Tech Solutions Ltd",
      "amount": 25000,
      "status": "PAID",
      "paymentDate": "2026-01-12T10:00:00Z",
      "createdAt": "2026-01-11T09:00:00Z",
      "shipmentDetails": {
        "source": "Bangalore",
        "destination": "Hyderabad",
        "status": "DELIVERED"
      }
    }
  ]
}
```

---

### 4. Get Invoice Details

**Endpoint:** `GET /api/invoices/:invoiceId`

**Example:**
```
GET /api/invoices/INV-1001
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
    "invoiceId": "INV-1001",
    "customerName": "Acme Corporation",
    "amount": 18000,
    "status": "PENDING",
    "paymentDate": null,
    "createdAt": "2026-01-10T14:30:00Z",
    "shipment": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "referenceId": "SHP001",
      "source": "Mumbai",
      "destination": "Delhi",
      "status": "IN_TRANSIT",
      "pickupDate": "2026-01-15T10:00:00Z",
      "eta": "2026-01-17T18:00:00Z",
      "assignedVehicleNumber": "MH12AB1234",
      "assignedDriverName": "Rajesh Kumar"
    }
  }
}
```

---

### 5. Update Invoice Status (Mark as PAID)

**Endpoint:** `PUT /api/invoices/:invoiceId`

**Request Body:**
```json
{
  "status": "PAID"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Invoice marked as paid successfully",
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
    "invoiceId": "INV-1001",
    "status": "PAID",
    "paymentDate": "2026-01-13T15:45:00Z"
  }
}
```

**Behavior:**
- When status changes to `PAID` → `paymentDate` is automatically set to current date
- When status changes to `PENDING` → `paymentDate` is cleared (set to null)

---

### 6. Delete Invoice

**Endpoint:** `DELETE /api/invoices/:invoiceId`

**Example:**
```
DELETE /api/invoices/INV-1001
```

**Response:**
```json
{
  "success": true,
  "message": "Invoice deleted successfully"
}
```

**Behavior:**
- Deletes the invoice
- Removes invoice reference from the linked shipment

---

## 🔐 Authentication

All endpoints require authentication via JWT token:

```javascript
headers: {
  "Authorization": "Bearer <your_jwt_token>"
}
```

Admin-only endpoints:
- `PUT /api/invoices/:invoiceId` (update status)
- `DELETE /api/invoices/:invoiceId` (delete)

---

## 📊 Database Schema

### Invoice Model
```javascript
{
  invoiceId: String,        // "INV-1001" (auto-generated, unique)
  shipmentId: ObjectId,     // Reference to Shipment
  customerName: String,     // Copied from shipment
  amount: Number,           // Invoice amount in rupees
  status: String,           // "PENDING" or "PAID"
  paymentDate: Date,        // null if not paid
  createdAt: Date          // Auto-managed
}
```

### Shipment Model (Updated)
```javascript
{
  // ... existing fields ...
  invoice: ObjectId,        // Reference to Invoice (optional)
  // ... rest of fields ...
}
```

---

## 🎯 Key Features

✅ **Auto-generation:** Invoice ID is automatically generated (INV-1001, INV-1002, etc.)

✅ **One-to-one relationship:** One shipment can have only one invoice

✅ **Smart update:** If invoice exists, amount is updated (no duplicate invoices)

✅ **Clean data:** API responses are formatted for easy frontend consumption

✅ **Payment tracking:** Automatic `paymentDate` management when marking as PAID

✅ **Cascading delete:** Deleting invoice removes reference from shipment

---

## 🧪 Testing Examples

### Test 1: Create shipment with invoice
```bash
curl -X POST http://localhost:5000/api/shipments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customerName": "Test Customer",
    "source": "Mumbai",
    "destination": "Pune",
    "invoiceAmount": 5000
  }'
```

### Test 2: Get all pending invoices
```bash
curl -X GET "http://localhost:5000/api/invoices?status=PENDING" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 3: Mark invoice as paid
```bash
curl -X PUT http://localhost:5000/api/invoices/INV-1001 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"status": "PAID"}'
```

---

## 🚨 Error Handling

### Invalid Status
```json
{
  "success": false,
  "message": "Invalid status. Must be PENDING or PAID"
}
```

### Invoice Not Found
```json
{
  "success": false,
  "message": "Invoice not found"
}
```

### Missing Required Fields
```json
{
  "success": false,
  "message": "Please provide customer name, source, and destination"
}
```

---

## 📝 Notes

1. **Invoice creation is optional** - Only created when `invoiceAmount` is provided
2. **No duplicate invoices** - System prevents multiple invoices per shipment
3. **Simple workflow** - Only two statuses: PENDING and PAID
4. **No payment gateway** - Manual status update by admin
5. **Clean separation** - Invoice logic is separate from shipment logic
