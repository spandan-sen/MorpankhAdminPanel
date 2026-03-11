# Morpankh Dezine – Admin Panel

Private internal admin system built for Morpankh Dezine.

This project is not intended for public reuse or redistribution.

---

## About

Morpankh Dezine Admin Panel is a custom-built retail management system designed specifically for in-store operations and order management.

It handles product management, billing, barcode-based checkout, invoice generation, WhatsApp delivery, and inventory tracking.

This system is tailored to the business logic and workflow of Morpankh Dezine.

---

## Core Capabilities

### Product Management
- Full CRUD operations for products
- Stock tracking and updates
- Inventory health monitoring
- Barcode generation in bulk

### Order System
- Barcode scanner-enabled checkout
- Walk-in and delivery order support
- Semi-paid and pay-later tracking
- Order editing
- Complete order history

### Invoice Automation
- Automatic invoice PDF generation using Puppeteer
- Invoice delivery to customer via WhatsApp API
- Invoice storage in Google Drive using Google Apps Script

### Dashboard Analytics
- Order status overview
- Payment status tracking
- Outstanding balance tracking
- Inventory health metrics
- Overall operational summary

### Security
- Admin authentication
- Session based route protection
- Environment variable-based secret management

### Querying System
Robust keyword–value based filtering across products and orders.

**Supported Filters :**
- Date (order / payment / delivery / restock)
- Payment (status, method, transaction ID, invoice)
- Order (status, ID, customer, value range)
- Product (category, design, variants)
- Inventory (stock level, quantity range)
- Operational (barcode print, label, dispatch status)

---

## Tech Stack

Backend:
- Node.js
- Express.js
- MongoDB (Atlas)
- Mongoose
- Puppeteer

Frontend:
- HTML
- CSS
- JavaScript

External Integrations:
- WhatsApp API
- Google Apps Script (Drive Storage)

---

## Deployment

- Backend hosted on Render
- Database hosted on MongoDB Atlas
- Invoice storage via Google Drive (Apps Script Webhook)

---

## Notes

This is a production system built for a specific business workflow.

Not designed as a reusable template.
Not intended for public deployment without modification.




