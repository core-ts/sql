# sql-core

A lightweight, metadata-driven SQL repository library for TypeScript.

Unlike traditional ORMs, SQL Repository focuses on **building SQL** while keeping developers in full control of SQL execution, transactions, and database connections.

The library provides a generic Repository pattern, dynamic SQL generation, CRUD operations, search, pagination, optimistic locking, and multi-database support—all without decorators, code generation, or runtime reflection.

---

## Philosophy

Most ORMs attempt to abstract SQL away from developers.

SQL Repository takes a different approach:

- SQL is explicit.
- SQL is predictable.
- SQL is easy to debug.
- SQL generation is automated.
- Database execution remains under your control.

Think of it as a lightweight layer between your domain model and your SQL database.

```
Application
     │
     ▼
Repository
     │
     ▼
SQL AST (Future)
     │
     ▼
SQL Compiler
     │
     ▼
SQL + Parameters
     │
     ▼
Database Driver
```

---

# Features

- Generic Repository Pattern
- Metadata-driven mapping
- Dynamic SQL generation
- CRUD operations
- Search builder
- Pagination
- Sorting
- Batch Insert
- Batch Update
- Optimistic Locking
- Composite Primary Keys
- Transaction support
- Multiple SQL dialects
- Zero ORM dependencies
- TypeScript Generics
- SQL-first architecture

---

# Supported Databases

The library is database-independent.

Current supported dialects:

- PostgreSQL
- MySQL
- SQL Server
- Oracle
- SQLite

Adding a new database typically requires implementing only a parameter formatter and an executor.

---

# Why SQL Repository?

Most existing solutions fall into one of these categories:

| Library | Style |
|---------|-------|
| Prisma | Schema-first ORM |
| TypeORM | Full ORM |
| Sequelize | Active Record |
| Knex | SQL Builder |
| Drizzle | Typed SQL Builder |

SQL Repository focuses on a different philosophy:

- Generic Repository
- Metadata Mapping
- SQL Generation
- Driver Independence

without becoming a full ORM.

---

# Architecture

```
                  Application
                       │
                       ▼
                Repository Layer
                       │
                       ▼
                  SQL Builder
                       │
                       ▼
              Metadata Definition
                       │
                       ▼
                 SQL Compiler
                       │
                       ▼
                 Database Executor
                       │
                       ▼
                 Database Driver
```

---

# Installation

```bash
npm install sql-repository
```

or

```bash
yarn add sql-repository
```

---

# Metadata

Entities are described using metadata rather than decorators.

```ts
const UserAttributes = {
    id: {
        key: true
    },

    username: {
        q: true
    },

    email: {
        q: true
    },

    age: {
        type: "number"
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

Metadata defines:

- database column
- primary key
- searchable field
- insert/update behavior
- optimistic locking
- timestamps
- ignored fields

---

# Database Adapter

The library depends only on a small database abstraction.

```ts
export interface Executor {
    driver: string
    param(index: number): strin
    query<T>(sql: string, params?: unknown[]): Promise<T[]>
    execute(sql: string, params?: unknown[]): Promise<number>
}
```

Because of this abstraction, SQL Repository works with almost any SQL driver.

---

# Repository

```ts
const repository = new SqlRepository<User, number, UserFilter>(db, "users", UserAttributes)
```

Available operations:

```ts
repository.create(user)

repository.update(user)

repository.delete(id)

repository.load(id)

repository.exist(id)

repository.search(filter)

repository.all()
```

---

# Search

Simply pass a filter object.

```ts
const filter = {
    username: "john",
    age: 18,
    sort: "-createdAt"
}
```

Automatically generates SQL similar to

```sql
SELECT *
FROM users
WHERE
    username LIKE ?
AND
    age >= ?
ORDER BY created_at DESC
```

---

# Full-text Search

Mark searchable columns.

```ts
username: {
    q: true
}

email: {
    q: true
}
```

Search

```ts
{
    q: "john"
}
```

Generates

```sql
WHERE
(
    username LIKE ?
 OR email LIKE ?
)
```

---

# Pagination

```ts
repository.search(filter, 20, 1)
```

Generates

```sql
LIMIT 20 OFFSET 0
```

Oracle paging is also supported.

---

# Sorting

Ascending

```
sort=name
```

Descending

```
sort=-createdAt
```

Multiple fields

```
sort=-createdAt,name
```

---

# Batch Insert

```ts
await SqlBatchInserter.write(users)
```

or

```ts
buildToInsertBatch(...)
```

---

# Batch Update

```ts
await SqlBatchUpdater.write(users)
```

---

# Optimistic Locking

Simply mark a version field.

```ts
version: {
    version: true
}
```

Generated SQL

```sql
UPDATE users
SET version = version + 1
WHERE
    id = ?
AND
    version = ?
```

---

# Transactions

Repositories optionally accept transactions.

```ts
const tx = await db.beginTransaction()

await repository.create(user, tx)

await repository.update(user, tx)

await tx.commit()
```

---

# SQL Builders

The library exposes reusable SQL builders.

```ts
buildToInsert()

buildToUpdate()

buildToDelete()

buildQuery()

buildSort()

buildPagingQuery()

buildCountQuery()
```

Each builder returns

```ts
{
    query: "...",
    params: [...]
}
```

The library never executes SQL automatically.

---

# Parameter Styles

| Database | Parameter |
|-----------|-----------|
| MySQL | `?` |
| PostgreSQL | `$1` |
| SQL Server | `@1` |
| Oracle | `:1` |

---

# Repository Classes

| Class | Responsibility |
|---------|---------------|
| SqlLoader | Read operations |
| SqlWriter | Write operations |
| CRUDRepository | Generic CRUD |
| SqlRepository | CRUD + Search |
| QueryRepository | Custom queries |
| SearchBuilder | Dynamic Search |
| SqlInserter | Insert helper |
| SqlUpdater | Update helper |
| SqlBatchInserter | Batch insert |
| SqlBatchUpdater | Batch update |

---

# Future Roadmap

Future versions will introduce a SQL Abstract Syntax Tree (AST).

```
Repository

        │

        ▼

     SQL AST

        │

        ▼

   SQL Compiler

        │

        ▼

SQL + Parameters
```

Benefits include:

- JOIN support
- EXISTS
- UNION
- GROUP BY
- HAVING
- Common Table Expressions (CTE)
- Window Functions
- Nested Subqueries
- SQL Optimization
- Visitor Pattern
- Dialect-specific SQL compilation

while preserving the current Repository API.

---

# Design Goals

- Lightweight
- Predictable SQL
- SQL-first
- Generic
- Type-safe
- Driver-independent
- High performance
- Easy to debug
- Easy to extend
- Framework agnostic

---

# Comparison

| Feature | SQL Repository | TypeORM | Prisma | Knex |
|----------|---------------|----------|---------|-------|
| Generic Repository | ✅ | ✅ | ❌ | ❌ |
| Metadata Mapping | ✅ | ✅ | Schema | ❌ |
| SQL Generation | ✅ | Partial | ❌ | ✅ |
| Multi Database | ✅ | ✅ | Partial | ✅ |
| Optimistic Locking | ✅ | ✅ | Limited | Manual |
| Lightweight | ✅ | ❌ | ❌ | ✅ |
| Driver Independent | ✅ | ❌ | ❌ | ✅ |

---

# When Should I Use SQL Repository?

SQL Repository is a good choice if you:

- Prefer writing SQL instead of using a full ORM.
- Want generic repositories.
- Need support for multiple SQL databases.
- Want predictable SQL generation.
- Need complete control over transactions.
- Care about performance.
- Want minimal runtime dependencies.

---
