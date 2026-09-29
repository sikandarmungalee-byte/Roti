# Security Specification & Test-Driven Security Plan

## 1. Data Invariants
1. **User Isolation & Ownership Invariant**: All enterprise data (company settings, products, customers, invoices, quotations, delivery notes, payments, leads, communications) belongs strictly to the authenticated owner (`request.auth.uid == userId`). No user may read, write, update, or delete any data belonging to another user.
2. **Authentication Invariant**: Unauthenticated requests (`request.auth == null`) are strictly denied on all paths.
3. **Identifier Poisoning Invariant**: Document IDs (`userId`, `productId`, `invoiceId`, etc.) must strictly adhere to alphanumeric identifiers (`^[a-zA-Z0-9_\\-]+$`) with a maximum length of 128 characters.
4. **Subcollection Integrity Invariant**: All subcollection writes must verify that the root path corresponds directly to the active session user UID (`request.auth.uid == userId`).
5. **Payload Boundary Limits**: String lengths and document structures must be strictly bounded to prevent Denial of Wallet and payload inflation.

---

## 2. The "Dirty Dozen" Payloads
The following 12 adversarial payloads must fail and return `PERMISSION_DENIED`:

1. **Unauthenticated Read Attempt**:
   - Path: `/users/target_user_123/invoices/inv-001`
   - Auth: `null`
   - Expected: `PERMISSION_DENIED`
2. **Cross-Tenant Impersonation Write**:
   - Path: `/users/victim_user_999/products/prod-001`
   - Auth: `{ uid: "attacker_user_111" }`
   - Payload: `{ id: "prod-001", name: "Malicious Roti", price: 0 }`
   - Expected: `PERMISSION_DENIED`
3. **Cross-Tenant Impersonation Read (List Query)**:
   - Path: `/users/victim_user_999/customers`
   - Auth: `{ uid: "attacker_user_111" }`
   - Expected: `PERMISSION_DENIED`
4. **Document ID Injection Attack**:
   - Path: `/users/attacker_user_111/invoices/<script>alert(1)</script>`
   - Auth: `{ uid: "attacker_user_111" }`
   - Expected: `PERMISSION_DENIED` (ID contains invalid characters)
5. **Denial-of-Wallet Long String ID**:
   - Path: `/users/attacker_user_111/products/` + 'a'.repeat(300)
   - Auth: `{ uid: "attacker_user_111" }`
   - Expected: `PERMISSION_DENIED` (ID exceeds 128 chars)
6. **Global Document Catch-All Read**:
   - Path: `/some_random_collection/root_doc`
   - Auth: `{ uid: "attacker_user_111" }`
   - Expected: `PERMISSION_DENIED` (Caught by default deny)
7. **Cross-Tenant Company Settings Overwrite**:
   - Path: `/users/victim_user_999/company_settings/main`
   - Auth: `{ uid: "attacker_user_111" }`
   - Payload: `{ name: "Hacked Company" }`
   - Expected: `PERMISSION_DENIED`
8. **Cross-Tenant Payment Insertion**:
   - Path: `/users/victim_user_999/payments/pay-001`
   - Auth: `{ uid: "attacker_user_111" }`
   - Payload: `{ id: "pay-001", invoiceNumber: "INV-999", amount: 1000 }`
   - Expected: `PERMISSION_DENIED`
9. **Tampering with Another User's Lead Data**:
   - Path: `/users/victim_user_999/leads/lead-001`
   - Auth: `{ uid: "attacker_user_111" }`
   - Payload: `{ id: "lead-001", status: "Lost" }`
   - Expected: `PERMISSION_DENIED`
10. **Hijacking Another User's Customer Record**:
    - Path: `/users/victim_user_999/customers/cust-001`
    - Auth: `{ uid: "attacker_user_111" }`
    - Payload: `{ id: "cust-001", registeredName: "Stolen Customer" }`
    - Expected: `PERMISSION_DENIED`
11. **Malicious Quotation Overwrite**:
    - Path: `/users/victim_user_999/quotations/quot-001`
    - Auth: `{ uid: "attacker_user_111" }`
    - Payload: `{ id: "quot-001", totalAmount: 1 }`
    - Expected: `PERMISSION_DENIED`
12. **Unauthorized Deletion of Another User's Delivery Note**:
    - Path: `/users/victim_user_999/delivery_notes/dn-001`
    - Auth: `{ uid: "attacker_user_111" }`
    - Expected: `PERMISSION_DENIED`

---

## 3. Test Runner Specification
The test file `firestore.rules.test.ts` validates these exact assertions against the rules definition to guarantee Zero-Trust boundary isolation.
