# SQL Repository

A lightweight TypeScript SQL repository library for building CRUD operations, dynamic queries, filtering, sorting, and pagination on top of database-specific executors.

The library separates SQL construction from database drivers. Database implementations provide an `Executor`/`MinDB` interface, while repositories provide a consistent API for application code.

## Features

* TypeScript-first repository API
* Generic CRUD repository
* Dynamic filtering and search
* Multiple comparison operators
* `IN` / array filtering
* Numeric and date ranges
* Global text search with `q`
* Configurable sorting
* Field selection
* Pagination
* Total-count queries
* Oracle/MSSQL paging support
* Optimistic locking through a version field
* Automatic `createdAt` / `updatedAt` handling
* Batch insert and update SQL generation
* PostgreSQL, MySQL, MSSQL, and Oracle-oriented SQL generation
* Database-independent executor abstraction

## Installation

```bash
npm install <package-name>
```

## Basic Concepts

The library uses metadata to describe how a TypeScript entity maps to a SQL table.

A simplified definition looks like:

```ts
const attrs = {
  id: {
    column: "id",
    key: true,
    type: "number"
  },

  name: {
    column: "name",
    type: "string"
  },

  age: {
    column: "age",
    type: "number"
  },

  version: {
    column: "version",
    type: "number",
    version: true
  },

  createdAt: {
    column: "created_at",
    type: "date",
    createdAt: true
  },

  updatedAt: {
    column: "updated_at",
    type: "date",
    updatedAt: true
  }
}
```

The metadata is used by the SQL builders and repositories to determine:

* primary keys
* database columns
* insertable fields
* updatable fields
* version fields
* timestamp fields
* boolean mappings
* defaults
* ignored fields

---

## Database Abstraction

The repository does not depend directly on a particular database driver.

A database implementation exposes an executor similar to:

```ts
export interface Executor {
  driver: string

  param(i: number): string

  execute(sql: string, args?: any[], ctx?: any): Promise<number>

  executeBatch(
    statements: Statement[],
    requireFirstAffected?: boolean,
    ctx?: any
  ): Promise<number>

  query<T>(sql: string, args?: any[], ctx?: any): Promise<T[]>

  queryOne<T>(sql: string, args?: any[], ctx?: any): Promise<T | undefined>

  executeScalar<T>(
    sql: string,
    args?: any[],
    ctx?: any
  ): Promise<T>

  count(sql: string, args?: any[], ctx?: any): Promise<number>
}
```

The important part is `param()`.

For example, PostgreSQL can use:

```ts
param(0) // "$1"
param(1) // "$2"
```

while another database can use its own parameter syntax.

This allows the SQL-building layer to remain database-independent.

---

# Repository

The main repository API is:

```ts
Repository<T, ID, S>
```

It provides CRUD operations and search capabilities.

Example:

```ts
interface User {
  id: number
  name: string
  age: number
  version: number
  createdAt: Date
  updatedAt: Date
}
```

Create a repository:

```ts
const repository = new Repository<User, number, UserSearch>(
  db,
  "users",
  attrs
)
```

## Create

```ts
const user = await repository.create({
  name: "Alice",
  age: 30
})
```

When configured, `createdAt` and other metadata-controlled values are handled automatically.

## Load

```ts
const user = await repository.load(10)
```

The repository uses the primary-key metadata to construct the query.

## Exist

```ts
const exists = await repository.exist(10)
```

## Update

```ts
const result = await repository.update({
  id: 10,
  name: "Alice Smith",
  age: 31,
  version: 3
})
```

Update operations can use optimistic locking when a version field is configured.

Conceptually, the generated SQL is similar to:

```sql
update users
set name = $1,
    age = $2,
    version = 4
where id = $3
  and version = $4
```

The affected-row count can therefore distinguish between a successful update and an optimistic-lock conflict.

## Patch

`patch()` performs a partial update:

```ts
await repository.patch({
  id: 10,
  name: "Alice Smith"
})
```

Fields that are not supplied are not updated.

## Delete

```ts
await repository.delete(10)
```

---

# Search Repository

Search functionality is provided by the search repository.

```ts
SearchRepository<T, ID, S>
```

A search query can contain filtering, sorting, field selection, paging, and a global text query.

Example:

```ts
const result = await repository.search({
  name: "Alice",
  age: {
    min: 18,
    max: 40
  },
  sn: "-createdAt",
  page: 1,
  limit: 20
})
```

A typical result contains:

```ts
{
  data: [...],
  total: 123
}
```

---

# Filtering

Simple values are translated into equality conditions.

```ts
{
  status: "active"
}
```

produces a condition conceptually equivalent to:

```sql
status = ?
```

Values are passed as query parameters rather than directly embedded into SQL.

## Arrays

An array can be used to generate an `IN` condition:

```ts
{
  status: ["active", "pending"]
}
```

Conceptually:

```sql
status in (?, ?)
```

## Null

`null` can be used for null comparisons.

## Operators

The query builder supports operator-style filter objects for conditions such as:

```text
eq
ne
gt
gte
lt
lte
like
```

The exact operator representation is determined by the query API exposed by the package.

---

# Numeric Ranges

Numeric values can be expressed as ranges:

```ts
{
  age: {
    min: 18,
    max: 40
  }
}
```

which is translated conceptually into:

```sql
age >= ?
and age <= ?
```

A single bound can also be used:

```ts
{
  age: {
    min: 18
  }
}
```

or:

```ts
{
  age: {
    max: 40
  }
}
```

---

# Date Ranges

Date fields support the same range-oriented filtering:

```ts
{
  createdAt: {
    min: new Date("2026-01-01"),
    max: new Date("2026-12-31")
  }
}
```

The resulting query uses parameterized date values.

---

# Global Text Search

A `q` value can be used for text search across configured searchable fields.

Example:

```ts
{
  q: "alice"
}
```

The query builder creates a group of `LIKE`/case-insensitive `LIKE` predicates depending on the database driver.

For example:

```sql
where name like ?
   or email like ?
```

PostgreSQL can use `ILIKE` for case-insensitive matching.

---

# Sorting

Sorting is controlled by the `sn` search parameter.

Ascending:

```ts
{
  sn: "name"
}
```

Descending:

```ts
{
  sn: "-createdAt"
}
```

Multiple fields:

```ts
{
  sn: "name,-createdAt"
}
```

The query builder validates sort expressions before inserting them into SQL.

For databases that require deterministic ordering for paging, such as MSSQL, the repository can fall back to primary-key ordering when necessary.

---

# Field Selection

Search queries can restrict the returned fields.

For example:

```ts
{
  fields: ["id", "name", "email"]
}
```

