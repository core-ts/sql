"use strict";
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
    return new LogExecutor(db, err, lg, q, result, r, duration);
  }
  return db;
}
exports.useLog = useLog;
var LogExecutor = (function () {
  function LogExecutor(db, err, lg, q, result, r, duration) {
    this.db = db;
    this.driver = db.driver;
    this.duration = duration && duration.length > 0 ? duration : "duration";
    this.sql = q === undefined ? "" : q;
    this.return = r !== undefined && r != null ? r : "count";
    this.result = result !== undefined && result != null ? result : "";
    this.log = lg;
    this.error = err;
    this.param = this.param.bind(this);
    this.execute = this.execute.bind(this);
    this.executeBatch = this.executeBatch.bind(this);
    this.query = this.query.bind(this);
    this.queryOne = this.queryOne.bind(this);
    this.executeScalar = this.executeScalar.bind(this);
    this.count = this.count.bind(this);
  }
  LogExecutor.prototype.param = function (i) {
    return this.db.param(i);
  };
  LogExecutor.prototype.execute = function (sql, args, ctx) {
    var _this = this;
    var t1 = new Date();
    return this.db
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
    return this.db
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
    return this.db
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
    return this.db
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
    return this.db
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
    return this.db
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
