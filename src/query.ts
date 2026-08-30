import { params } from "./build"
import { Attribute, Attributes, Statement, StringMap } from "./metadata"

export type LikeType = "like" | "ilike"

export function buildSort(sort?: string, map?: Attributes | StringMap): string {
  if (!sort || sort.length === 0) {
    return ""
  }
  const sort2: string[] = []
  if (sort && sort.length > 0) {
    const sorts = sort.split(",")
    for (const st of sorts) {
      if (st.length > 0) {
        let field = st
        const tp = st.charAt(0)
        if (tp === "-" || tp === "+") {
          field = st.substring(1)
        }
        const sortType = tp === "-" ? " desc" : ""
        const column = getField(field.trim(), map)
        if (column == undefined) {
          throw new Error(`invalid column for field: ${field}`)
        }
        sort2.push(column + sortType)
      }
    }
  }
  if (sort2.length === 0) {
    return ""
  }
  return sort2.join(",")
}
export function getField(name: string, map?: Attributes | StringMap): string | undefined {
  if (!map) {
    return name
  }
  const x = map[name]
  if (!x) {
    if (isValidColumn(name)) {
      return name
    }
    return undefined
  }
  if (typeof x === "string") {
    return x
  }
  if (x.column) {
    return x.column
  }
}
export function isValidColumn(str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    const chr = str.charAt(i);
    if (chr === '.' || chr === '_') {
      continue;
    }
    if (!(chr >= 'a' && chr <= 'z'
      || chr >= 'A' && chr <= 'Z'
      || chr >= '0' && chr <= '9')) {
      return false;
    }
  }
  return true;
}
export function buildMsSQLParam(i: number): string {
  return "@" + i
}
export function buildOracleParam(i: number): string {
  return ":" + i
}
export function buildDollarParam(i: number): string {
  return "$" + i
}