The SQL projection is built from those fields rather than always returning the entire row.

---

# Pagination

Search supports offset-based pagination.

Example:

```ts
{
  page: 2,
  limit: 20
}
```

Conceptually:

```text
offset = (page - 1) * limit
```

For databases supporting standard `OFFSET` / `LIMIT`, the query is generated accordingly.

Oracle and MSSQL use database-specific paging syntax.

---

# Count Queries

A paginated search can also return the total number of matching records.

Conceptually, the library executes:

```sql
select ...
```

for the page data and a corresponding count query for the total.

This allows applications to implement:

* page numbers
* total result counts
* pagination controls

---

# SQL Builders

The package also exposes lower-level SQL builder functions for applications that do not need the repository abstraction.

These include builders for:

```text
SELECT
EXIST
INSERT
BATCH INSERT
UPDATE
BATCH UPDATE
DELETE
```

This can be useful when application code already has its own service/repository layer.

For example:

```ts
const statement = buildToInsert(
  table,
  attrs,
  object,
  db.param.bind(db)
)
```

The result contains SQL and its parameter values.

---

# Batch Operations

Batch SQL builders can generate multiple rows/statements efficiently.

Example:

```ts
const statements = buildToInsertBatch(
  table,
  attrs,
  objects,
  buildParam
)
```

Batch update functionality is also provided.

The actual execution strategy is delegated to the database executor:

```ts
await db.executeBatch(statements)
```

This keeps batching separate from database-specific connection and transaction handling.

---

# Optimistic Locking

A field marked with:

```ts
{
  version: true
}
```

is treated as a version field.

During an update, the expected version is included in the `WHERE` clause and the version is incremented.

Example:

```text
Current database version: 3
Requested version:        3
New version:              4
```

The generated SQL is conceptually:

```sql
update users
set name = ?,
    version = 4
where id = ?
  and version = 3
```

If another transaction has already changed the record to version `4`, the update affects zero rows.

This provides optimistic concurrency control without requiring a database lock.

---

# Metadata Attributes

An attribute can contain information such as:

```ts
interface Attribute {
  name?: string
  column?: string
  type?: string
  default?: any

  key?: boolean
  noinsert?: boolean
  noupdate?: boolean

  version?: boolean
  createdAt?: boolean
  updatedAt?: boolean

  ignored?: boolean

  true?: any
  false?: any
}
```

These flags allow the same entity definition to control SQL generation.

### `key`

Marks a primary-key field.

```ts
{
  key: true
}
```

### `column`

Maps a TypeScript property to a database column.

```ts
{
  column: "created_at"
}
```

### `noinsert`

Prevents a field from being included in generated INSERT statements.

### `noupdate`

Prevents a field from being included in generated UPDATE statements.

### `version`

Marks the optimistic-lock version column.

### `createdAt`

Marks a field automatically populated when creating an entity.

### `updatedAt`

Marks a field automatically populated when updating an entity.

### `ignored`

Removes a field from SQL generation.

### `default`

Defines an application/database-aware default used during SQL construction.

### `true` / `false`

Allows boolean values to be mapped to database-specific representations.

For example:

```ts
{
  true: 1,
  false: 0
}
```

---

# Composite Primary Keys

The SQL builders can work with multiple primary-key fields for operations such as loading, updating, and deleting records.

For example:

```ts
const attrs = {
  tenantId: {
    key: true
  },
  id: {
    key: true
  }
}
```

The generated predicate can conceptually become:

```sql
where tenant_id = ?
  and id = ?
```

Some higher-level search/exclusion behavior is intentionally limited to a single primary-key field.

---

# Database Drivers

The SQL generation layer contains database-specific behavior where necessary.

The executor identifies the active database through:

```ts
db.driver
```

This allows the query layer to adapt things such as:

* parameter syntax
* case-insensitive comparison
* pagination
* database-specific SQL

The repository itself does not need to know how connections, pools, transactions, or driver clients are implemented.

---

# Transactions

Transaction management belongs to the database implementation.

A typical application flow is:

```ts
const tx = await db.beginTransaction()

try {
  await tx.execute(...)
  await tx.execute(...)

  await tx.commit()
} catch (err) {
  await tx.rollback()
  throw err
}
```

The repository layer can therefore be used independently of the concrete database transaction implementation.

---

# Design Philosophy

This library intentionally separates three responsibilities.

### SQL construction

The SQL builder converts metadata and application values into:

```ts
{
  query: string
  params?: any[]
}
```

### Database execution

The executor is responsible for:

* connections
* pools
* parameter binding
* executing SQL
* transactions
* database-specific behavior

### Application repository

The repository provides an application-friendly API:

```text
create
load
exist
update
patch
delete
search
```

This separation makes it possible to use the same repository code with different SQL database implementations.

---

# Security Considerations

Application values are normally passed through SQL parameters rather than interpolated directly into the generated SQL.

Identifiers such as table names and column names are different: they are SQL syntax rather than parameter values.

Therefore:

* table names should come from trusted application configuration
* column metadata should come from trusted application configuration
* user-controlled sort/field expressions should not bypass the library's validation
* arbitrary SQL fragments should not be accepted as external input

The repository is intended to receive trusted table/metadata definitions and untrusted data values separately.

---

# Limitations

The query builder is designed around SQL generated by this library rather than acting as a complete SQL parser.

In particular, count/paging construction relies on recognizing the structure of generated SQL. Complex hand-written SQL containing nested queries, CTEs, or unusual formatting may require additional handling.

The higher-level `excluding` functionality is also designed around a single primary key.

For complex SQL requirements, applications can use the lower-level `Executor` directly.

---

# Typical Usage

A typical application structure is:

```text
Application
    │
    ▼
Repository<T>
    │
    ├── CRUD
    ├── Search
    ├── Filtering
    └── Paging
    │
    ▼
SQL Builders
    │
    ▼
Executor / Transaction
    │
    ▼
Database Driver
    │
    ▼
SQL Database
```

The repository contains application-facing behavior while the executor contains database-specific behavior.

---

# API Summary

The main repository operations are:

```ts
repository.create(...)
repository.load(...)
repository.exist(...)
repository.update(...)
repository.patch(...)
repository.delete(...)
repository.search(...)
```

The lower-level SQL layer provides builders for:

```text
select
exist
insert
batch insert
update
batch update
delete
```

The search layer provides:

```text
filtering
sorting
field selection
paging
counting
global text search
```

---

# License

MIT

# TypeScript CRUD Repository

A lightweight, database-agnostic CRUD repository for TypeScript applications.

