import { attributes, buildToDelete, buildToInsert, buildToUpdate, exist, buildMetadata, select } from "./build"
import { Attribute, Attributes, Executor, MinDB, Statement, StringMap, Transaction } from "./metadata"
import { LikeType } from "./query"
import { SearchBuilder } from "./SearchBuilder"

export interface Filter {
  fields?: string[]
  sort?: string
  q?: string
}
export type Load<T, ID> = (id: ID, ctx?: any) => Promise<T | null>
export type Get<T, ID> = Load<T, ID>
export function useGet<T, ID>(
  db: Executor,
  table: string,
  attrs: Attributes | string[],
  fromDB?: (v: T) => T,
): Load<T, ID> {
  const l = new SqlLoader<T, ID>(db, table, attrs, fromDB)
  return l.load
}
export const useLoad = useGet
export class SqlLoader<T, ID> {
  primaryKeys: Attribute[]
  map?: StringMap
  attributes: Attributes
  bools?: Attribute[]
  constructor(
    protected db: Executor,
    protected table: string,
    attrs: Attributes | string[],
    protected fromDB?: (v: T) => T,
  ) {
    if (Array.isArray(attrs)) {
      this.primaryKeys = attributes(attrs)
      this.attributes = {} as any
    } else {
      const m = buildMetadata(attrs)
      this.attributes = attrs
      this.primaryKeys = m.keys
      this.map = m.map
      this.bools = m.bools
    }
    if (this.metadata) {
      this.metadata = this.metadata.bind(this)
    }
    this.all = this.all.bind(this)
    this.load = this.load.bind(this)
    this.exist = this.exist.bind(this)
  }
  metadata?(): Attributes | undefined {
    return this.attributes
  }
  all(tx?: Transaction): Promise<T[]> {
    const sql = `select * from ${this.table}`
    const db = tx ? tx: this.db
    return db.query(sql, [], this.map, this.bools)
  }
  load(id: ID, tx?: Transaction): Promise<T | null> {
    const stmt = select<ID>(id, this.table, this.primaryKeys, this.db.param)
    if (!stmt.query) {
      throw new Error("cannot build query by id")
    }
    const db = tx ? tx: this.db
    const fn = this.fromDB
    if (fn) {
      return db.query<T>(stmt.query, stmt.params, this.map, this.bools).then((res) => {
        if (!res || res.length === 0) {
          return null
        } else {
          const obj = res[0]
          return fn(obj)
        }
      })
    } else {
      return db.query<T>(stmt.query, stmt.params, this.map, this.bools).then((res) => (!res || res.length === 0 ? null : res[0]))
    }
  }
  exist(id: ID, tx?: Transaction): Promise<boolean> {
    const field = this.primaryKeys[0].column ? this.primaryKeys[0].column : this.primaryKeys[0].name
    const stmt = exist<ID>(id, this.table, this.primaryKeys, this.db.param, field)
    if (!stmt.query) {
      throw new Error("cannot build query by id")
    }
    const db = tx ? tx: this.db
    return db.query(stmt.query, stmt.params, undefined, undefined).then((res) => (!res || res.length === 0 ? false : true))
  }
}
export const SqlViewRepository = SqlLoader
export const SqlLoadService = SqlLoader
export const SqlViewServic = SqlLoader

// tslint:disable-next-line:max-classes-per-file
export class QueryRepository<T, ID> {
  constructor(protected db: Executor, protected table: string, protected attrs: Attributes, protected sort?: string, id?: string) {
    this.id = id && id.length > 0 ? id : "id"
    this.query = this.query.bind(this)
    const m = buildMetadata(attrs)
    this.map = m.map
    this.bools = m.bools
  }
  id: string
  map?: StringMap
  bools?: Attribute[]
  query(ids: ID[], tx?: Transaction): Promise<T[]> {
    if (!ids || ids.length === 0) {
      return Promise.resolve([])
    }
    const ps: string[] = []
    const length = ids.length
    for (let i = 1; i <= length; i++) {
      ps.push(this.db.param(i))
    }
    let sql = `select * from ${this.table} where ${this.id} in (${ps.join(",")})`
    if (this.sort && this.sort.length > 0) {
      sql = sql + " order by " + this.sort
    }
    const db = tx ? tx: this.db
    return db.query<T>(sql, ids, this.map, this.bools)
  }
}

