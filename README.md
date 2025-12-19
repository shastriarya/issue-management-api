# Multi-Tenant Issue & Activity Management API

A NestJS-based REST API for managing issues across multiple organizations with strict data isolation, role-based access control, and activity logging.

## Overview

This is a backend assignment demonstrating:

- **Multi-tenancy**: Complete data isolation per organization
- **Role-based authorization**: ADMIN and MEMBER roles with different permissions
- **Activity logging**: Automatic tracking of status and assignee changes
- **RESTful API design**: Clean, scalable endpoints
- **NestJS best practices**: Module design, Guards, Services, and Controllers

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: NestJS 11+
- **Language**: TypeScript
- **Database**: MongoDB (with Prisma ORM)
- **Validation**: class-validator, class-transformer
- **HTTP**: Express

## Setup Instructions

### Prerequisites

1. Node.js 18+ installed
2. MongoDB instance (local or cloud)
3. npm or yarn package manager

### Installation

1. Clone the repository and navigate to the project directory:

```bash
cd issue-management-api
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables by copying and editing `.env.example`:

```bash
cp .env.example .env
# Edit .env with your MongoDB connection string and PORT
```

4. Generate Prisma client:

```bash
npx prisma generate
```

### Running the Application

**Development mode** (with hot reload):

```bash
npm run start:dev
```

**Production mode**:

```bash
npm run build
npm run start:prod
```

The API will be available at `http://localhost:3000`

## API Endpoints

All endpoints require the following headers for multi-tenancy:

- `x-user-id`: UUID or identifier of the requesting user
- `x-organization-id`: UUID or identifier of the organization
- `x-user-role`: Either `ADMIN` or `MEMBER`

### Issues Management

#### Create Issue

```
POST /issues
Content-Type: application/json
x-user-id: user123
x-organization-id: org456
x-user-role: MEMBER

{
  "title": "Fix login bug",
  "description": "Users cannot log in with SSO",
  "assigneeId": "optional-user-id"
}
```

#### Get All Issues (Organization-scoped)

```
GET /issues
x-user-id: user123
x-organization-id: org456
x-user-role: MEMBER
```

#### Get Single Issue

```
GET /issues/:id
x-user-id: user123
x-organization-id: org456
x-user-role: MEMBER
```

#### Update Issue

```
PATCH /issues/:id
Content-Type: application/json
x-user-id: user123
x-organization-id: org456
x-user-role: ADMIN

{
  "status": "IN_PROGRESS",
  "assigneeId": "new-assignee-id"
}
```

**Important**: Only ADMIN users can:

- Update issue status
- Update assignee
- Delete issues

MEMBER users can only:

- Create issues
- View issues
- Update title/description

#### Delete Issue

```
DELETE /issues/:id
x-user-id: user123
x-organization-id: org456
x-user-role: ADMIN
```

## Architecture & Design Decisions

### 1. Multi-Tenancy Implementation

**Approach**: Organization-scoped data isolation using `organizationId` as a partition key.

**Implementation Details**:

- Every entity (Issue, Activity, User) includes `organizationId` field
- Prisma queries filter by `organizationId` at the service layer
- Guards extract and validate tenant context from request headers
- Database indexes on `organizationId` for query performance

**Security Enforcement**:

- All queries include `WHERE organizationId = :orgId` filter
- Service layer verifies tenant context before data access
- Attempting to access another organization's data returns `ForbiddenException`

### 2. Authorization Logic: Guard vs Service

**Authorization Decision Matrix**:

| Concern                    | Location      | Rationale                             |
| -------------------------- | ------------- | ------------------------------------- |
| Header validation          | TenantGuard   | Must happen early in request pipeline |
| Role validation            | IssuesService | Business logic specific to operations |
| Tenant isolation           | IssuesService | Data-layer enforcement prevents leaks |
| Multi-tenancy verification | IssuesService | Validates ownership before mutations  |

**Guard** (`TenantGuard`):

- Extracts tenant context from headers
- Validates header presence and role format
- Attaches context to request object
- Runs before controller methods

**Service** (`IssuesService`):

- Enforces role-based CRUD permissions
- Verifies data ownership by organization
- Returns `ForbiddenException` for unauthorized operations
- Logs activities for audit trails

**Why This Split?**:

- Guards handle cross-cutting concerns (authentication/tenant validation)
- Services handle business rules (authorization, data isolation)
- Single Responsibility: Guards validate requests, Services validate operations
- Better testability: business logic isolated in services

### 3. Cross-Organization Data Leak Prevention

**Multiple Layers of Protection**:

1. **Query Layer**:
   - Every Prisma query includes `organizationId` filter
   - Example: `findOne()` verifies ownership after retrieval

2. **Guard Layer**:
   - Validates `x-organization-id` header presence
   - Rejects requests with missing/invalid organization context

3. **Service Layer**:
   - `findOne()` throws `ForbiddenException` if organization doesn't match
   - `update()` and `delete()` verify ownership before operations

4. **Database Layer**:
   - Compound indexes on `(organizationId, id)` prevent cross-org queries
   - Cascading deletes prevent orphaned records

**Example Protection Flow**:

```typescript
// Step 1: Guard validates header
TenantGuard: organizationId = "org-456" ✓

// Step 2: Request hits endpoint
POST /issues/:id

// Step 3: Service verifies ownership
const issue = findById("issue-789")
if (issue.organizationId !== "org-456")
  → ForbiddenException ✓
```

### 4. Scale Concerns (100,000+ Organizations)

**Current Bottlenecks**:

1. **Database Query Performance**:
   - Problem: Scanning all issues per organization
   - Solution: Add database indexes on `(organizationId, createdAt)`
   - Better: Implement sharding by `organizationId`

2. **Memory Footprint**:
   - Problem: Loading full issue history with activities in memory
   - Solution: Implement pagination (limit/offset or cursor-based)
   - Implement lazy loading of relationships

3. **Tenant Context Lookup**:
   - Problem: Header-based mocking doesn't scale to real authentication
   - Solution: Implement JWT tokens with tenant info
   - Cache tenant metadata for faster validation

4. **Activity Log Growth**:
   - Problem: Activity collection grows unbounded
   - Solution: Archive old activities to separate storage
   - Implement retention policies (e.g., keep 1 year of history)

5. **API Response Times**:
   - Problem: Including full activity history on every issue fetch
   - Solution: Paginate activities separately
   - Implement efficient filtering (last 10 changes only)

**Recommended Scaling Improvements**:

```typescript
// Add pagination
async findAll(organizationId: string, page: number, limit: number) {
  return this.prisma.issue.findMany({
    where: { organizationId },
    skip: (page - 1) * limit,
    take: limit,
  });
}

// Batch operations
async findByIds(organizationId: string, ids: string[]) {
  return this.prisma.issue.findMany({
    where: { organizationId, id: { in: ids } },
  });
}
```

### 5. Features Intentionally Skipped (Time Constraints)

| Feature                         | Reason                                 | Impact                            |
| ------------------------------- | -------------------------------------- | --------------------------------- |
| **Authentication/JWT**          | Out of scope per requirements          | Uses mock headers instead         |
| **Unit/Integration Tests**      | Explicit out of scope                  | Manual testing only               |
| **Pagination**                  | Not listed as required                 | Client must handle large datasets |
| **Search/Filtering**            | Not listed as required                 | Only returns all issues per org   |
| **Permission Model Expansion**  | Time constraint                        | Only ADMIN/MEMBER roles           |
| **Audit Logging**               | Not required (Activity log sufficient) | Basic activity tracking only      |
| **Rate Limiting**               | Not listed as required                 | No protection against abuse       |
| **Caching Layer**               | Time constraint                        | Fresh data on every request       |
| **API Documentation** (Swagger) | Time constraint                        | Manual testing via cURL/Postman   |

## Testing the API

### Using cURL

**Create an Issue**:

```bash
curl -X POST http://localhost:3000/issues \
  -H "x-user-id: user-001" \
  -H "x-organization-id: org-acme" \
  -H "x-user-role: ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "API Login Issue",
    "description": "Users report 500 error on login"
  }'
```

**Get All Issues**:

```bash
curl http://localhost:3000/issues \
  -H "x-user-id: user-001" \
  -H "x-organization-id: org-acme" \
  -H "x-user-role: MEMBER"
```

**Update Issue**:

```bash
curl -X PATCH http://localhost:3000/issues/:id \
  -H "x-user-id: user-001" \
  -H "x-organization-id: org-acme" \
  -H "x-user-role: ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"status": "IN_PROGRESS"}'
```

### Multi-Tenant Isolation Test

Org1 cannot see Org2's issues:

```bash
# Create issue in org-acme
curl -X POST http://localhost:3000/issues \
  -H "x-organization-id: org-acme" ...

# Fetch with org-techcorp
curl http://localhost:3000/issues \
  -H "x-organization-id: org-techcorp" ...
# Result: Empty list ✓
```

## Project Structure

```
src/
├── common/
│   └── tenant/
│       ├── tenant.guard.ts         # Multi-tenancy Guard
│       └── tenant.service.ts       # Tenant context service
├── issues/
│   ├── dto/
│   │   ├── create-issue.dto.ts     # Validation DTOs
│   │   └── update-issue.dto.ts
│   ├── activity/
│   │   └── activity.service.ts     # Activity logging
│   ├── issues.controller.ts        # REST endpoints
│   ├── issues.service.ts           # Business logic
│   └── issues.module.ts
├── prisma/
│   ├── prisma.service.ts           # Database client
│   └── prisma.module.ts
├── app.module.ts                   # Root module
└── main.ts                         # Bootstrap

prisma/
└── schema.prisma                   # Database schema
```

## Summary of Architectural Choices

1. **Guard-Service Split**: Guards validate requests, Services enforce business rules
2. **Tenant Context Extraction**: Headers → Guard → Service throughout request lifecycle
3. **Activity Logging**: Dedicated service tracks all mutations for audit trail
4. **Error Handling**: Proper HTTP status codes (403 Forbidden, 404 Not Found)
5. **Type Safety**: Full TypeScript for compile-time safety
6. **Database Relationships**: Prisma with cascading deletes and indexes
7. **Scalability Path**: Clear upgrade path for sharding, caching, pagination

## License

MIT