The library provides a small repository abstraction for common database operations while keeping database-specific behavior inside an `Executor`/`Transaction` implementation. It supports primary keys, composite keys, column mapping, boolean conversion, timestamps, optimistic locking, batch inserts, and transactions.

## Features

* Generic `CRUDRepository<T, ID>` API
* Database-independent executor abstraction
* Transaction support
* Create, read, update, patch, delete operations
* Composite primary keys
* Property-to-column mapping
* Boolean value mapping for databases without native boolean types
* Automatic `createdAt` / `updatedAt` handling
* Optimistic locking with version fields
* Batch insert support
* Custom entity conversion with `toDB` / `fromDB`
* Configurable SQL parameter placeholders

## Architecture

```text
Application
    │
    ▼
CRUDRepository<T, ID>
    │
    ├── Metadata
    │
    ├── SQL Builders
    │     ├── SELECT
    │     ├── INSERT
    │     ├── UPDATE
    │     └── DELETE
    │
    ▼
Executor / Transaction
    │
    ▼
Database Driver
```

The repository does not directly depend on a database library. Instead, a database adapter implements the `Executor` and `DB` interfaces.

This makes the repository usable with different database engines and SQL placeholder conventions.

## Installation

Install the package through your package manager:

```bash
npm install <package-name>
```

or:

```bash
yarn add <package-name>
```

## Basic Usage

Create a database adapter implementing the `DB` interface:

```ts
interface DB extends Executor {
  beginTransaction(): Promise<Transaction>
}
```

Then create a repository:

```ts
interface User {
  id: number
  name: string
  active: boolean
}

const userRepository = new CRUDRepository<User, number>(
  db,
  "users",
  {
    id: {
      key: true
    },
    name: {},
    active: {
      type: "boolean",
      true: 1,
      false: 0
    }
  }
)
```

### Read all records

```ts
const users = await userRepository.all()
```

### Load by ID

```ts
const user = await userRepository.load(123)
```

### Check existence

```ts
const exists = await userRepository.exist(123)
```

### Create

```ts
const affected = await userRepository.create({
  id: 123,
  name: "Alice",
  active: true
})
```

### Update

```ts
const affected = await userRepository.update({
  id: 123,
  name: "Alice Smith",
  active: true
})
```

### Delete

```ts
const affected = await userRepository.delete(123)
```

## Metadata

Repository behavior is controlled by attribute metadata.

```ts
const attributes: Attributes = {
  id: {
    key: true
  },

  name: {
    column: "user_name"
  },

  active: {
    type: "boolean",
    true: 1,
    false: 0
  },

  version: {
    version: true
  },

  createdAt: {
    createdAt: true
  },

  updatedAt: {
    updatedAt: true
  }
}
```

### Common attributes

| Attribute   | Description                                 |
| ----------- | ------------------------------------------- |
| `key`       | Marks a primary-key field                   |
| `column`    | Overrides the database column name          |
| `type`      | Defines special value handling              |
| `noinsert`  | Excludes the field from INSERT              |
| `noupdate`  | Excludes the field from UPDATE              |
| `nopatch`   | Intended to exclude the field from PATCH    |
| `version`   | Enables optimistic locking                  |
| `createdAt` | Automatically manages creation time         |
| `updatedAt` | Automatically manages update time           |
| `ignored`   | Excludes the field from database operations |
| `true`      | Database representation of boolean `true`   |
| `false`     | Database representation of boolean `false`  |

## Column Mapping

Application property names do not have to match database column names.

```ts
const repository = new CRUDRepository<User, number>(
  db,
  "users",
  {
    id: {
      key: true,
      column: "user_id"
    },

    name: {
      column: "user_name"
    }
  }
)
```

The generated SQL uses the configured column names:

```sql
insert into users(user_id, user_name)
values (...)
```

## Composite Primary Keys

Multiple attributes can be marked as keys:

```ts
const repository = new CRUDRepository<Order, OrderId>(
  db,
  "orders",
  {
    tenantId: {
      key: true,
      column: "tenant_id"
    },

    orderId: {
      key: true,
      column: "order_id"
    },

    amount: {}
  }
)
```

A lookup generates a condition similar to:

```sql
where tenant_id = $1
  and order_id = $2
```

## Boolean Mapping

The repository can map JavaScript booleans to database-specific values.

For example:

```ts
active: {
  type: "boolean",
  true: 1,
  false: 0
}
```

produces values such as:

```text
true  → 1
false → 0
```

This is useful for databases or schemas that represent booleans using numeric or string values.

## Transactions

Transactions implement the same `Executor` interface as the database connection.

This allows repository methods to participate in an existing transaction:

```ts
const tx = await db.beginTransaction()

try {
  await userRepository.create(user1, tx)
  await userRepository.update(user2, tx)

  await tx.commit()
} catch (error) {
  await tx.rollback()
  throw error
}
```

A transaction can therefore be passed through multiple repository operations without requiring repository-specific transaction logic.

## Optimistic Locking

Mark a field as a version field:

```ts
version: {
  version: true
}
```

The repository then uses the version in the `UPDATE` condition and increments it when the update succeeds.

Conceptually:

```sql
update users
set name = $1,
    version = $2
where id = $3
  and version = $4
```

This prevents an older entity from overwriting a newer version.

The update result distinguishes different cases:

| Result | Meaning                  |
| -----: | ------------------------ |
|  `> 0` | Record updated           |
|    `0` | Optimistic-lock conflict |
|   `-1` | Record does not exist    |

This allows callers to distinguish a missing record from a concurrent update.

## Entity Conversion

Repositories can convert entities between application and database representations.

For example:

```ts
const repository = new CRUDRepository<User, number>(
  db,
  "users",
  attributes,
  {
    toDB(user) {
      return {
        ...user,
        name: user.name.trim()
      }
    },

    fromDB(row) {
      return {
        ...row,
        name: row.name.trim()
      }
    }
  }
)
```

This is useful when database values and application values have different representations.

## Batch Inserts

The SQL builder supports batch insertion:

```ts
await repository.createBatch(users)
```

Depending on the database adapter, generated SQL can use the appropriate parameter syntax or dialect-specific batch-insert syntax.

## Executor Interface

The database adapter is responsible for actually communicating with the database.

A simplified interface is:

```ts
interface Executor {
  driver: string

  param(index: number): string

  query<T>(
    sql: string,
    args?: any[],
    map?: StringMap,
    bools?: Attribute[]
  ): Promise<T[]>

  execute(
    sql: string,
    args?: any[]
  ): Promise<number>

  executeBatch(
    statements: Statement[],
    firstSuccess?: boolean
  ): Promise<number>
}
```