// tslint:disable-next-line:max-classes-per-file
export class SqlWriter<T> {
  protected primaryKeys: Attribute[]
  protected map?: StringMap
  protected bools?: Attribute[]
  protected version?: string
  protected createdAt?: string
  protected updatedAt?: string
  
  constructor(protected db: Executor, protected table: string, protected attributes: Attributes, protected toDB?: (v: T) => T) {
    const x = buildMetadata(attributes)
    this.primaryKeys = x.keys
    this.map = x.map
    this.bools = x.bools
    this.version = x.version
    this.createdAt = x.createdAt
    this.updatedAt = x.updatedAt
    this.create = this.create.bind(this)
    this.update = this.update.bind(this)
    this.patch = this.patch.bind(this)
  }
  create(obj: T, tx?: Transaction): Promise<number> {
    let obj2: any = obj
    if (this.toDB) {
      obj2 = this.toDB(obj)
    }
    if (this.createdAt) {
      obj2[this.createdAt] = new Date()
    }
    if (this.updatedAt) {
      obj2[this.updatedAt] = new Date()
    }
    const stmt = buildToInsert(obj2, this.table, this.attributes, this.db.param, this.version)
    if (stmt.query) {
      const db = tx ? tx: this.db
      return db.execute(stmt.query, stmt.params).catch((err) => {
        if (err && err.error === "duplicate") {
          return 0
        } else {
          throw err
        }
      })
    } else {
      return Promise.resolve(-1)
    }
  }
  update(obj: T, tx?: Transaction): Promise<number> {
    let obj2: any = obj
    if (this.toDB) {
      obj2 = this.toDB(obj)
    }
    if (this.updatedAt) {
      obj2[this.updatedAt] = new Date()
    }
    const stmt = buildToUpdate(obj2, this.table, this.attributes, this.db.param, this.version)
    if (stmt.query) {
      const db = tx ? tx: this.db
      return db.execute(stmt.query, stmt.params)
    } else {
      return Promise.resolve(-1)
    }
  }
  patch(obj: Partial<T>, tx?: Transaction): Promise<number> {
    return this.update(obj as any, tx)
  }
}
export class CRUDRepository<T, ID> extends SqlWriter<T> {
  constructor(db: Executor, table: string, attributes: Attributes, toDB?: (v: T) => T, protected fromDB?: (v: T) => T) {
    super(db, table, attributes, toDB)
    this.metadata = this.metadata.bind(this)
    this.all = this.all.bind(this)
    this.load = this.load.bind(this)
    this.exist = this.exist.bind(this)
    this.delete = this.delete.bind(this)
  }
  metadata(): Attributes {
    return this.attributes
  }
  all(tx?: Transaction): Promise<T[]> {
    const sql = `select * from ${this.table}`
    const db = tx ? tx: this.db
    return db.query(sql, [], this.map, this.bools)
  }
  load(id: ID, tx?: Transaction): Promise<T | null> {
    const stmt = select<ID>(id, this.table, this.primaryKeys, this.db.param)
    if (!stmt.query) {
      throw new Error("cannot build query by id")
    }
    const fn = this.fromDB
    const db = tx ? tx: this.db
    if (fn) {
      return db.query<T>(stmt.query, stmt.params, this.map, this.bools).then((res) => {
        if (!res || res.length === 0) {
          return null
        } else {
          const obj = res[0]
          return fn(obj)
        }
      })
    } else {
      return db.query<T>(stmt.query, stmt.params, this.map, this.bools).then((res) => (!res || res.length === 0 ? null : res[0]))
    }
  }
  exist(id: ID, tx?: Transaction): Promise<boolean> {
    const field = this.primaryKeys[0].column ? this.primaryKeys[0].column : this.primaryKeys[0].name
    const stmt = exist<ID>(id, this.table, this.primaryKeys, this.db.param, field)
    if (!stmt.query) {
      throw new Error("cannot build query by id")
    }
    const db = tx ? tx: this.db
    return db.query(stmt.query, stmt.params).then((res) => (!res || res.length === 0 ? false : true))
  }
  delete(id: ID, tx?: Transaction): Promise<number> {
    const stmt = buildToDelete<ID>(id, this.table, this.primaryKeys, this.db.param)
    if (stmt.query) {
      const db = tx ? tx: this.db
      return db.execute(stmt.query, stmt.params)
    } else {
      throw new Error("cannot build delete query by id")
    }
  }
}
export const GenericRepository = CRUDRepository
export const SqlGenericRepository = CRUDRepository

