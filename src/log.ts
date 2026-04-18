import { Attribute, FullExecutor, Statement, StringMap } from "./metadata"

export interface SimpleMap {
  [key: string]: string | number | boolean | Date
}
export interface Logger {
  level: number
  debug(msg: string, m?: SimpleMap, ctx?: any): void
  info(msg: string, m?: SimpleMap, ctx?: any): void
  error(msg: string, m?: SimpleMap, ctx?: any): void
  isDebugEnabled(): boolean
  isInfoEnabled(): boolean
}
export function log(db: FullExecutor, isLog: boolean | undefined | null, logger: Logger, q?: string, result?: string, r?: string, duration?: string): FullExecutor {
  if (!isLog) {
    return db
  }
  if (q !== undefined && q != null && q.length > 0) {
    if (!logger.isDebugEnabled()) {
      return db
    }
    return new LogExecutor(db, logger.error, logger.debug, q, result, r, duration)
  }
  if (!logger.isInfoEnabled()) {
    return db
  }
  return new LogExecutor(db, logger.error, logger.info, q, result, r, duration)
}
export function useLog(
  db: FullExecutor,
  isLog: boolean | undefined | null,
  err: ((msg: string, m?: SimpleMap) => void) | undefined,
  lg?: (msg: string, m?: SimpleMap) => void,
  q?: string,
  result?: string,
  r?: string,
  duration?: string,
): FullExecutor {
  if (!isLog) {
    return db
  }
  if (err) {
    return new LogExecutor(db, err, lg, q, result, r, duration)
  }
  return db
}
// tslint:disable-next-line:max-classes-per-file
export class LogExecutor implements FullExecutor {
  constructor(
    public db: FullExecutor,
    err: (msg: string, m?: SimpleMap) => void,
    lg?: (msg: string, m?: SimpleMap) => void,
    q?: string,
    result?: string,
    r?: string,
    duration?: string,
  ) {
    this.driver = db.driver
    this.duration = duration && duration.length > 0 ? duration : "duration"
    this.sql = q === undefined ? "" : q
    this.return = r !== undefined && r != null ? r : "count"
    this.result = result !== undefined && result != null ? result : ""
    // this.err = (er ? er : 'error');
    this.log = lg
    this.error = err
    this.param = this.param.bind(this)
    this.execute = this.execute.bind(this)
    this.executeBatch = this.executeBatch.bind(this)
    this.query = this.query.bind(this)
    this.queryOne = this.queryOne.bind(this)
    this.executeScalar = this.executeScalar.bind(this)
    this.count = this.count.bind(this)
  }
  log?: (msg: string, m?: SimpleMap, ctx?: any) => void
  error: (msg: string, m?: SimpleMap, ctx?: any) => void
  driver: string
  duration: string
  sql: string
  return: string
  result: string
  // err: string;
  param(i: number): string {
    return this.db.param(i)
  }
  execute(sql: string, args?: any[], ctx?: any): Promise<number> {
    const t1 = new Date()
    return this.db
      .execute(sql, args, ctx)
      .then((v) => {
        setTimeout(() => {
          if (this.log) {
            const d = diff(t1)
            const obj: SimpleMap = {}
            if (this.sql.length > 0) {
              obj[this.sql] = getString(sql, args)
            }
            if (this.return.length > 0) {
              obj[this.return] = v
            }
            obj[this.duration] = d
            this.log("query", obj)
          }
        }, 0)
        return v
      })
      .catch((er) => {
        setTimeout(() => {
          const d = diff(t1)
          const obj: SimpleMap = {}
          if (this.sql.length > 0) {
            obj[this.sql] = getString(sql, args)
          }
          obj[this.duration] = d
          this.error("error query: " + buildString(er))
        }, 0)
        throw er
      })
  }
  executeBatch(statements: Statement[], firstSuccess?: boolean, ctx?: any): Promise<number> {
    const t1 = new Date()
    return this.db
      .executeBatch(statements, firstSuccess, ctx)
      .then((v) => {
        setTimeout(() => {
          if (this.log) {
            const d = diff(t1)
            const obj: SimpleMap = {}
            if (this.sql.length > 0) {
              obj[this.sql] = JSON.stringify(statements)
            }
            if (this.return.length > 0) {
              obj[this.return] = v
            }
            obj[this.duration] = d
            this.log("exec batch", obj)
          }
        }, 0)
        return v
      })
      .catch((er) => {
        setTimeout(() => {
          const d = diff(t1)
          const obj: SimpleMap = {}
          if (this.sql.length > 0) {
            obj[this.sql] = JSON.stringify(statements)
          }
          obj[this.duration] = d
          this.error("error exec batch: " + buildString(er))
        }, 0)
        throw er
      })
  }
  query<T>(sql: string, args?: any[], m?: StringMap, bools?: Attribute[], ctx?: any): Promise<T[]> {
    const t1 = new Date()
    return this.db
      .query<T>(sql, args, m, bools, ctx)
      .then((v) => {
        setTimeout(() => {
          if (this.log) {
            const d = diff(t1)
            const obj: SimpleMap = {}
            if (this.sql.length > 0) {
              obj[this.sql] = getString(sql, args)
            }
            if (this.result.length > 0) {
              if (v && v.length > 0) {
                obj[this.result] = JSON.stringify(v)
              }
            }
            if (this.return.length > 0) {
              obj[this.return] = v ? v.length : 0
            }
            obj[this.duration] = d
            this.log("query", obj)
          }
        }, 0)
        return v
      })
      .catch((er) => {
        setTimeout(() => {
          const d = diff(t1)
          const obj: SimpleMap = {}
          if (this.sql.length > 0) {
            obj[this.sql] = getString(sql, args)
          }
          obj[this.duration] = d
          this.error("error query: " + buildString(er))
        }, 0)
        throw er
      })
  }
  queryOne<T>(sql: string, args?: any[], m?: StringMap, bools?: Attribute[], ctx?: any): Promise<T | null> {
    const t1 = new Date()
    return this.db
      .queryOne<T>(sql, args, m, bools, ctx)
      .then((v) => {
        setTimeout(() => {
          if (this.log) {
            const d = diff(t1)
            const obj: SimpleMap = {}
            if (this.sql.length > 0) {
              obj[this.sql] = getString(sql, args)
            }
            if (this.result.length > 0) {
              obj[this.result] = v ? JSON.stringify(v) : "null"
            }
            if (this.return.length > 0) {
              obj[this.return] = v ? 1 : 0
            }
            obj[this.duration] = d
            this.log("query one", obj)
          }
        }, 0)
        return v
      })
      .catch((er) => {
        setTimeout(() => {
          const d = diff(t1)
          const obj: SimpleMap = {}
          if (this.sql.length > 0) {
            obj[this.sql] = getString(sql, args)
          }
          obj[this.duration] = d
          this.error("error query one: " + buildString(er))
        }, 0)
        throw er
      })
  }
  executeScalar<T>(sql: string, args?: any[], ctx?: any): Promise<T> {
    const t1 = new Date()
    return this.db
      .executeScalar<T>(sql, args, ctx)
      .then((v) => {
        setTimeout(() => {
          if (this.log) {
            const d = diff(t1)
            const obj: SimpleMap = {}
            if (this.sql.length > 0) {
              obj[this.sql] = getString(sql, args)
            }
            if (this.result.length > 0) {
              obj[this.result] = v ? buildString(v) : "null"
            }
            if (this.return.length > 0) {
              obj[this.return] = v ? 1 : 0
            }
            obj[this.duration] = d
            this.log("exec scalar", obj)
          }
        }, 0)
        return v
      })
      .catch((er) => {
        setTimeout(() => {
          const d = diff(t1)
          const obj: SimpleMap = {}
          if (this.sql.length > 0) {
            obj[this.sql] = getString(sql, args)
          }
          obj[this.duration] = d
          this.error("error exec scalar: " + buildString(er))
        }, 0)
        throw er
      })
  }
  count(sql: string, args?: any[], ctx?: any): Promise<number> {
    const t1 = new Date()
    return this.db
      .count(sql, args)
      .then((v) => {
        setTimeout(() => {
          if (this.log) {
            const d = diff(t1)
            const obj: SimpleMap = {}
            if (this.sql.length > 0) {
              obj[this.sql] = getString(sql, args)
            }
            if (this.return.length > 0) {
              obj[this.return] = v
            }
            obj[this.duration] = d
            this.log("count", obj)
          }
        }, 0)
        return v
      })
      .catch((er) => {
        setTimeout(() => {
          const d = diff(t1)
          const obj: SimpleMap = {}
          if (this.sql.length > 0) {
            obj[this.sql] = getString(sql, args)
          }
          obj[this.duration] = d
          this.error("error count: " + buildString(er))
        }, 0)
        throw er
      })
  }
}
function buildString(v: any): string {
  if (typeof v === "string") {
    return v
  } else {
    return JSON.stringify(v)
  }
}
function getString(sql: string, args?: any[]): string {
  if (args && args.length > 0) {
    return sql + " " + JSON.stringify(args)
  } else {
    return sql
  }
}
export function diff(d1: Date): number {
  const d2 = new Date()
  return d2.getTime() - d1.getTime()
}
/*
const NS_PER_SEC = 1e9;
const NS_TO_MS = 1e6;
const getDurationInMilliseconds = (start: [number, number] | undefined) => {
  const diff = process.hrtime(start);
  return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS;
};
*/