### Parameter placeholders

The `param()` function allows each database driver to choose its placeholder format.

For example:

```ts
param(1) // "$1"
param(2) // "$2"
```

or:

```ts
param(1) // "?"
param(2) // "?"
```

The repository therefore does not need to know the parameter syntax of the underlying database.

## Database Adapter Responsibilities

A database adapter should handle:

* Connection management
* Parameter binding
* Query execution
* Transaction lifecycle
* Database-specific error normalization
* Conversion of database values into application values
* Driver-specific SQL behavior

The repository should remain focused on metadata and CRUD behavior.

## SQL Identifier Safety

Table names and column names are inserted into generated SQL rather than passed as parameters.

For example:

```ts
`select * from ${table}`
```

SQL parameters normally protect values, not identifiers.

Therefore, table names and column names must come from trusted application configuration.

Do not construct repository metadata from untrusted user input.

## Error Handling

Repository operations generally propagate database errors to the caller.

Database adapters should normalize database-specific errors where possible so the repository does not need to understand vendor-specific error formats.

For example, a database adapter can translate a native duplicate-key error into a common `"duplicate"` error type.

## Design Goals

This project intentionally aims to be smaller than a full ORM.

It provides:

```text
Metadata
   +
SQL generation
   +
CRUD repository
   +
Database adapter abstraction
```

while leaving connection pooling, migrations, schema management, query optimization, and database-specific functionality to the surrounding application or database layer.

## Recommended Practices

Keep repository metadata static and application-controlled:

```ts
const userAttributes = {
  id: { key: true },
  name: {}
}
```

Reuse the metadata when appropriate, but avoid modifying it at runtime.

Use transactions for operations that must succeed or fail together:

```ts
const tx = await db.beginTransaction()

try {
  await repository.create(a, tx)
  await repository.update(b, tx)

  await tx.commit()
} catch (error) {
  await tx.rollback()
  throw error
}
```

For concurrent updates, use a `version` attribute and check the update result.

## Known Limitations / Areas for Improvement

The current implementation has several areas that may be worth addressing in future versions:

* Centralize SQL value parameterization to reduce duplicated logic.
* Avoid mutating metadata objects during repository initialization.
* Avoid unexpectedly mutating caller-owned entities when timestamps are assigned.
* Ensure `nopatch` is honored by `patch()`.
* Apply `fromDB` consistently to all read paths.
* Validate that repositories have at least one primary key when operations require one.
* Make dialect-specific batch behavior explicit instead of using a boolean mode parameter.
* Normalize database errors in adapters.
* Prefer parameter binding for values whenever supported by the database driver.

These changes would improve consistency, maintainability, and portability without changing the core repository architecture.

## Project Structure

```text
src/
├── build.ts
├── metadata.ts
├── repository.ts
└── index.ts
```

### `metadata.ts`

Defines:

* `Attribute`
* `Attributes`
* `Executor`
* `Transaction`
* `DB`
* Other repository-related types

### `build.ts`

Contains SQL-building functions for:

* SELECT
* INSERT
* UPDATE
* DELETE
* Batch operations
* Parameter generation
* Metadata processing

### `repository.ts`

Implements the high-level:

```ts
CRUDRepository<T, ID>
```

API.

### `index.ts`

Exports the public API of the package.

## License

MIT

# search-repository

A lightweight TypeScript search and pagination repository for SQL databases.

`SearchRepository` provides a convenient way to implement common backoffice and administration search screens without writing repetitive SQL for every filter, sort, pagination, and count operation.

The design is intentionally simple:

* Handle the common 80–90% search cases automatically.
* Keep complex SQL under the developer's control.
* Support different database drivers through a small DB abstraction.
* Allow custom `buildQuery` and `buildSort` implementations to be injected into `SearchRepository`.

## Features

* Metadata-driven field and column mapping
* Automatic `WHERE` clause generation
* String, number, date, boolean, and array filters
* `LIKE` / `ILIKE` searches
* Free-text `q` search
* `IN` / `NOT IN` filters
* Numeric and date ranges
* Configurable sorting
* Pagination
* Total-count support
* Driver-specific parameter placeholders
* PostgreSQL, MySQL, SQLite, Oracle, MSSQL, and other database drivers through the `MinDB` interface
* Custom query builder injection
* Custom sort builder injection
* Designed for simple, dynamically filtered SQL queries

## Installation

```bash
npm install search
```

Replace `search` with the actual package name when publishing.

## Basic Usage

Define the database columns with metadata:

```ts
const attrs = {
  id: {
    column: "id",
    key: true,
    type: "number"
  },

  name: {
    column: "name",
    type: "string"
  },

  status: {
    column: "status",
    type: "string"
  },

  age: {
    column: "age",
    type: "number"
  },

  createdAt: {
    column: "created_at",
    type: "date"
  }
}
```

Create a repository:

```ts
const repository = new SearchRepository(db, attrs)
```

Then search using a filter object:

```ts
const result = await repository.search({
  name: "john",
  status: "active",
  age: {
    min: 18,
    max: 60
  }
})
```

The result contains the records and the total number of matching records.

```ts
{
  list: [...],
  total: 42
}
```

## Search Filters

The default query builder is designed for common search forms.

### String

A string filter uses prefix matching by default:

```ts
{
  name: "john"
}
```

Conceptually:

```sql
WHERE name LIKE 'john%'
```

### String operators

String filters can specify an operator:

```ts
{
  name: {
    value: "john",
    operator: "like"
  }
}
```

Supported operators include:

```text
=
!=
<>
like
```

### Number

Number filters can be used directly:

```ts
{
  age: 18
}
```

The default numeric behavior is designed for search screens rather than strict equality filtering.

### Number range

```ts
{
  age: {
    min: 18,
    max: 60
  }
}
```

Conceptually:

```sql
WHERE age >= 18
  AND age <= 60
```

### Date range

```ts
{
  createdAt: {
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-12-31")
  }
}
```

The query builder supports multiple date-range forms for applications that use different naming conventions.

### Array / `IN`

```ts
{
  status: ["active", "pending"]
}
```

Conceptually:

```sql
WHERE status IN (?, ?)
```

### Excluding values

The repository supports excluding records by their primary key:

```ts
repository.search(filter, page, sort, excluding)
```

`excluding` is intended for entities with a **single primary key**.

Composite primary keys are not supported by this feature.

### Free-text search

The `q` filter can search across fields configured as searchable in the metadata:

```ts
{
  q: "john"
}
```

This is useful for a search box that searches several fields at once.

## Sorting

Sorting is metadata-aware and can resolve application field names to database columns.

Example:

