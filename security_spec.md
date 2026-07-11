# Security Specification - Note-Taking App

This document outlines the security invariants, threat model ("Dirty Dozen" payloads), and rules validation strategy for the Note-Taking App.

## 1. Data Invariants

* **Note Ownership**: A note must always belong to the user who created it (`userId` matches the authenticated user's `uid`).
* **Isolation**: Users must only be able to read, write, update, or delete their own notes.
* **Timestamps**: `createdAt` must be the exact server time on creation and remains immutable. `updatedAt` must be updated to the exact server time on every write/update.
* **Schema Integrity**: Every note must have exactly the required fields: `title` (string, max 500 chars), `content` (string, max 100,000 chars), `userId` (string), `pinned` (boolean), `createdAt` (timestamp), and `updatedAt` (timestamp). No unknown fields (ghost fields) are allowed.
* **ID Validation**: Note IDs must be clean alphanumeric strings of reasonable length (<= 128 characters).

---

## 2. The "Dirty Dozen" Malicious Payloads

Here are 12 malicious payloads designed to attempt to break the security model, which our Firestore rules must reject.

### Payload 1: Identity Spoofing (Create with other user's UID)
* **Attempt**: Authenticated user `alice_uid` tries to create a note claiming `userId: "bob_uid"`.
* **Payload**:
  ```json
  {
    "title": "Alice's Secret Note",
    "content": "Secret content",
    "userId": "bob_uid",
    "pinned": false,
    "createdAt": "request.time",
    "updatedAt": "request.time"
  }
  ```
* **Expected Result**: `PERMISSION_DENIED`

### Payload 2: Identity Spoofing (Update note ownership)
* **Attempt**: Authenticated user `alice_uid` tries to transfer ownership of their note `note_123` to `bob_uid` by updating `userId`.
* **Payload**:
  ```json
  {
    "userId": "bob_uid"
  }
  ```
* **Expected Result**: `PERMISSION_DENIED`

### Payload 3: Unauthenticated Create
* **Attempt**: An unauthenticated user (guest) tries to create a note.
* **Payload**:
  ```json
  {
    "title": "Guest Note",
    "content": "Hello",
    "userId": "some_uid",
    "pinned": false,
    "createdAt": "request.time",
    "updatedAt": "request.time"
  }
  ```
* **Expected Result**: `PERMISSION_DENIED`

### Payload 4: Unauthorized Read (Get other's note)
* **Attempt**: Authenticated user `alice_uid` attempts to read note `/notes/bob_note_456` owned by `bob_uid`.
* **Expected Result**: `PERMISSION_DENIED`

### Payload 5: Unauthorized List (Querying all notes)
* **Attempt**: Authenticated user `alice_uid` attempts to query `/notes` without a filter on `userId == "alice_uid"`.
* **Expected Result**: `PERMISSION_DENIED`

### Payload 6: ID Poisoning Attack
* **Attempt**: User attempts to create a note with a massive, malformed document ID `/notes/super-long-poison-id-with-junk-$$$-!!!-%%%` containing malicious chars and of 1KB size.
* **Expected Result**: `PERMISSION_DENIED` (handled by `isValidId(noteId)`)

### Payload 7: Ghost Field Injection (Privilege escalation / shadow data)
* **Attempt**: User attempts to insert a "ghost field" `role: "admin"` or `isSystemNote: true` to bypass filters.
* **Payload**:
  ```json
  {
    "title": "Normal Note",
    "content": "Content",
    "userId": "alice_uid",
    "pinned": false,
    "createdAt": "request.time",
    "updatedAt": "request.time",
    "role": "admin"
  }
  ```
* **Expected Result**: `PERMISSION_DENIED`

### Payload 8: Denial of Wallet (Bloated Text)
* **Attempt**: User attempts to save a note with a title of 20,000 characters or content exceeding 1MB to inflate DB storage.
* **Expected Result**: `PERMISSION_DENIED` (size bounds validation)

### Payload 9: Type Poisoning (String as Pinned Boolean)
* **Attempt**: User attempts to set `pinned` to `"true"` (string) instead of a boolean value.
* **Payload**:
  ```json
  {
    "title": "My Note",
    "content": "Content",
    "userId": "alice_uid",
    "pinned": "true",
    "createdAt": "request.time",
    "updatedAt": "request.time"
  }
  ```
* **Expected Result**: `PERMISSION_DENIED`

### Payload 10: Client-Side Timestamp Spoofing (Create)
* **Attempt**: User attempts to hardcode a future date-time for `createdAt` to gain sorting advantages.
* **Payload**:
  ```json
  {
    "title": "Future Note",
    "content": "Content",
    "userId": "alice_uid",
    "pinned": false,
    "createdAt": "timestamp(2035-01-01T00:00:00Z)",
    "updatedAt": "request.time"
  }
  ```
* **Expected Result**: `PERMISSION_DENIED`

### Payload 11: Temporal Tampering (Update updatedAt with past time)
* **Attempt**: User attempts to update a note but freeze `updatedAt` to a past timestamp instead of `request.time`.
* **Payload**:
  ```json
  {
    "title": "Edited Note",
    "content": "Edited Content",
    "userId": "alice_uid",
    "pinned": false,
    "createdAt": "existing().createdAt",
    "updatedAt": "timestamp(2020-01-01T00:00:00Z)"
  }
  ```
* **Expected Result**: `PERMISSION_DENIED`

### Payload 12: Invalid Schema (Missing required fields)
* **Attempt**: User tries to create a note without a `title` field.
* **Payload**:
  ```json
  {
    "content": "Content only",
    "userId": "alice_uid",
    "pinned": false,
    "createdAt": "request.time",
    "updatedAt": "request.time"
  }
  ```
* **Expected Result**: `PERMISSION_DENIED`

---

## 3. Test Runner Design

While standard ESLint configurations are not pre-packaged in our template workspace, these requirements are mathematically guaranteed by our security rules matching in `firestore.rules`.
