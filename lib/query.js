"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var build_1 = require("./build");
function buildSort(sort, map) {
  if (!sort || sort.length === 0) {
    return "";
  }
  var sort2 = [];
  if (sort && sort.length > 0) {
    var sorts = sort.split(",");
    for (var _i = 0, sorts_1 = sorts; _i < sorts_1.length; _i++) {
      var st = sorts_1[_i];
      if (st.length > 0) {
        var field = st;
        var tp = st.charAt(0);
        if (tp === "-" || tp === "+") {
          field = st.substring(1);
        }
        var sortType = tp === "-" ? " desc" : "";
        var column = getField(field.trim(), map);
        if (column == undefined) {
          throw new Error("invalid column for field: " + field);
        }
        sort2.push(column + sortType);
      }
    }
  }
  if (sort2.length === 0) {
    return "";
  }
  return sort2.join(",");
}
exports.buildSort = buildSort;
function getField(name, map) {
  if (!map) {
    return name;
  }
  var x = map[name];
  if (!x) {
    if (isValidColumn(name)) {
      return name;
    }
    return undefined;
  }
  if (typeof x === "string") {
    return x;
  }
  if (x.column) {
    return x.column;
  }
}
exports.getField = getField;
function isValidColumn(str) {
  for (var i = 0; i < str.length; i++) {
    var chr = str.charAt(i);
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
exports.isValidColumn = isValidColumn;
function buildMsSQLParam(i) {
  return "@" + i;
}
exports.buildMsSQLParam = buildMsSQLParam;
function buildOracleParam(i) {
  return ":" + i;
}
exports.buildOracleParam = buildOracleParam;
function buildDollarParam(i) {
  return "$" + i;
}
exports.buildDollarParam = buildDollarParam;
function escapeLike(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}
exports.escapeLike = escapeLike;
function buildQuery(filter, param, sort, buildSort3, attrs, table, fields, sq, strExcluding, likeType) {
  if (!table || !attrs) {
    return undefined;
  }
  var s = filter;
  var like = likeType ? likeType : "like";
  var filters = [];
  var rawQ;
  var excluding;
  var args = [];
  if (sq && sq.length > 0) {
    rawQ = s[sq];
    if (typeof rawQ === "string") {
      if (rawQ === "") {
        rawQ = undefined;
      }
    }
    else {
      rawQ = undefined;
    }
  }
  if (strExcluding && strExcluding.length > 0) {
    excluding = s[strExcluding];
    if (typeof excluding === "string") {
      excluding = excluding.split(",");
    }
    if (excluding && excluding.length === 0) {
      excluding = undefined;
    }
  }
  var ex = [];
  var keys = Object.keys(s);
  var i = 1;
  for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
    var key = keys_1[_i];
    var v = s[key];
    var field = key;
    if (v !== undefined && v != null) {
      var attr = attrs[key];
      if (attr) {
        field = attr.column ? attr.column : key;
        if (typeof v === "string") {
          if (v.length !== 0) {
            if (attr.q) {
              ex.push(key);
            }
            if (attr.operator === "=") {
              filters.push(field + " = " + param(i++));
              args.push(v);
            }
            else if (attr.operator === "like") {
              var escaped = escapeLike(v);
              filters.push(field + " " + like + " " + param(i++) + " ESCAPE '\\'");
              args.push("%" + escaped + "%");
            }
            else if (attr.operator === "!=" || attr.operator === "<>") {
              filters.push(field + " " + attr.operator + " " + param(i++));
              args.push(v);
            }
            else {
              var escaped = escapeLike(v);
              filters.push(field + " " + like + " " + param(i++) + " ESCAPE '\\'");
              args.push(escaped + "%");
            }
          }
        }
        else if (typeof v === "number") {
          var operator = attr.operator ? attr.operator : ">=";
          filters.push(field + " " + operator + " " + param(i++));
          args.push(v);
        }
        else if (typeof v === "boolean") {
          var operator = attr.operator;
          if (operator === "=" || operator === "!=" || operator === "<>") {
            filters.push(field + " " + operator + " " + param(i++));
            args.push(v);
          }
        }
        else if (v instanceof Date) {
          var operator = attr.operator ? attr.operator : ">=";
          filters.push(field + " " + operator + " " + param(i++));
          args.push(v);
        }
        else if (attr.type === "ObjectId") {
          filters.push(field + " = " + param(i++));
          args.push(v);
        }
        else if (typeof v === "object") {
          if (Array.isArray(v)) {
            if (v.length > 0) {
              var ps = build_1.params(v.length, param, i - 1);
              i = i + v.length;
              for (var _a = 0, v_1 = v; _a < v_1.length; _a++) {
                var sv = v_1[_a];
                args.push(sv);
              }
              filters.push(field + " in (" + ps.join(",") + ")");
            }
          }
          else if (attr.type === "date" || attr.type === "datetime") {
            if (isDateRange(v)) {
              if (v["max"]) {
                filters.push(field + " <= " + param(i++));
                args.push(v["max"]);
              }
              else if (v["top"]) {
                filters.push(field + " < " + param(i++));
                args.push(v["top"]);
              }
              else if (v["endDate"]) {
                filters.push(field + " <= " + param(i++));
                args.push(v["endDate"]);
              }
              else if (v["upper"]) {
                filters.push(field + " < " + param(i++));
                args.push(v["upper"]);
              }
              else if (v["endTime"]) {
                filters.push(field + " < " + param(i++));
                args.push(v["endTime"]);
              }
              if (v["min"]) {
                filters.push(field + " >= " + param(i++));
                args.push(v["min"]);
              }
              else if (v["startTime"]) {
                filters.push(field + " >= " + param(i++));
                args.push(v["startTime"]);
              }
              else if (v["startDate"]) {
                filters.push(field + " >= " + param(i++));
                args.push(v["startDate"]);
              }
              else if (v["lower"]) {
                filters.push(field + " > " + param(i++));
                args.push(v["lower"]);
              }
            }
          }
          else if (attr.type === "number" || attr.type === "integer") {
            if (isNumberRange(v)) {
              if (v["max"] != null) {
                filters.push(field + " <= " + v["max"]);
              }
              else if (v["top"] != null) {
                filters.push(field + " < " + v["top"]);
              }
              else if (v["upper"] != null) {
                filters.push(field + " < " + v["upper"]);
              }
              if (v["min"] != null) {
                filters.push(field + " >= " + v["min"]);
              }
              else if (v["lower"] != null) {
                filters.push(field + " > " + v["lower"]);
              }
            }
          }
        }
      }
    }
  }
  var idField = getId(attrs);
  if (idField && excluding && excluding.length > 0) {
    var l = excluding.length;
    var ps = [];
    for (var _b = 0, excluding_1 = excluding; _b < excluding_1.length; _b++) {
      var k = excluding_1[_b];
      if (k != null && k !== undefined) {
        if (typeof k === "number") {
          ps.push(k.toString());
        }
        else {
          ps.push(param(i++));
          args.push(k);
        }
      }
    }
    filters.push(idField + " not in (" + ps.join(",") + ")");
  }
  if (rawQ && attrs) {
    var qkeys = Object.keys(attrs);
    var qfilters = [];
    for (var _c = 0, qkeys_1 = qkeys; _c < qkeys_1.length; _c++) {
      var field = qkeys_1[_c];
      var attr = attrs[field];
      if (attr.q && (attr.type === undefined || attr.type === "string") && !ex.includes(field)) {
        var column = attr.column ? attr.column : field;
        if (attr.operator === "=") {
          qfilters.push(column + " = " + param(i++));
          args.push(rawQ);
        }
        else if (attr.operator === "like") {
          var escaped = escapeLike(rawQ);
          qfilters.push(column + " " + like + " " + param(i++));
          args.push("%" + escaped + "%");
        }
        else {
          var escaped = escapeLike(rawQ);
          qfilters.push(column + " " + like + " " + param(i++));
          args.push(escaped + "%");
        }
      }
    }
    if (qfilters.length > 0) {
      filters.push("(" + qfilters.join(" or ") + ")");
    }
  }
  var buildS = buildSort3 ? buildSort3 : buildSort;
  var sSort = buildS(sort, attrs);
  var sOrderBy = sSort.length > 0 ? " order by " + sSort : "";
  if (filters.length === 0) {
    var sql = "select " + buildFieldsByAttributes(attrs, fields) + " from " + table + sOrderBy;
    return { query: sql, params: args };
  }
  else {
    var sql = "select " + buildFieldsByAttributes(attrs, fields) + " from " + table + " where " + filters.join(" and ") + sOrderBy;
    return { query: sql, params: args };
  }
}
exports.buildQuery = buildQuery;
function getId(attrs) {
  var qkeys = Object.keys(attrs);
  for (var _i = 0, qkeys_2 = qkeys; _i < qkeys_2.length; _i++) {
    var key = qkeys_2[_i];
    var attr = attrs[key];
    if (attr.key) {
      var field = attr.column ? attr.column : key;
      return field;
    }
  }
  return undefined;
}
exports.getId = getId;
function buildFieldsByAttributes(attrs, fields) {
  if (!fields || fields.length === 0) {
    return "*";
  }
  var cols = [];
  for (var _i = 0, fields_1 = fields; _i < fields_1.length; _i++) {
    var f = fields_1[_i];
    var attr = attrs[f];
    if (attr) {
      var field = attr.column ? attr.column : f;
      cols.push(field);
    }
  }
  if (cols.length === 0) {
    return "*";
  }
  else {
    return cols.join(",");
  }
}
exports.buildFieldsByAttributes = buildFieldsByAttributes;
function isDateRange(obj) {
  var keys = Object.keys(obj);
  if (keys.length === 0) {
    return false;
  }
  for (var _i = 0, keys_2 = keys; _i < keys_2.length; _i++) {
    var key = keys_2[_i];
    var v = obj[key];
    if (!(v instanceof Date)) {
      return false;
    }
  }
  return true;
}
exports.isDateRange = isDateRange;
function isNumberRange(obj) {
  var keys = Object.keys(obj);
  if (keys.length === 0) {
    return false;
  }
  for (var _i = 0, keys_3 = keys; _i < keys_3.length; _i++) {
    var key = keys_3[_i];
    var v = obj[key];
    if (typeof v !== "number") {
      return false;
    }
  }
  return true;
}
exports.isNumberRange = isNumberRange;