```ts
const result = await repository.search(
  filter,
  1,
  "-createdAt,name"
)
```

A sort expression can specify ascending or descending order.

The default `buildSort` function is suitable for normal search screens, while applications with special requirements can provide their own implementation.

## Pagination

For relational databases, pagination normally uses a numeric page:

```ts
await repository.search(filter, 1, "name")
```

The public API accepts:

```ts
page?: number | string
```

This is intentional.

A numeric value represents a normal page number. A string can be used by databases or implementations that use an opaque pagination token instead of a page number.

For example, a Cassandra-based implementation can pass a `nextPageToken` through the same controller-level API.

For relational implementations, a string page value is treated as page 1.

This allows application controllers to use the same search API across different database implementations.

## Database Abstraction

The search package does not depend directly on a particular database client.

The minimal interface is:

```ts
export interface MinDB {
  driver?: string
  param(i: number): string
  query<T>(sql: string, args?: any[]): Promise<T[]>
}
```

A database implementation only needs to provide the required query behavior and parameter syntax.

This allows the same search repository to work with multiple database packages.

For example:

```text
SearchRepository
        |
        +---- PostgreSQL
        |
        +---- MySQL
        |
        +---- MSSQL
        |
        +---- Oracle
        |
        +---- SQLite
        |
        +---- Custom DB
```

The `driver` property allows the search implementation to apply database-specific pagination behavior when necessary.

## `SearchRepository`

`SearchRepository` is intentionally extensible.

Its most important extension points are:

```text
buildQuery
buildSort
```

The default implementations handle common search screens. Developers can replace either one when application-specific behavior is required.

Conceptually:

```text
                 SearchRepository
                        |
             +----------+----------+
             |                     |
         buildQuery            buildSort
             |                     |
        default/custom        default/custom
             |                     |
             +----------+----------+
                        |
                       SQL
                        |
                        DB
```

This means the repository does not force the application to use the default query language.

## Custom `buildQuery`

For complex business requirements, provide your own query builder.

For example:

```ts
const repository = new SearchRepository(
  db,
  attrs,
  customBuildQuery
)
```

A custom query builder is appropriate when the query requires things such as:

* Complex joins
* Subqueries
* CTEs
* Database-specific SQL
* Special business rules
* Advanced aggregation
* Custom `GROUP BY`
* Complex `HAVING`
* Custom expressions

The default `buildQuery` is not intended to be a replacement for handwritten SQL.

The recommended approach is:

```text
Simple search screen
        ↓
Use default buildQuery

Complex query
        ↓
Write the SQL/query builder yourself
        ↓
Inject buildQuery into SearchRepository
```

## Custom `buildSort`

Sorting can also be customized independently.

```ts
const repository = new SearchRepository(
  db,
  attrs,
  buildQuery,
  buildSort
)
```

This is useful when the application needs:

* Database-specific expressions
* Computed columns
* Special ordering rules
* Multi-column business ordering
* Custom default ordering

## Generated SQL

For a simple search:

```ts
{
  name: "john",
  status: ["active", "pending"],
  age: {
    min: 18,
    max: 60
  }
}
```

the query builder can produce SQL conceptually similar to:

```sql
SELECT ...
FROM users
WHERE name LIKE ?
  AND status IN (?, ?)
  AND age >= ?
  AND age <= ?
ORDER BY name
```

Values are passed separately as query parameters rather than being concatenated into SQL.

Parameter placeholders are generated according to the database driver.

For example:

```text
PostgreSQL:
$1, $2, $3

MySQL:
?, ?, ?

MSSQL:
@p1, @p2, @p3
```

## Count and Pagination

The repository also handles obtaining the total number of matching records.

For databases where a separate count query is appropriate, the implementation can execute the data query and count query concurrently.

For databases such as Oracle and MSSQL, the implementation can use a window function such as:

```sql
COUNT(*) OVER()
```

to obtain the total together with the result rows.

The database-specific behavior is hidden behind the repository API.

## Scope

This package intentionally targets **simple SQL queries generated from search forms**.

It is particularly useful for:

* Admin panels
* Backoffice applications
* Management screens
* Data tables
* Filterable lists
* Simple reporting screens
* REST API list endpoints

It is not intended to be a universal SQL query parser.

For complex SQL, the recommended approach is to write the query yourself and inject the corresponding `buildQuery` implementation.

This keeps the default implementation small and predictable while still allowing complete control when needed.

## Metadata

Metadata describes how application fields map to database fields.

A typical definition looks like:

```ts
const attrs = {
  id: {
    column: "id",
    key: true,
    type: "number"
  },

  name: {
    column: "user_name",
    type: "string"
  },

  active: {
    column: "active",
    type: "boolean"
  }
}
```

The metadata can also describe fields used for:

* Primary keys
* Boolean conversion
* Versioning
* Created timestamps
* Updated timestamps
* Searchable fields
* Database column mapping

This allows the same search logic to work with domain-level field names without exposing database naming conventions to callers.

## Design Philosophy

The package follows a simple principle:

> **Make common searches easy, and make complex searches possible.**

The default query builder removes repetitive code for ordinary search forms, while `SearchRepository` provides injection points for developers who need complete control.

This avoids turning the library into a general-purpose SQL parser while still allowing it to support a wide range of real-world applications.

## Limitations

The default builder intentionally focuses on straightforward SQL queries.

Applications should provide their own query builder for complex SQL involving advanced constructs such as:

```text
JOIN-heavy queries
Subqueries
CTEs
GROUP BY
HAVING
UNION
Complex DISTINCT logic
Database-specific expressions
Complex business rules
```

The `excluding` feature is intended for entities with a single primary key. Composite primary keys are not supported by this feature.

## Recommended Usage

For a typical backoffice screen:

```ts
const repository = new SearchRepository(db, attrs)

const result = await repository.search(
  filter,
  page,
  sort
)
```

For a complex screen:

```ts
const repository = new SearchRepository(
  db,
  attrs,
  buildMyCustomQuery,
  buildMyCustomSort
)

const result = await repository.search(
  filter,
  page,
  sort
)
```

This lets the application reuse the repository's pagination, counting, DB abstraction, and result handling without giving up control over SQL generation.

## License

MIT

# sql-core

> **A lightweight SQL persistence framework for TypeScript.**
>
> Inspired by **JDBC** in Java and **database/sql** in Go, **sql-core** provides a common SQL foundation for Node.js applications while remaining completely SQL-first.

---

# Why sql-core?

Java developers have **JDBC**.

Go developers have **database/sql**.

These standard libraries provide a consistent programming model for working with relational databases, regardless of the underlying database vendor.

