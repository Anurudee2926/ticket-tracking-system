# Helpdesk & Issue Tracking API

A REST API built with Node.js, Express, and PostgreSQL. It supports registration/login, role-based access, ticket lifecycle management, assignment, comments, and activity history.

## Requirements
- Node.js 20+
- PostgreSQL 14+
- npm

## Setup
1. Create the database:
   ```sql
   CREATE DATABASE helpdesk_db;
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and set your PostgreSQL connection string and a strong `JWT_SECRET`.
4. Start the API:
   ```bash
   npm run dev
   ```
   Tables are created automatically on startup.
5. Open `http://localhost:3000/health`.

## Roles
- `customer`: can create tickets and view/comment on their own tickets.
- `agent`: can view all tickets, assign tickets, update ticket status, and comment.
- `admin`: agent permissions plus user listing.

The first registered user is a customer. For a real deployment, add a secure admin provisioning process rather than allowing public role selection.

## Main endpoints
| Method | Endpoint | Access |
|---|---|---|
| GET | `/health` | Public |
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/users/me` | Authenticated |
| GET | `/api/users` | Admin |
| POST | `/api/tickets` | Authenticated |
| GET | `/api/tickets` | Authenticated |
| GET | `/api/tickets/:id` | Authenticated |
| PATCH | `/api/tickets/:id` | Owner, agent, or admin |
| PATCH | `/api/tickets/:id/assign` | Agent or admin |
| PATCH | `/api/tickets/:id/resolve` | Agent or admin |
| GET | `/api/tickets/:id/comments` | Ticket access |
| POST | `/api/tickets/:id/comments` | Ticket access |
| GET | `/api/tickets/:id/history` | Ticket access |

## Example requests
Register:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Aisha","email":"aisha@example.com","password":"StrongPass123"}'
```
Copy the returned token into `TOKEN` below, then create a ticket:
```bash
curl -X POST http://localhost:3000/api/tickets \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Cannot reset password","description":"Reset link does not arrive","priority":"high","category":"account"}'
```
List tickets:
```bash
curl http://localhost:3000/api/tickets -H "Authorization: Bearer $TOKEN"
```

## Notes before production
This is a portfolio starter, not a fully hardened production deployment. Add migrations, rate limiting, email verification/password reset, refresh-token/session revocation, audit-log retention rules, structured logging, integration tests, and a secure admin provisioning workflow before production use. Use HTTPS and keep `.env` private.
