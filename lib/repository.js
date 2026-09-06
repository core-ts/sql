"use strict";
var __extends = (this && this.__extends) || (function () {
  var extendStatics = function (d, b) {
    extendStatics = Object.setPrototypeOf ||
      ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
      function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return extendStatics(d, b);
  };
  return function (d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
  function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
    function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
    function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
  var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
  function verb(n) { return function (v) { return step([n, v]); }; }
  function step(op) {
    if (f) throw new TypeError("Generator is already executing.");
    while (_) try {
      if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
      if (y = 0, t) op = [op[0] & 2, t.value];
      switch (op[0]) {
        case 0: case 1: t = op; break;
        case 4: _.label++; return { value: op[1], done: false };
        case 5: _.label++; y = op[1]; op = [0]; continue;
        case 7: op = _.ops.pop(); _.trys.pop(); continue;
        default:
          if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
          if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
          if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
          if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
          if (t[2]) _.ops.pop();
          _.trys.pop(); continue;
      }
      op = body.call(thisArg, _);
    } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
    if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
  }
};
Object.defineProperty(exports, "__esModule", { value: true });
var build_1 = require("./build");
var search_repository_1 = require("./search-repository");
function useGet(db, table, attrs, fromDB) {
  var l = new SqlLoader(db, table, attrs, fromDB);
  return l.load;
}
exports.useGet = useGet;
exports.useLoad = useGet;
var SqlLoader = (function () {
  function SqlLoader(db, table, attrs, fromDB) {
    this.db = db;
    this.table = table;
    this.fromDB = fromDB;
    if (Array.isArray(attrs)) {
      this.primaryKeys = build_1.attributes(attrs);
      this.attributes = {};
    }
    else {
      var m = build_1.buildMetadata(attrs);
      this.attributes = attrs;
      this.primaryKeys = m.keys;
      this.map = m.map;
      this.bools = m.bools;
    }
    if (this.metadata) {
      this.metadata = this.metadata.bind(this);
    }
    this.all = this.all.bind(this);
    this.load = this.load.bind(this);
    this.exist = this.exist.bind(this);
  }
  SqlLoader.prototype.metadata = function () {
    return this.attributes;
  };
  SqlLoader.prototype.all = function (tx) {
    var sql = "select * from " + this.table;
    var db = tx ? tx : this.db;
    return db.query(sql, [], this.map, this.bools);
  };
  SqlLoader.prototype.load = function (id, tx) {
    var stmt = build_1.select(id, this.table, this.primaryKeys, this.db.param);
    if (!stmt.query) {
      throw new Error("cannot build query by id");
    }
    var db = tx ? tx : this.db;
    var fn = this.fromDB;
    if (fn) {
      return db.query(stmt.query, stmt.params, this.map, this.bools).then(function (res) {
        if (!res || res.length === 0) {
          return null;
        }
        else {
          var obj = res[0];
          return fn(obj);
        }
      });
    }
    else {
      return db.query(stmt.query, stmt.params, this.map, this.bools).then(function (res) { return (!res || res.length === 0 ? null : res[0]); });
    }
  };
  SqlLoader.prototype.exist = function (id, tx) {
    var field = this.primaryKeys[0].column ? this.primaryKeys[0].column : this.primaryKeys[0].name;
    var stmt = build_1.exist(id, this.table, this.primaryKeys, this.db.param, field);
    if (!stmt.query) {
      throw new Error("cannot build query by id");
    }
    var db = tx ? tx : this.db;
    return db.query(stmt.query, stmt.params, undefined, undefined).then(function (res) { return (!res || res.length === 0 ? false : true); });
  };
  return SqlLoader;
}());
exports.SqlLoader = SqlLoader;
exports.SqlViewRepository = SqlLoader;
exports.SqlLoadService = SqlLoader;
exports.SqlViewServic = SqlLoader;
var QueryRepository = (function () {
  function QueryRepository(db, table, attrs, sort, id) {
    this.db = db;
    this.table = table;
    this.attrs = attrs;
    this.sort = sort;
    this.id = id && id.length > 0 ? id : "id";
    this.query = this.query.bind(this);
    var m = build_1.buildMetadata(attrs);
    this.map = m.map;
    this.bools = m.bools;
  }
  QueryRepository.prototype.query = function (ids, tx) {
    if (!ids || ids.length === 0) {
      return Promise.resolve([]);
    }
    var ps = [];
    var length = ids.length;
    for (var i = 1; i <= length; i++) {
      ps.push(this.db.param(i));
    }
    var sql = "select * from " + this.table + " where " + this.id + " in (" + ps.join(",") + ")";
    if (this.sort && this.sort.length > 0) {
      sql = sql + " order by " + this.sort;
    }
    var db = tx ? tx : this.db;
    return db.query(sql, ids, this.map, this.bools);
  };
  return QueryRepository;
}());
exports.QueryRepository = QueryRepository;
var SqlWriter = (function () {
  function SqlWriter(db, table, attributes, toDB) {
    this.db = db;
    this.table = table;
    this.attributes = attributes;
    this.toDB = toDB;
    var x = build_1.buildMetadata(attributes);
    this.primaryKeys = x.keys;
    this.map = x.map;
    this.bools = x.bools;
    this.version = x.version;
    this.createdAt = x.createdAt;
    this.updatedAt = x.updatedAt;
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.patch = this.patch.bind(this);
  }
  SqlWriter.prototype.create = function (obj, tx) {
    var obj2 = obj;
    if (this.toDB) {
      obj2 = this.toDB(obj);
    }
    if (this.createdAt) {
      obj2[this.createdAt] = new Date();
    }
    if (this.updatedAt) {
      obj2[this.updatedAt] = new Date();
    }
    var stmt = build_1.buildToInsert(obj2, this.table, this.attributes, this.db.param, this.version);
    if (!stmt.query) {
      throw new Error("cannot build insert query");
    }
    var db = tx ? tx : this.db;
    return db.execute(stmt.query, stmt.params).catch(function (err) {
      if (err && err.error === "duplicate") {
        return 0;
      }
      else {
        throw err;
      }
    });
  };
  SqlWriter.prototype.update = function (obj, tx) {
    return __awaiter(this, void 0, void 0, function () {
      var obj2, stmt, db, rowsAffected, selectCols, cols, args, i, _i, _a, k, field, query, res;
      return __generator(this, function (_b) {
        switch (_b.label) {
          case 0:
            obj2 = obj;
            if (this.toDB) {
              obj2 = this.toDB(obj);
            }
            if (this.updatedAt) {
              obj2[this.updatedAt] = new Date();
            }
            stmt = build_1.buildToUpdate(obj2, this.table, this.attributes, this.db.param, this.primaryKeys, this.version);
            if (!stmt.query) {
              throw new Error("cannot build update query by id");
            }
            db = tx ? tx : this.db;
            return [4, db.execute(stmt.query, stmt.params)];
          case 1:
            rowsAffected = _b.sent();
            if (!(this.version && rowsAffected === 0)) return [3, 3];
            selectCols = [];
            cols = [];
            args = [];
            i = 1;
            for (_i = 0, _a = this.primaryKeys; _i < _a.length; _i++) {
              k = _a[_i];
              if (k.name) {
                field = k.column ? k.column : k.name;
                selectCols.push(field);
                cols.push(field + " = " + this.db.param(i++));
                args.push(obj[k.name]);
              }
            }
            query = "select " + selectCols.join(",") + " from " + this.table + " where " + cols.join(" and ");
            return [4, db.query(query, args, this.map, this.bools)];
          case 2:
            res = _b.sent();
            return [2, !res || res.length === 0 ? -1 : 0];
          case 3: return [2, rowsAffected];
        }
      });
    });
  };
  SqlWriter.prototype.patch = function (obj, tx) {
    return this.update(obj, tx);
  };
  return SqlWriter;
}());
exports.SqlWriter = SqlWriter;
var CRUDRepository = (function (_super) {
  __extends(CRUDRepository, _super);
  function CRUDRepository(db, table, attributes, toDB, fromDB) {
    var _this = _super.call(this, db, table, attributes, toDB) || this;
    _this.fromDB = fromDB;
    _this.metadata = _this.metadata.bind(_this);
    _this.all = _this.all.bind(_this);
    _this.load = _this.load.bind(_this);
    _this.exist = _this.exist.bind(_this);
    _this.delete = _this.delete.bind(_this);
    return _this;
  }
  CRUDRepository.prototype.metadata = function () {
    return this.attributes;
  };
  CRUDRepository.prototype.all = function (tx) {
    var sql = "select * from " + this.table;
    var db = tx ? tx : this.db;
    return db.query(sql, [], this.map, this.bools);
  };
  CRUDRepository.prototype.load = function (id, tx) {
    var stmt = build_1.select(id, this.table, this.primaryKeys, this.db.param);
    if (!stmt.query) {
      throw new Error("cannot build query by id");
    }
    var fn = this.fromDB;
    var db = tx ? tx : this.db;
    if (fn) {
      return db.query(stmt.query, stmt.params, this.map, this.bools).then(function (res) {
        if (!res || res.length === 0) {
          return null;
        }
        else {
          var obj = res[0];
          return fn(obj);
        }
      });
    }
    else {
      return db.query(stmt.query, stmt.params, this.map, this.bools).then(function (res) { return (!res || res.length === 0 ? null : res[0]); });
    }
  };
  CRUDRepository.prototype.exist = function (id, tx) {
    var field = this.primaryKeys[0].column ? this.primaryKeys[0].column : this.primaryKeys[0].name;
    var stmt = build_1.exist(id, this.table, this.primaryKeys, this.db.param, field);
    if (!stmt.query) {
      throw new Error("cannot build query by id");
    }
    var db = tx ? tx : this.db;
    return db.query(stmt.query, stmt.params).then(function (res) { return (!res || res.length === 0 ? false : true); });
  };
  CRUDRepository.prototype.delete = function (id, tx) {
    var stmt = build_1.buildToDelete(id, this.table, this.primaryKeys, this.db.param);
    if (stmt.query) {
      var db = tx ? tx : this.db;
      return db.execute(stmt.query, stmt.params);
    }
    else {
      throw new Error("cannot build delete query by id");
    }
  };
  return CRUDRepository;
}(SqlWriter));
exports.CRUDRepository = CRUDRepository;
exports.GenericRepository = CRUDRepository;
exports.SqlGenericRepository = CRUDRepository;
var SqlSearchWriter = (function (_super) {
  __extends(SqlSearchWriter, _super);
  function SqlSearchWriter(db, table, attributes, buildQ, toDB, fromDB, sort, q, excluding, buildSort, total) {
    var _this = _super.call(this, db, table, attributes, buildQ, fromDB, sort, q, excluding, buildSort, total) || this;
    _this.db = db;
    _this.attributes = attributes;
    _this.toDB = toDB;
    var x = build_1.buildMetadata(attributes);
    if (x) {
      _this.version = x.version;
    }
    _this.create = _this.create.bind(_this);
    _this.update = _this.update.bind(_this);
    _this.patch = _this.patch.bind(_this);
    return _this;
  }
  SqlSearchWriter.prototype.create = function (obj, tx) {
    var obj2 = obj;
    if (this.toDB) {
      obj2 = this.toDB(obj);
    }
    if (this.createdAt) {
      obj2[this.createdAt] = new Date();
    }
    if (this.updatedAt) {
      obj2[this.updatedAt] = new Date();
    }
    var stmt = build_1.buildToInsert(obj2, this.table, this.attributes, this.db.param, this.version);
    if (!stmt.query) {
      throw new Error("cannot build insert query");
    }
    var db = tx ? tx : this.db;
    return db.execute(stmt.query, stmt.params).catch(function (err) {
      if (err && err.error === "duplicate") {
        return 0;
      }
      else {
        throw err;
      }
    });
  };
  SqlSearchWriter.prototype.update = function (obj, tx) {
    return __awaiter(this, void 0, void 0, function () {
      var obj2, stmt, db, rowsAffected, selectCols, cols, args, i, _i, _a, k, field, query, res;
      return __generator(this, function (_b) {
        switch (_b.label) {
          case 0:
            obj2 = obj;
            if (this.toDB) {
              obj2 = this.toDB(obj);
            }
            if (this.updatedAt) {
              obj2[this.updatedAt] = new Date();
            }
            stmt = build_1.buildToUpdate(obj2, this.table, this.attributes, this.db.param, this.primaryKeys, this.version);
            if (!stmt.query) {
              throw new Error("cannot build update query by id");
            }
            db = tx ? tx : this.db;
            return [4, db.execute(stmt.query, stmt.params)];
          case 1:
            rowsAffected = _b.sent();
            if (!(this.version && rowsAffected === 0)) return [3, 3];
            selectCols = [];
            cols = [];
            args = [];
            i = 1;
            for (_i = 0, _a = this.primaryKeys; _i < _a.length; _i++) {
              k = _a[_i];
              if (k.name) {
                field = k.column ? k.column : k.name;
                selectCols.push(field);
                cols.push(field + " = " + this.db.param(i++));
                args.push(obj[k.name]);
              }
            }
            query = "select " + selectCols.join(",") + " from " + this.table + " where " + cols.join(" and ");
            return [4, db.query(query, args, this.map, this.bools)];
          case 2:
            res = _b.sent();
            return [2, !res || res.length === 0 ? -1 : 0];
          case 3: return [2, rowsAffected];
        }
      });
    });
  };
  SqlSearchWriter.prototype.patch = function (obj, tx) {
    return this.update(obj, tx);
  };
  return SqlSearchWriter;
}(search_repository_1.SearchRepository));
exports.SqlSearchWriter = SqlSearchWriter;
var SqlRepository = (function (_super) {
  __extends(SqlRepository, _super);
  function SqlRepository(db, table, attributes, buildQ, toDB, fromDB, sort, q, excluding, buildSort, total) {
    var _this = _super.call(this, db, table, attributes, buildQ, toDB, fromDB, sort, q, excluding, buildSort, total) || this;
    _this.attributes = attributes;
    _this.toDB = toDB;
    _this.metadata = _this.metadata.bind(_this);
    _this.all = _this.all.bind(_this);
    _this.load = _this.load.bind(_this);
    _this.exist = _this.exist.bind(_this);
    _this.delete = _this.delete.bind(_this);
    return _this;
  }
  SqlRepository.prototype.metadata = function () {
    return this.attributes;
  };
  SqlRepository.prototype.all = function (tx) {
    var sql = "select * from " + this.table;
    var db = tx ? tx : this.db;
    return db.query(sql, [], this.map, this.bools);
  };
  SqlRepository.prototype.load = function (id, tx) {
    var stmt = build_1.select(id, this.table, this.primaryKeys, this.db.param);
    if (!stmt.query) {
      throw new Error("cannot build query by id");
    }
    var fn = this.fromDB;
    var db = tx ? tx : this.db;
    if (fn) {
      return db.query(stmt.query, stmt.params, this.map, this.bools).then(function (res) {
        if (!res || res.length === 0) {
          return null;
        }
        else {
          var obj = res[0];
          return fn(obj);
        }
      });
    }
    else {
      return db.query(stmt.query, stmt.params, this.map, this.bools).then(function (res) { return (!res || res.length === 0 ? null : res[0]); });
    }
  };
  SqlRepository.prototype.exist = function (id, tx) {
    var field = this.primaryKeys[0].column ? this.primaryKeys[0].column : this.primaryKeys[0].name;
    var stmt = build_1.exist(id, this.table, this.primaryKeys, this.db.param, field);
    if (!stmt.query) {
      throw new Error("cannot build query by id");
    }
    var db = tx ? tx : this.db;
    return db.query(stmt.query, stmt.params).then(function (res) { return (!res || res.length === 0 ? false : true); });
  };
  SqlRepository.prototype.delete = function (id, tx) {
    var stmt = build_1.buildToDelete(id, this.table, this.primaryKeys, this.db.param);
    if (stmt.query) {
      var db = tx ? tx : this.db;
      return db.execute(stmt.query, stmt.params);
    }
    else {
      throw new Error("cannot build delete query by id");
    }
  };
  return SqlRepository;
}(SqlSearchWriter));
exports.SqlRepository = SqlRepository;
exports.Repository = SqlRepository;
var Query = (function (_super) {
  __extends(Query, _super);
  function Query(db, table, attributes, buildQ, fromDB, sort, q, excluding, buildSort, total) {
    var _this = _super.call(this, db, table, attributes, buildQ, fromDB, sort, q, excluding, buildSort, total) || this;
    var m = build_1.buildMetadata(attributes);
    _this.primaryKeys = m.keys;
    _this.map = m.map;
    _this.bools = m.bools;
    if (_this.metadata) {
      _this.metadata = _this.metadata.bind(_this);
    }
    _this.all = _this.all.bind(_this);
    _this.load = _this.load.bind(_this);
    _this.exist = _this.exist.bind(_this);
    return _this;
  }
  Query.prototype.metadata = function () {
    return this.attrs;
  };
  Query.prototype.all = function (tx) {
    var sql = "select * from " + this.table;
    var db = tx ? tx : this.db;
    return db.query(sql, [], this.map, this.bools);
  };
  Query.prototype.load = function (id, tx) {
    var stmt = build_1.select(id, this.table, this.primaryKeys, this.db.param);
    if (!stmt.query) {
      throw new Error("cannot build query by id");
    }
    var db = tx ? tx : this.db;
    var fn = this.fromDB;
    if (fn) {
      return db.query(stmt.query, stmt.params, this.map, this.bools).then(function (res) {
        if (!res || res.length === 0) {
          return null;
        }
        else {
          var obj = res[0];
          return fn(obj);
        }
      });
    }
    else {
      return this.db.query(stmt.query, stmt.params, this.map, this.bools).then(function (res) { return (!res || res.length === 0 ? null : res[0]); });
    }
  };
  Query.prototype.exist = function (id, tx) {
    var field = this.primaryKeys[0].column ? this.primaryKeys[0].column : this.primaryKeys[0].name;
    var stmt = build_1.exist(id, this.table, this.primaryKeys, this.db.param, field);
    if (!stmt.query) {
      throw new Error("cannot build query by id");
    }
    var db = tx ? tx : this.db;
    return db.query(stmt.query, stmt.params, undefined, undefined).then(function (res) { return (!res || res.length === 0 ? false : true); });
  };
  return Query;
}(search_repository_1.SearchRepository));
exports.Query = Query;
