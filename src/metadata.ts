export interface Module {
  id?: string | number
  path?: string
  route?: string
}
export interface Config {
  host?: string
  port?: number
  user?: string
  password?: string
  database?: string
}
export interface StringMap {
  [key: string]: string
}
export interface Statement {
  query: string
  params?: any[]
}

export type DataType =
  | "ObjectId"
  | "date"
  | "datetime"
  | "time"
  | "boolean"
  | "number"
  | "integer"
  | "string"
  | "text"
  | "object"
  | "array"
  | "binary"
  | "primitives"
  | "booleans"
  | "numbers"
  | "integers"
  | "strings"
  | "dates"
  | "datetimes"
  | "times"
export type Operator = "=" | "like" | "!=" | "<>" | ">" | ">=" | "<" | "<="

export interface Attribute {
  name?: string
  column?: string
  type?: DataType
  operator?: Operator
  default?: string | number | Date | boolean
  key?: boolean
  q?: boolean
  noinsert?: boolean
  noupdate?: boolean
  nopatch?: boolean
  version?: boolean
  ignored?: boolean
  true?: string | number
  false?: string | number
  createdAt?: boolean
  updatedAt?: boolean
}
export interface Attributes {
  [key: string]: Attribute
}

export interface MinDB {
  driver?: string
  param(i: number): string
  query<T>(sql: string, args?: any[], m?: StringMap, bools?: Attribute[], ctx?: any): Promise<T[]>
}
export interface Executor {
  driver: string
  param(i: number): string
  query<T>(sql: string, args?: any[], m?: StringMap, bools?: Attribute[], ctx?: any): Promise<T[]>
  execute(sql: string, args?: any[], ctx?: any): Promise<number>
  executeBatch(statements: Statement[], firstSuccess?: boolean, ctx?: any): Promise<number>
}
export interface Transaction extends Executor {
  commit(): Promise<void>
  rollback(): Promise<void>
}
export interface DB extends Executor {
  beginTransaction(): Promise<Transaction>
}

export interface FullExecutor extends Executor {
  queryOne<T>(sql: string, args?: any[], m?: StringMap, bools?: Attribute[], ctx?: any): Promise<T | null>
  executeScalar<T>(sql: string, args?: any[], ctx?: any): Promise<T>
  count(sql: string, args?: any[], ctx?: any): Promise<number>
}
export interface FullTransaction extends FullExecutor {
  commit(): Promise<void>
  rollback(): Promise<void>
}
export interface FullDB extends FullExecutor {
  beginTransaction(): Promise<FullTransaction>
}
