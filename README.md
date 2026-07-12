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