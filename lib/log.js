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
Object.defineProperty(exports, "__esModule", { value: true });
function log(db, isLog, logger, q, result, r, duration) {
  if (!isLog) {
    return db;
  }
  if (q !== undefined && q != null && q.length > 0) {
    if (!logger.isDebugEnabled()) {
      return db;
    }
    return new LogExecutor(db, logger.error, logger.debug, q, result, r, duration);
  }
  if (!logger.isInfoEnabled()) {
    return db;
  }
  return new LogExecutor(db, logger.error, logger.info, q, result, r, duration);
}
exports.log = log;
function useLog(db, isLog, err, lg, q, result, r, duration) {
  if (!isLog) {
    return db;
  }
  if (err) {
    return new LogDB(db, err, lg, q, result, r, duration);
  }
  return db;
}
exports.useLog = useLog;
var LogExecutor = (function () {
  function LogExecutor(executor, error, lg, q, result, r, duration) {
    this.executor = executor;
    this.error = error;
    this.driver = executor.driver;
    this.duration = duration && duration.length > 0 ? duration : "duration";
    this.sql = q === undefined ? "" : q;
    this.result = result !== undefined && result != null ? result : "";
    this.return = r !== undefined && r != null ? r : "count";
    this.log = lg;
    this.param = this.param.bind(this);
    this.execute = this.execute.bind(this);
    this.executeBatch = this.executeBatch.bind(this);
    this.query = this.query.bind(this);
    this.queryOne = this.queryOne.bind(this);
    this.executeScalar = this.executeScalar.bind(this);
    this.count = this.count.bind(this);
  }
  LogExecutor.prototype.param = function (i) {
    return this.executor.param(i);
  };
  LogExecutor.prototype.execute = function (sql, args, ctx) {
    var _this = this;
    var t1 = new Date();
    return this.executor
      .execute(sql, args, ctx)
      .then(function (v) {
      setTimeout(function () {
        if (_this.log) {
          var d = diff(t1);
          var obj = {};
          if (_this.sql.length > 0) {
            obj[_this.sql] = getString(sql, args);
          }
          if (_this.return.length > 0) {
            obj[_this.return] = v;
          }
          obj[_this.duration] = d;
          _this.log("query", obj);
        }
      }, 0);
      return v;
    })
      .catch(function (er) {
      setTimeout(function () {
        var d = diff(t1);
        var obj = {};
        if (_this.sql.length > 0) {
          obj[_this.sql] = getString(sql, args);
        }
        obj[_this.duration] = d;
        _this.error("error query: " + buildString(er));
      }, 0);
      throw er;
    });
  };
  LogExecutor.prototype.executeBatch = function (statements, firstSuccess, ctx) {
    var _this = this;
    var t1 = new Date();
    return this.executor
      .executeBatch(statements, firstSuccess, ctx)
      .then(function (v) {
      setTimeout(function () {
        if (_this.log) {
          var d = diff(t1);
          var obj = {};
          if (_this.sql.length > 0) {
            obj[_this.sql] = JSON.stringify(statements);
          }
          if (_this.return.length > 0) {
            obj[_this.return] = v;
          }
          obj[_this.duration] = d;
          _this.log("exec batch", obj);
        }
      }, 0);
      return v;
    })
      .catch(function (er) {
      setTimeout(function () {
        var d = diff(t1);
        var obj = {};
        if (_this.sql.length > 0) {
          obj[_this.sql] = JSON.stringify(statements);
        }
        obj[_this.duration] = d;
        _this.error("error exec batch: " + buildString(er));
      }, 0);
      throw er;
    });
  };
  LogExecutor.prototype.query = function (sql, args, m, bools, ctx) {
    var _this = this;
    var t1 = new Date();
    return this.executor
      .query(sql, args, m, bools, ctx)
      .then(function (v) {
      setTimeout(function () {
        if (_this.log) {
          var d = diff(t1);
          var obj = {};
          if (_this.sql.length > 0) {
            obj[_this.sql] = getString(sql, args);
          }
          if (_this.result.length > 0) {
            if (v && v.length > 0) {
              obj[_this.result] = JSON.stringify(v);
            }
          }
          if (_this.return.length > 0) {
            obj[_this.return] = v ? v.length : 0;
          }
          obj[_this.duration] = d;
          _this.log("query", obj);
        }
      }, 0);
      return v;
    })
      .catch(function (er) {
      setTimeout(function () {
        var d = diff(t1);
        var obj = {};
        if (_this.sql.length > 0) {
          obj[_this.sql] = getString(sql, args);
        }
        obj[_this.duration] = d;
        _this.error("error query: " + buildString(er));
      }, 0);
      throw er;
    });
  };
  LogExecutor.prototype.queryOne = function (sql, args, m, bools, ctx) {
    var _this = this;
    var t1 = new Date();
    return this.executor
      .queryOne(sql, args, m, bools, ctx)
      .then(function (v) {
      setTimeout(function () {
        if (_this.log) {
          var d = diff(t1);
          var obj = {};
          if (_this.sql.length > 0) {
            obj[_this.sql] = getString(sql, args);
          }
          if (_this.result.length > 0) {
            obj[_this.result] = v ? JSON.stringify(v) : "null";
          }
          if (_this.return.length > 0) {
            obj[_this.return] = v ? 1 : 0;
          }
          obj[_this.duration] = d;
          _this.log("query one", obj);
        }
      }, 0);
      return v;
    })
      .catch(function (er) {
      setTimeout(function () {
        var d = diff(t1);
        var obj = {};
        if (_this.sql.length > 0) {
          obj[_this.sql] = getString(sql, args);
        }
        obj[_this.duration] = d;
        _this.error("error query one: " + buildString(er));
      }, 0);
      throw er;
    });
  };
  LogExecutor.prototype.executeScalar = function (sql, args, ctx) {
    var _this = this;
    var t1 = new Date();
    return this.executor
      .executeScalar(sql, args, ctx)
      .then(function (v) {
      setTimeout(function () {
        if (_this.log) {
          var d = diff(t1);
          var obj = {};
          if (_this.sql.length > 0) {
            obj[_this.sql] = getString(sql, args);
          }
          if (_this.result.length > 0) {
            obj[_this.result] = v ? buildString(v) : "null";
          }
          if (_this.return.length > 0) {
            obj[_this.return] = v ? 1 : 0;
          }
          obj[_this.duration] = d;
          _this.log("exec scalar", obj);
        }
      }, 0);
      return v;
    })
      .catch(function (er) {
      setTimeout(function () {
        var d = diff(t1);
        var obj = {};
        if (_this.sql.length > 0) {
          obj[_this.sql] = getString(sql, args);
        }
        obj[_this.duration] = d;
        _this.error("error exec scalar: " + buildString(er));
      }, 0);
      throw er;
    });
  };
  LogExecutor.prototype.count = function (sql, args, ctx) {
    var _this = this;
    var t1 = new Date();
    return this.executor
      .count(sql, args)
      .then(function (v) {
      setTimeout(function () {
        if (_this.log) {
          var d = diff(t1);
          var obj = {};
          if (_this.sql.length > 0) {
            obj[_this.sql] = getString(sql, args);
          }
          if (_this.return.length > 0) {
            obj[_this.return] = v;
          }
          obj[_this.duration] = d;
          _this.log("count", obj);
        }
      }, 0);
      return v;
    })
      .catch(function (er) {
      setTimeout(function () {
        var d = diff(t1);
        var obj = {};
        if (_this.sql.length > 0) {
          obj[_this.sql] = getString(sql, args);
        }
        obj[_this.duration] = d;
        _this.error("error count: " + buildString(er));
      }, 0);
      throw er;
    });
  };
  return LogExecutor;
}());
exports.LogExecutor = LogExecutor;
function buildString(v) {
  if (typeof v === "string") {
    return v;
  }
  else {
    return JSON.stringify(v);
  }
}
function getString(sql, args) {
  if (args && args.length > 0) {
    return sql + " " + JSON.stringify(args);
  }
  else {
    return sql;
  }
}
function diff(d1) {
  var d2 = new Date();
  return d2.getTime() - d1.getTime();
}
exports.diff = diff;
var LogTransaction = (function (_super) {
  __extends(LogTransaction, _super);
  function LogTransaction(tx, err, lg, q, result, r, duration) {
    var _this = _super.call(this, tx, err, lg, q, result, r, duration) || this;
    _this.tx = tx;
    return _this;
  }
  LogTransaction.prototype.commit = function () {
    return this.tx.commit();
  };
  LogTransaction.prototype.rollback = function () {
    return this.tx.rollback();
  };
  return LogTransaction;
}(LogExecutor));
exports.LogTransaction = LogTransaction;
var LogDB = (function (_super) {
  __extends(LogDB, _super);
  function LogDB(db, err, lg, q, result, r, duration) {
    var _this = _super.call(this, db, err, lg, q, result, r, duration) || this;
    _this.db = db;
    return _this;
  }
  LogDB.prototype.beginTransaction = function () {
    var _this = this;
    return this.db.beginTransaction().then(function (tx) {
      return new LogTransaction(tx, _this.error, _this.log, _this.sql, _this.result, _this.return, _this.duration);
    });
  };
  return LogDB;
}(LogExecutor));
exports.LogDB = LogDB;