export class SqlSearchWriter<T, S> extends SearchBuilder<T, S> {
  constructor(
    protected db: Executor,
    table: string,
    protected attributes: Attributes,
    buildQ?: (
      s: S,
      param: (i: number) => string,
      sort?: string,
      buildSort3?: (sort?: string, map?: Attributes | StringMap) => string,
      attrs?: Attributes,
      table?: string,
      fields?: string[],
      sq?: string,
      strExcluding?: string,
      likeType?: LikeType
    ) => Statement | undefined,
    protected toDB?: (v: T) => T,
    fromDB?: (v: T) => T,
    sort?: string,
    q?: string,
    excluding?: string,
    buildSort?: (sort?: string, map?: Attributes | StringMap) => string,
    total?: string,
  ) {
    super(db, table, attributes, buildQ, fromDB, sort, q, excluding, buildSort, total)
    const x = buildMetadata(attributes)
    if (x) {
      this.version = x.version
    }
    this.create = this.create.bind(this)
    this.update = this.update.bind(this)
    this.patch = this.patch.bind(this)
  }
  create(obj: T, tx?: Transaction): Promise<number> {
    let obj2: any = obj
    if (this.toDB) {
      obj2 = this.toDB(obj)
    }
    if (this.createdAt) {
      obj2[this.createdAt] = new Date()
    }
    if (this.updatedAt) {
      obj2[this.updatedAt] = new Date()
    }
    const stmt = buildToInsert(obj2, this.table, this.attributes, this.db.param, this.version)
    if (stmt.query) {
      const db = tx ? tx: this.db
      return db.execute(stmt.query, stmt.params).catch((err) => {
        if (err && err.error === "duplicate") {
          return 0
        } else {
          throw err
        }
      })
    } else {
      return Promise.resolve(-1)
    }
  }
  update(obj: T, tx?: Transaction): Promise<number> {
    let obj2: any = obj
    if (this.toDB) {
      obj2 = this.toDB(obj)
    }
    if (this.updatedAt) {
      obj2[this.updatedAt] = new Date()
    }
    const stmt = buildToUpdate(obj2, this.table, this.attributes, this.db.param, this.version)
    if (stmt.query) {
      const db = tx ? tx: this.db
      return db.execute(stmt.query, stmt.params)
    } else {
      return Promise.resolve(-1)
    }
  }
  patch(obj: Partial<T>, tx?: Transaction): Promise<number> {
    return this.update(obj as any, tx)
  }
}
// tslint:disable-next-line:max-classes-per-file
export class SqlRepository<T, ID, S> extends SqlSearchWriter<T, S> {
  constructor(
    db: Executor,
    table: string,
    protected attributes: Attributes,
    buildQ?: (
      s: S,
      param: (i: number) => string,
      sort?: string,
      buildSort3?: (sort?: string, map?: Attributes | StringMap) => string,
      attrs?: Attributes,
      table?: string,
      fields?: string[],
      sq?: string,
      strExcluding?: string,
      likeType?: LikeType
    ) => Statement | undefined,
    protected toDB?: (v: T) => T,
    fromDB?: (v: T) => T,
    sort?: string,
    q?: string,
    excluding?: string,
    buildSort?: (sort?: string, map?: Attributes | StringMap) => string,
    total?: string,
  ) {
    super(db, table, attributes, buildQ, toDB, fromDB, sort, q, excluding, buildSort, total)
    this.metadata = this.metadata.bind(this)
    this.all = this.all.bind(this)
    this.load = this.load.bind(this)
    this.exist = this.exist.bind(this)
    this.delete = this.delete.bind(this)
  }
  metadata(): Attributes {
    return this.attributes
  }
  all(tx?: Transaction): Promise<T[]> {
    const sql = `select * from ${this.table}`
    const db = tx ? tx: this.db
    return db.query(sql, [], this.map, this.bools)
  }
  load(id: ID, tx?: Transaction): Promise<T | null> {
    const stmt = select<ID>(id, this.table, this.primaryKeys, this.db.param)
    if (!stmt.query) {
      throw new Error("cannot build query by id")
    }
    const fn = this.fromDB
    const db = tx ? tx: this.db
    if (fn) {
      return db.query<T>(stmt.query, stmt.params, this.map, this.bools).then((res) => {
        if (!res || res.length === 0) {
          return null
        } else {
          const obj = res[0]
          return fn(obj)
        }
      })
    } else {
      return db.query<T>(stmt.query, stmt.params, this.map, this.bools).then((res) => (!res || res.length === 0 ? null : res[0]))
    }
  }
  exist(id: ID, tx?: Transaction): Promise<boolean> {
    const field = this.primaryKeys[0].column ? this.primaryKeys[0].column : this.primaryKeys[0].name
    const stmt = exist<ID>(id, this.table, this.primaryKeys, this.db.param, field)
    if (!stmt.query) {
      throw new Error("cannot build query by id")
    }
    const db = tx ? tx: this.db
    return db.query(stmt.query, stmt.params).then((res) => (!res || res.length === 0 ? false : true))
  }
  delete(id: ID, tx?: Transaction): Promise<number> {
    const stmt = buildToDelete<ID>(id, this.table, this.primaryKeys, this.db.param)
    if (stmt.query) {
      const db = tx ? tx: this.db
      return db.execute(stmt.query, stmt.params)
    } else {
      throw new Error("cannot build delete query by id")
    }
  }
}
export const Repository = SqlRepository

