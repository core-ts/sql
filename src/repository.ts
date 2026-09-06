import { buildQuery, buildSort, LikeType } from "./query"
import { buildToDelete, buildToInsert, buildToUpdate, exist, buildMetadata, select } from "./build"
import { Attribute, Attributes, Executor, Statement, StringMap, Transaction } from "./metadata"
import { buildFromQuery, mssql, SearchResult } from "./search"
import { postgres } from "./search-repository"

// tslint:disable-next-line:max-classes-per-file
export class CRUDRepository<T, ID> {
  protected primaryKeys: Attribute[]
  protected map?: StringMap
  protected bools?: Attribute[]
  protected version?: string
  protected createdAt?: string
  protected updatedAt?: string
  
  constructor(protected db: Executor, protected table: string, protected attributes: Attributes, protected toDB?: (v: T) => T, protected fromDB?: (v: T) => T) {
    const x = buildMetadata(attributes)
    this.primaryKeys = x.keys
    if (this.primaryKeys.length === 0) {
      throw new Error(`Repository for "${this.table}" requires at least one key attribute`)
    }
    this.map = x.map
    this.bools = x.bools
    this.version = x.version
    this.createdAt = x.createdAt
    this.updatedAt = x.updatedAt
    this.all = this.all.bind(this)
    this.load = this.load.bind(this)
    this.exist = this.exist.bind(this)
    this.create = this.create.bind(this)
    this.update = this.update.bind(this)
    this.patch = this.patch.bind(this)
    this.delete = this.delete.bind(this)
  }
  async all(tx?: Transaction): Promise<T[]> {
    const db = tx ?? this.db
    const rows = await db.query<T>(`select * from ${this.table}`, [], this.map, this.bools)
    return this.fromDB ? rows.map(this.fromDB) : rows
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
    if (!stmt.query) {
      throw new Error("cannot build insert query")
    }
    const db = tx ? tx: this.db
    return db.execute(stmt.query, stmt.params).catch((err) => {
      if (err && err.error === "duplicate") {
        return 0
      } else {
        throw err
      }
    })
  }
  async update(obj: T, tx?: Transaction): Promise<number> {
    let obj2: any = obj
    if (this.toDB) {
      obj2 = this.toDB(obj)
    }
    if (this.updatedAt) {
      obj2[this.updatedAt] = new Date()
    }
    const stmt = buildToUpdate(obj2, this.table, this.attributes, this.db.param, this.primaryKeys, this.version)
    if (!stmt.query) {
      throw new Error("cannot build update query by id")
    }
    const db = tx ? tx: this.db
    const rowsAffected = await db.execute(stmt.query, stmt.params)
    if (this.version && rowsAffected === 0) {
      const selectCols: string[] = []
      const cols: string[] = []
      const args: any[] = []
      let i = 1
      for (const k of this.primaryKeys) {
        if (k.name) {
          const field = k.column ? k.column : k.name
          selectCols.push(field)
          cols.push(`${field} = ${this.db.param(i++)}`)
          args.push((obj as any)[k.name])
        }
      }
      const query = `select ${selectCols.join(",")} from ${this.table} where ${cols.join(" and ")}`
      const res = await db.query<T>(query, args, this.map, this.bools)
      return !res || res.length === 0 ? -1 : 0
    } else {
      return rowsAffected
    }
  }
  patch(obj: Partial<T>, tx?: Transaction): Promise<number> {
    return this.update(obj as any, tx)
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

export class Repository<T, ID, S> extends CRUDRepository<T, ID> {
  protected firstField?: string
  protected buildQuery: (
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
  ) => Statement | undefined
  protected q?: string
  protected excluding?: string
  protected buildSort?: (sort?: string, map?: Attributes | StringMap) => string
  protected total?: string
  constructor(db: Executor, 
    protected table: string,
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
    toDB?: (v: T) => T,
    fromDB?: (v: T) => T,
    protected sort?: string,
    q?: string,
    excluding?: string,
    buildSort2?: (sort?: string, map?: Attributes | StringMap) => string,
    total?: string,
  ) {
    super(db, table, attributes, toDB, fromDB)
    const meta = buildMetadata(attributes)
    this.map = meta.map
    if (meta.fields && meta.fields.length > 0) {
      this.firstField = meta.fields[0]
    }
    this.bools = meta.bools
    this.primaryKeys = meta.keys
    this.version = meta.version
    this.createdAt = meta.createdAt
    this.updatedAt = meta.updatedAt
    this.buildQuery = buildQ ? buildQ : buildQuery
    this.buildSort = buildSort2 ? buildSort2 : buildSort
    this.q = q && q.length > 0 ? q : "q"
    this.excluding = excluding && excluding.length > 0 ? excluding : "excluding"
    this.search = this.search.bind(this)
    this.total = total && total.length > 0 ? total : "total"
  }
  search(filter: S, limit: number, page?: number | string, fields?: string[]): Promise<SearchResult<T>> {
    let ipage = 0
    if (typeof page === "number" && page > 0) {
      ipage = page
    }
    const st = this.sort ? this.sort : "sort"
    let sn = (filter as any)[st] as string
    if (sn && typeof sn === "string" && sn.length > 0) {
      sn = sn.trim()
    }
    if (!sn && this.db.driver === mssql) {
      if (this.primaryKeys && this.primaryKeys.length > 0) {
        const keys = this.primaryKeys.map((k) => k.column ? k.column : k.name)
        if (keys && keys.length > 0) {
          const sortStr = keys.map((k) => `${k} asc`).join(", ")
          sn = sortStr
        }
      } else if (this.firstField) {
        sn = this.firstField
      } else {
        throw new Error("Cannot build sort string for mssql")
      }
    }
    const likeType = this.db.driver === postgres ? "ilike" : "like"
    const q2 = this.buildQuery(filter, this.db.param, sn, this.buildSort, this.attributes, this.table, fields, this.q, this.excluding, likeType)
    if (!q2) {
      throw new Error("Cannot build query")
    }
    const fn = this.fromDB
    if (fn) {
      return buildFromQuery<T>(this.db.query, q2.query, q2.params, limit, ipage, this.map, this.bools, this.db.driver, this.total).then((r) => {
        if (r.list && r.list.length > 0) {
          r.list = r.list.map((o) => fn(o))
          return r
        } else {
          return r
        }
      })
    } else {
      return buildFromQuery(this.db.query, q2.query, q2.params, limit, ipage, this.map, this.bools, this.db.driver, this.total)
    }
  }
}