Node.js, on the other hand, provides excellent database drivers such as:

- mysql2
- pg
- oracledb
- mssql
- sqlite3
- better-sqlite3

Although these drivers are powerful, every project still needs to solve the same problems:

- Mapping database rows to application models
- Building INSERT/UPDATE/DELETE statements
  - Optimistic locking
- Building search queries
  - Paging
  - Sorting
  - Dynamic filtering
- Batch processing
- Streaming processing
- Transactions


As a result, these infrastructure components are implemented repeatedly across projects.

**sql-core** was created to provide this missing SQL foundation while keeping developers in full control of their SQL.

Unlike an ORM, sql-core never attempts to replace SQL.

Instead, it helps you eliminate repetitive infrastructure while continuing to write the SQL you already know.

---

# Philosophy

sql-core follows a few simple principles.

## SQL First

SQL is one of the greatest strengths of relational databases.

Instead of hiding SQL behind another query language, sql-core embraces SQL.

You write SQL.

sql-core automates everything around SQL.

---

## Lightweight Abstraction

sql-core is **not**:

- An ORM
- An Active Record framework
- A Query DSL
- An SQL AST Builder

It is a lightweight persistence framework that sits on top of existing database drivers.

---

## Schema-driven Design

Everything starts from a schema.

A schema defines:

- Database columns
- JSON field names
- Primary keys
- Generated columns
- Version fields
- Ignored fields
- Data conversion

The same schema powers every component in sql-core.

---

# Architecture

```
                          sql-core

        +----------------------+   +--------------------------+
        |   Repository Layer   |   |     Execution Layer      |
        +----------------------+   +--------------------------+
        | Repository           |   | SqlInserter             |
        | Query                |   | SqlUpdater              |
        | SearchRepository     |   | SqlBatchInserter        |
        |                      |   | SqlBatchUpdater         |
        | Features             |   | StreamInserter          |
        | • CRUD               |   | StreamUpdater           |
        | • Search             |   |                         |
        | • CQRS Query         |   | Features                |
        | • Optimistic Locking |   | • Batch Processing      |
        | • buildQuery()       |   | • Streaming Processing  |
        | • buildSort()        |   |                         |
        +-----------+----------+   +------------+------------+
                    |                           |
                    +-------------+-------------+
                                  |
                                  v
              +--------------------------------------------+
              |             Foundation Layer               |
              +--------------------------------------------+
              | SQL Builders                              |
              |  • buildToInsert()                        |
              |  • buildToUpdate()                        |
              |  • buildToDelete()                        |
              |                                           |
              | Search Builders                           |
              |  • buildQuery()                           |
              |  • buildSort()                            |
              |  • buildPagingQuery()                     |
              |  • buildCountQuery()                      |
              |                                           |
              | Schema-based Mapping                      |
              |  • Row → JSON Model                       |
              |  • JSON Model → SQL Parameters            |
              |  • Column ↔ Property Mapping              |
              +--------------------------------------------+
```

The architecture consists of three major parts.

- **Foundation Layer** provides SQL generation and object mapping.
- **Repository Layer** provides a productive programming model for business applications.
- **Execution Layer** provides high-performance components for batch and streaming data processing.

---

# Foundation Layer

The Foundation Layer is the heart of sql-core.

Everything is driven by a single schema definition.

From one schema, sql-core automatically provides:

- SQL generation
- Object mapping
- CRUD support
- Search support
- Parameter binding
- Optimistic locking

This allows every higher-level component to share the same metadata and behavior.

---

# Generate SQL from Schemas

One of the primary responsibilities of sql-core is generating parameterized SQL statements directly from schemas.

Instead of manually concatenating SQL strings throughout your application, sql-core provides reusable SQL builders.

## CRUD Builders

Generate SQL for data modification.

- `buildToInsert()`
- `buildToUpdate()`
- `buildToDelete()`

These builders automatically respect:

- Primary keys
- Generated fields
- Ignored fields
- Version fields
- Column mappings

The generated SQL is database-neutral and can be executed using any supported SQL provider.

---

## Search Builders

Search SQL is also composed from reusable builders.

- `buildQuery()`: build dynamic search query based on filter and Attributes
- `buildSort()`
- `buildPagingQuery()`
- `buildCountQuery()`

Each builder has a single responsibility.

### buildQuery()

Builds the base SELECT statement.

Typical customizations include:

- JOINs
- WHERE clauses
- Security filters
- Multi-tenant filters
- Database-specific SQL

### buildSort()

Generates the ORDER BY clause.

Typical customizations include:

- Joined columns
- Computed columns
- Ranking expressions
- Default ordering
- Database-specific ordering

### buildPagingQuery()

Applies database-specific paging strategies.

For example:

- LIMIT/OFFSET
- Oracle paging
- SQL Server paging

### buildCountQuery()

Generates the COUNT query used for paged search results.

By separating these responsibilities, sql-core keeps the search pipeline highly extensible while avoiding large monolithic query builders.

---

# High-performance Data Processing

For data-intensive workloads, sql-core provides execution components that work directly with generated SQL.

These components are optimized for:

- Batch processing
- Data synchronization
- Import/Export
- ETL
- Scheduled jobs
- Data migration

## SqlInserter

Efficient single-row insertion.

## SqlUpdater

Efficient single-row updates.

## SqlBatchInserter

Optimized batch insertion.

Ideal for importing thousands or millions of records.

## SqlBatchUpdater

Optimized batch updates.

Useful for synchronization and large maintenance jobs.

## StreamInserter

Processes large input streams without loading all data into memory.

Perfect for:

- CSV import
- Excel import
- JSON stream import

## StreamUpdater

Processes update streams efficiently while maintaining a low memory footprint.

---

# Transactions

sql-core supports transaction-aware execution.

Repositories and execution components can participate in the same transaction.

This allows multiple operations to be committed or rolled back together while keeping transaction management independent from business logic.

---

# Flexible Search Framework

Building search APIs is one of the most repetitive tasks in enterprise applications.

SearchRepository provides a reusable search framework supporting:

- Dynamic filtering
- Paging
- Sorting
- Total count
- Schema-based mapping

Instead of writing the same search implementation repeatedly, applications only define the business-specific query while sql-core handles the infrastructure.

One of the key design goals is extensibility.

Applications can inject custom implementations of:

- `buildQuery()`
- `buildSort()`

without modifying SearchRepository itself.

This keeps filtering and sorting independent while making the search pipeline highly customizable.

This design is particularly useful for:

- Back-office systems
- Administrative portals
- Enterprise applications
- Reporting systems

---

# Optimistic Locking

sql-core supports optimistic locking using version fields defined in the schema.