// tslint:disable-next-line:max-classes-per-file
export class Query<T, ID, S> extends SearchBuilder<T, S> {
  constructor(
    db: MinDB,
    table: string,
    attributes: Attributes,
    buildQ?: (
      s: S,
      param: (i: number) => string,
      sort?: string,
      buildSort3?: (sort?: string, map?: Attributes | StringMap) => string,
      attrs?: Attributes,
      table?: string,
      fields?: string[],
      sq?: string,
      strExcluding?: string,
      likeType?: LikeType
    ) => Statement | undefined,
    fromDB?: (v: T) => T,
    sort?: string,
    q?: string,
    excluding?: string,
    buildSort?: (sort?: string, map?: Attributes | StringMap) => string,
    total?: string,
  ) {
    super(db, table, attributes, buildQ, fromDB, sort, q, excluding, buildSort, total)
    const m = buildMetadata(attributes)
    this.primaryKeys = m.keys
    this.map = m.map
    this.bools = m.bools
    if (this.metadata) {
      this.metadata = this.metadata.bind(this)
    }
    this.all = this.all.bind(this)
    this.load = this.load.bind(this)
    this.exist = this.exist.bind(this)
  }
  metadata?(): Attributes | undefined {
    return this.attrs
  }
  all(tx?: Transaction): Promise<T[]> {
    const sql = `select * from ${this.table}`
    const db = tx ? tx : this.db
    return db.query(sql, [], this.map, this.bools)
  }
  load(id: ID, tx?: Transaction): Promise<T | null> {
    const stmt = select<ID>(id, this.table, this.primaryKeys, this.db.param)
    if (!stmt.query) {
      throw new Error("cannot build query by id")
    }
    const db = tx ? tx : this.db
    const fn = this.fromDB
    if (fn) {
      return db.query<T>(stmt.query, stmt.params, this.map, this.bools).then((res) => {
        if (!res || res.length === 0) {
          return null
        } else {
          const obj = res[0]
          return fn(obj)
        }
      })
    } else {
      return this.db.query<T>(stmt.query, stmt.params, this.map, this.bools).then((res) => (!res || res.length === 0 ? null : res[0]))
    }
  }
  exist(id: ID, tx?: Transaction): Promise<boolean> {
    const field = this.primaryKeys[0].column ? this.primaryKeys[0].column : this.primaryKeys[0].name
    const stmt = exist<ID>(id, this.table, this.primaryKeys, this.db.param, field)
    if (!stmt.query) {
      throw new Error("cannot build query by id")
    }
    const db = tx ? tx : this.db
    return db.query(stmt.query, stmt.params, undefined, undefined).then((res) => (!res || res.length === 0 ? false : true))
  }
}