export function escapeLike(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
}
export function buildQuery<S>(
  filter: S,
  param: ((i: number) => string),
  sort?: string,
  buildSort3?: (sort?: string, map?: Attributes | StringMap) => string,
  attrs?: Attributes,
  table?: string,
  fields?: string[],
  sq?: string,
  strExcluding?: string,
  likeType?: LikeType
): Statement | undefined {
  if (!table || !attrs) {
    return undefined
  }
  const s: any = filter
  let like = likeType ? likeType : "like"
  // let param: (i: number) => string
  const filters: string[] = []
  let rawQ: string | undefined
  let excluding: string[] | number[] | undefined
  const args: any[] = []
  if (sq && sq.length > 0) {
    rawQ = s[sq]
    if (typeof rawQ === "string") {
      if (rawQ === "") {
        rawQ = undefined
      }
    } else {
      rawQ = undefined
    }
  }
  if (strExcluding && strExcluding.length > 0) {
    excluding = s[strExcluding]
    //delete s[strExcluding]
    if (typeof excluding === "string") {
      excluding = (excluding as string).split(",")
    }
    if (excluding && excluding.length === 0) {
      excluding = undefined
    }
  }
  const ex: string[] = []
  const keys = Object.keys(s)
  let i = 1
  for (const key of keys) {
    const v = s[key]
    let field = key
    if (v !== undefined && v != null) {
      const attr: Attribute = attrs[key]
      if (attr) {
        field = attr.column ? attr.column : key
        if (typeof v === "string") {
          if (v.length !== 0) {
            if (attr.q) {
              ex.push(key)
            }
            if (attr.operator === "=") {
              filters.push(`${field} = ${param(i++)}`)
              args.push(v)
            } else if (attr.operator === "like") {
              const escaped = escapeLike(v)
              filters.push(`${field} ${like} ${param(i++)} ESCAPE '\\'`)
              args.push("%" + escaped + "%")
            } else if (attr.operator === "!=" || attr.operator === "<>") {
              filters.push(`${field} ${attr.operator} ${param(i++)}`)
              args.push(v)
            } else {
              const escaped = escapeLike(v)
              filters.push(`${field} ${like} ${param(i++)} ESCAPE '\\'`)
              args.push(escaped + "%")
            }
          }
        } else if (typeof v === "number") {
          const operator = attr.operator ? attr.operator : ">="
          filters.push(`${field} ${operator} ${param(i++)}`)
          args.push(v)
        } else if (typeof v === "boolean") {
          const operator = attr.operator
          if (operator === "=" || operator === "!=" || operator === "<>") {
            filters.push(`${field} ${operator} ${param(i++)}`)
            args.push(v)
          }
        } else if (v instanceof Date) {
          const operator = attr.operator ? attr.operator : ">="
          filters.push(`${field} ${operator} ${param(i++)}`)
          args.push(v)
        } else if (attr.type === "ObjectId") {
          filters.push(`${field} = ${param(i++)}`)
          args.push(v)
        } else if (typeof v === "object") {
          if (Array.isArray(v)) {
            if (v.length > 0) {
              const ps = params(v.length, param, i - 1)
              i = i + v.length
              for (const sv of v) {
                args.push(sv)
              }
              filters.push(`${field} in (${ps.join(",")})`)
            }
          } else if (attr.type === "date" || attr.type === "datetime") {
            if (isDateRange(v)) {
              if (v["max"]) {
                filters.push(`${field} <= ${param(i++)}`)
                args.push(v["max"])
              } else if (v["top"]) {
                filters.push(`${field} < ${param(i++)}`)
                args.push(v["top"])
              } else if (v["endDate"]) {
                filters.push(`${field} <= ${param(i++)}`)
                args.push(v["endDate"])
              } else if (v["upper"]) {
                filters.push(`${field} < ${param(i++)}`)
                args.push(v["upper"])
              } else if (v["endTime"]) {
                filters.push(`${field} < ${param(i++)}`)
                args.push(v["endTime"])
              }
              if (v["min"]) {
                filters.push(`${field} >= ${param(i++)}`)
                args.push(v["min"])
              } else if (v["startTime"]) {
                filters.push(`${field} >= ${param(i++)}`)
                args.push(v["startTime"])
              } else if (v["startDate"]) {
                filters.push(`${field} >= ${param(i++)}`)
                args.push(v["startDate"])
              } else if (v["lower"]) {
                filters.push(`${field} > ${param(i++)}`)
                args.push(v["lower"])
              }
            }
          } else if (attr.type === "number" || attr.type === "integer") {
            if (isNumberRange(v)) {
              if (v["max"] != null) {
                filters.push(`${field} <= ${v["max"]}`)
              } else if (v["top"] != null) {
                filters.push(`${field} < ${v["top"]}`)
              } else if (v["upper"] != null) {
                filters.push(`${field} < ${v["upper"]}`)
              }
              if (v["min"] != null) {
                filters.push(`${field} >= ${v["min"]}`)
              } else if (v["lower"] != null) {
                filters.push(`${field} > ${v["lower"]}`)
              }
            }
          }
        }
      }
    }
  }
  const idField = getId(attrs)
  if (idField && excluding && excluding.length > 0) {
    const l = excluding.length
    const ps: string[] = []
    for (const k of excluding) {
      if (k != null && k !== undefined) {
        if (typeof k === "number") {
          ps.push(k.toString())
        } else {
          ps.push(param(i++))
          args.push(k)
        }
      }
    }
    filters.push(`${idField} not in (${ps.join(",")})`)
  }
  if (rawQ && attrs) {
    const qkeys = Object.keys(attrs)
    const qfilters: string[] = []
    for (const field of qkeys) {
      const attr = attrs[field]
      if (attr.q && (attr.type === undefined || attr.type === "string") && !ex.includes(field)) {
        const column = attr.column ? attr.column : field
        if (attr.operator === "=") {
          qfilters.push(`${column} = ${param(i++)}`)
          args.push(rawQ)
        } else if (attr.operator === "like") {
          const escaped = escapeLike(rawQ)
          qfilters.push(`${column} ${like} ${param(i++)}`)
          args.push("%" + escaped + "%")
        } else {
          const escaped = escapeLike(rawQ)
          qfilters.push(`${column} ${like} ${param(i++)}`)
          args.push(escaped + "%")
        }
      }
    }
    if (qfilters.length > 0) {
      filters.push(`(${qfilters.join(" or ")})`)
    }
  }
  const buildS = buildSort3 ? buildSort3 : buildSort
  const sSort = buildS(sort, attrs)
  const sOrderBy = sSort.length > 0 ? ` order by ${sSort}` : ""
  if (filters.length === 0) {
    const sql = `select ${buildFieldsByAttributes(attrs, fields)} from ${table}${sOrderBy}`
    return { query: sql, params: args }
  } else {
    const sql = `select ${buildFieldsByAttributes(attrs, fields)} from ${table} where ${filters.join(" and ")}${sOrderBy}`
    return { query: sql, params: args }
  }
}
export function getId(attrs: Attributes): string | undefined {
  const qkeys = Object.keys(attrs)
  for (const key of qkeys) {
    const attr = attrs[key]
    if (attr.key) {
      const field = attr.column ? attr.column : key
      return field
    }
  }
  return undefined
}
export function buildFieldsByAttributes(attrs: Attributes, fields?: string[]): string {
  if (!fields || fields.length === 0) {
    return "*"
  }
  const cols: string[] = []
  for (const f of fields) {
    const attr = attrs[f]
    if (attr) {
      const field = attr.column ? attr.column : f
      cols.push(field)
    }
  }
  if (cols.length === 0) {
    return "*"
  } else {
    return cols.join(",")
  }
}
export function isDateRange<T>(obj: T): boolean {
  const keys: string[] = Object.keys(obj as any)
  if (keys.length === 0) {
    return false
  }
  for (const key of keys) {
    const v = (obj as any)[key]
    if (!(v instanceof Date)) {
      return false
    }
  }
  return true
}
export function isNumberRange<T>(obj: T): boolean {
  const keys: string[] = Object.keys(obj as any)
  if (keys.length === 0) {
    return false
  }
  for (const key of keys) {
    const v = (obj as any)[key]
    if (typeof v !== "number") {
      return false
    }
  }
  return true
}