Instead of locking rows, updates verify that the record has not been modified by another transaction.

Benefits include:

- Preventing lost updates
- Better scalability
- No pessimistic database locks
- Enterprise-ready concurrency control

Optimistic locking is automatically integrated into CRUD operations generated from schemas.

---

# Coming Next

The next section of this README introduces the **Repository Layer**, including:

- Repository
- CRUD Repository
- Query (CQRS)
- SearchRepository
- Schema-based mapping
- Database row to JSON model conversion
- Repository examples







# Repository Layer

The Repository Layer provides a productive programming model for business applications.

While the **Execution Layer** is optimized for high-volume data processing, the Repository Layer is designed for request/response applications such as:

- REST APIs
- GraphQL APIs
- Microservices
- Server-side rendered applications
- Administrative portals
- Enterprise systems

Rather than focusing on SQL execution, repositories focus on working with domain models.

---

# Repository Components

The Repository Layer consists of four major components.

```
Repository Layer

├── Repository
├── CRUD Repository
├── Query (CQRS)
└── SearchRepository
```

Although each component serves a different purpose, they all share the same schema metadata, SQL builders, and mapping engine provided by the Foundation Layer.

---

# Schema-based Mapping

One of the most important responsibilities of the Repository Layer is converting database rows into application models.

For example:

```text
Database

+------------+------------+------------+
| USER_ID    | FIRST_NAME | LAST_NAME  |
+------------+------------+------------+

                │
                ▼

             Schema

                │
                ▼

        Application Model

{
    id: "...",
    firstName: "...",
    lastName: "..."
}
```

Applications work with clean JSON models while sql-core performs the mapping automatically.

The mapping engine supports:

- Different database column names
- Different JSON property names
- Generated fields
- Ignored fields
- Type conversion

The same schema is also used by SQL builders, ensuring SQL generation and object mapping always remain consistent.

---

# Repository

`Repository` provides common database operations shared by higher-level repositories.

Typical responsibilities include:

- Loading records
- Executing SQL
- Mapping rows
- Handling transactions
- Returning application models

It serves as the base abstraction for repository implementations.

---

# CRUD Repository

`CRUDRepository` provides standard Create, Read, Update and Delete operations generated from schemas.

Instead of repeatedly implementing CRUD logic for every table, applications only define the schema.

Typical operations include:

- Insert
- Update
- Save
- Delete
- Load by primary key
- Check existence

Because SQL is generated from the schema, CRUD repositories remain concise while preserving full control over SQL execution.

---

# Optimistic Locking

CRUDRepository fully supports optimistic locking.

When a schema defines a version field, sql-core automatically generates update statements that verify the current version before modifying data.

For example:

```sql
UPDATE users
SET
    name = ?,
    version = version + 1
WHERE
    id = ?
AND version = ?
```

If another transaction has already updated the record, the update affects zero rows, allowing the application to detect concurrent modifications.

This prevents lost updates without requiring pessimistic database locks.

---

# Query (CQRS)

Not every read operation requires a repository.

For read-only use cases, sql-core provides lightweight `Query` components.

```
Controller
    │
    ▼
  Query
    │
    ▼
 Database
```

This follows the **CQRS** (Command Query Responsibility Segregation) principle, where read models remain independent from write models.

Typical use cases include:

- Lookup APIs
- Reference data
- Dashboards
- Reports
- Read-only services

Since Query components only read data, they remain simple and focused.

---

# SearchRepository

Building search APIs is one of the most repetitive tasks in enterprise applications.

Almost every system contains endpoints like:

```text
GET /users
GET /customers
GET /products
GET /employees
GET /orders
```

Each endpoint usually implements the same infrastructure:

- Filtering
- Paging
- Sorting
- Total count
- Row mapping

SearchRepository provides a reusable implementation for these common requirements.

Applications only define the business-specific query.

---

# Automatic Dynamic Filtering

SearchRepository can automatically generate filtering conditions from schemas.

Instead of writing repetitive code such as:

```typescript
if (filter.name) {
    ...
}

if (filter.status) {
    ...
}

if (filter.department) {
    ...
}
```

SearchRepository can generate dynamic search conditions automatically based on the schema definition.

This significantly reduces boilerplate for administrative systems and enterprise back-office applications.

---

# Flexible Query Pipeline

One of the key design goals of SearchRepository is extensibility.

Instead of hardcoding SQL generation, SearchRepository allows applications to inject custom SQL builders.

## buildQuery()

Applications can customize the base query.

Typical scenarios include:

- JOIN multiple tables
- Security filtering
- Tenant isolation
- Database-specific SQL
- Additional WHERE conditions
- Computed columns

The repository remains generic while applications define business-specific SQL.

---

## buildSort()

Sorting is independent from filtering.

Applications can inject custom sorting logic without changing the query builder.

Typical use cases include:

- Sort by joined tables
- Computed fields
- Ranking expressions
- Default ordering
- Database-specific ORDER BY syntax

Keeping sorting independent makes SearchRepository easier to customize and maintain.

---

# Paging

SearchRepository includes built-in paging support.

Database-specific paging is delegated to the SQL builders provided by the Foundation Layer.

Examples include:

- LIMIT/OFFSET
- Oracle paging
- SQL Server paging

Applications work with a consistent API regardless of the underlying database.

---

# Total Count

Paged search usually requires two queries:

1. Retrieve the current page
2. Retrieve the total number of matching records

SearchRepository automatically supports both operations.

The total count query is generated independently through `buildCountQuery()`, allowing applications to optimize count queries when necessary.

---

# Search Pipeline

The following diagram illustrates how SearchRepository builds a complete search request.

```text
 Search Request
        │
        ▼
  Filter Model
        │
        ▼
  buildQuery()
        │
        ▼
  buildSort()
        │
        ▼
buildPagingQuery()
        │
        ▼
   Execute SQL
        │
        ▼
   Row Mapping
        │
        ▼
  Search Result
```

Each step has a single responsibility, making the search pipeline easy to understand, customize and extend.

---

# Why Repository Layer?

The Repository Layer eliminates repetitive infrastructure while allowing developers to continue writing SQL.

It combines:

- Schema-driven mapping
- CRUD repositories
- CQRS queries
- Dynamic search
- Paging
- Sorting
- Optimistic locking
- Transaction support

without introducing an ORM or hiding SQL.

Applications remain SQL-first while benefiting from reusable persistence infrastructure.

---

# Coming Next

The next section covers practical examples, including:

- Defining schemas
- CRUD repositories
- Query examples
- SearchRepository examples
- Batch processing
- Transactions
- Integrating with database providers




# Examples

The following examples demonstrate how sql-core can be used in real-world applications.

---

# Define a Schema

Everything in sql-core starts with a schema.

A schema defines how a database table maps to an application model.

```typescript
const UserSchema = [
    // schema definition
];
```

The same schema is reused by:

- SQL Builders
- CRUD Repository
- SearchRepository
- Batch Processing
- Object Mapping
- Optimistic Locking

Define it once and reuse it everywhere.

---

# CRUD Repository

Create a repository with minimal code.

```typescript
class UserRepository extends Repository<User, string> {

    constructor(database: Database) {
        super(database, UserSchema, "users");
    }

}
```

CRUD operations become immediately available.

```typescript
await repository.insert(user);

await repository.update(user);

await repository.delete(id);

const user = await repository.load(id);
```

No repetitive SQL generation is required.

---

# CQRS Query

Simple read models can use Query directly.

```typescript
class UserQuery {

    async load(id: string): Promise<User> {

        return ...

    }

}
```

Typical use cases include:

- Lookup APIs
- Reports
- Dashboards
- Reference Data

---

# SearchRepository

SearchRepository eliminates repetitive search infrastructure.

```typescript
class UserSearchRepository extends SearchRepository<UserFilter, User> {

}
```

Clients automatically gain support for:

- Filtering
- Paging
- Sorting
- Total Count

---

## Custom Query

Applications can inject custom query builders.

```typescript
const repository = new SearchRepository({

    buildQuery(filter) {

        ...

    }

});
```

Typical customizations include:

- JOINs
- Security
- Tenant Filtering
- Complex WHERE clauses

---

## Custom Sorting

Sorting is independent.

```typescript
const repository = new SearchRepository({

    buildSort(sort) {

        ...

    }

});
```

Examples include:

- Joined columns
- Ranking
- Computed fields
- Default ordering

---

# Batch Processing

Import large datasets efficiently.

```typescript
const inserter = new SqlBatchInserter(...);

await inserter.write(records);
```

---

# Stream Processing

Process millions of records without loading everything into memory.

```typescript
const stream = new StreamInserter(...);

await stream.process(input);
```

Ideal for:

- CSV import
- Excel import
- ETL
- Data synchronization

---

# Transactions

Repositories and execution components can participate in the same transaction.

```typescript
await transaction.begin();

await repository.insert(...);

await batchUpdater.execute(...);

await transaction.commit();
```

---

# Optimistic Locking

Version fields are handled automatically.

Applications simply update their models.

sql-core generates SQL that verifies the current version before updating.

---

# Supported Databases

sql-core is database independent.

It can work with relational databases including:

- MySQL
- PostgreSQL
- SQL Server
- Oracle
- SQLite

Provider-specific libraries only need to implement a thin adapter.

---

# Ecosystem

sql-core is the foundation of a larger TypeScript ecosystem.

## Database Providers

Database-specific providers implement a thin abstraction layer while reusing the same repository and SQL infrastructure.

Examples include:

- mysql2-core
- PostgreSQL provider
- SQL Server provider
- Oracle provider
- SQLite provider

---

## Companion Libraries

sql-core integrates naturally with other libraries in the ecosystem.

| Library | Purpose |
|---------|---------|
| mysql2-core | MySQL database provider |
| validation-core | Validation framework |
| reflect-core | Reflection utilities |
| config-plus | Configuration management |
| io-one | File import/export and streaming |
| authentication libraries | Authentication and authorization |

Together these libraries provide a lightweight enterprise application stack for TypeScript.

---

# Why sql-core?

Most persistence libraries focus on one problem.

sql-core combines several capabilities into a single lightweight framework.

## SQL First

Continue writing SQL.

No query DSL.

No SQL AST.

No hidden SQL generation.

---

## Lightweight

Works on top of existing database drivers.

No heavyweight ORM.

---

## Schema-driven

One schema powers:

- SQL Builders
- Mapping
- CRUD
- Search
- Batch Processing
- Optimistic Locking

---

## Enterprise Ready

Designed for applications that require:

- Large CRUD APIs
- Administrative systems
- Back-office applications
- Reporting
- Data synchronization
- Batch processing
- ETL

---

## Flexible Search

SearchRepository supports:

- Dynamic filtering
- Paging
- Sorting
- Total count
- Injected query builders
- Injected sort builders

Applications define business logic while sql-core provides the infrastructure.

---

## High Performance

The Execution Layer provides optimized components for:

- Batch insert
- Batch update
- Stream insert
- Stream update

Large datasets can be processed efficiently without sacrificing memory usage.

---

## Database Independent

Applications remain portable across relational databases.

Only a thin provider implementation is database-specific.

---

## Designed for Productivity

Instead of repeatedly implementing infrastructure, developers can focus on business logic.

sql-core removes boilerplate while keeping SQL readable and maintainable.

---

# Feature Summary

| Feature | Supported |
|----------|-----------|
| SQL-first | ✅ |
| Schema-driven Mapping | ✅ |
| CRUD Repository | ✅ |
| CQRS Query | ✅ |
| SearchRepository | ✅ |
| Dynamic Search | ✅ |
| Paging | ✅ |
| Sorting | ✅ |
| SQL Builders | ✅ |
| Batch Processing | ✅ |
| Stream Processing | ✅ |
| Transactions | ✅ |
| Optimistic Locking | ✅ |
| Database Independent | ✅ |

---

# Roadmap

The long-term vision of sql-core is to become a common SQL foundation for TypeScript applications, similar to the role that JDBC plays in Java and `database/sql` plays in Go.

Future development will continue to focus on:

- Supporting additional SQL providers
- Performance improvements
- Better developer experience
- Enhanced search capabilities
- Additional batch processing utilities
- Improved streaming support
- More sample applications
- Comprehensive documentation

The framework will continue to follow its core principles:

- SQL First
- Lightweight
- Schema-driven
- Database Independent

---

# Contributing

Contributions are welcome.

You can contribute by:

- Reporting bugs
- Suggesting new features
- Improving documentation
- Submitting pull requests
- Creating sample applications

Before submitting a pull request, please ensure:

- Existing tests continue to pass.
- New features include appropriate tests.
- Documentation is updated when necessary.

---

# License

MIT License.

---

# Final Thoughts

sql-core is not designed to replace SQL.

It is designed to make SQL development more productive.

By combining schema-driven SQL generation, object mapping, repositories, search, transactions, optimistic locking, and high-performance batch processing, sql-core provides a lightweight persistence foundation for modern TypeScript applications.

If you enjoy writing SQL and want reusable infrastructure without the complexity of a traditional ORM, sql-core is designed for you.