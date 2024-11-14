"use strict";
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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
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
exports.databaseRepo = void 0;
require('dotenv').config();
// dbRepo.ts
var knex_1 = require("knex");
var constants_1 = require("./constants");
var db = (0, knex_1.default)({
    client: 'pg',
    connection: {
        host: process.env.REDSHIFT_HOST,
        port: Number(process.env.REDSHIFT_PORT) || 5439,
        user: process.env.REDSHIFT_USER,
        password: process.env.REDSHIFT_PASSWORD,
        database: process.env.REDSHIFT_DATABASE,
    },
});
exports.databaseRepo = {
    getFirst10Recordss: function (tableName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db(tableName).select('*').limit(10)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    /**
     * Get the first 10 records from any table.
     * @param tableName Name of the table to query
     */
    getFirst10Records: function (tableName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db(tableName).select('*').limit(10)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    /**
     * Get all records from any table.
     * @param tableName Name of the table to query
     */
    getAll: function (tableName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db(tableName).select('*')];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    /**
     * Get a record by its ID from any table.
     * @param tableName Name of the table
     * @param idColumn Column name of the ID (primary key)
     * @param id ID value to look for
     */
    get: function (tableName, idColumn, id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db(tableName)
                            .where(idColumn, id)
                            .first()];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    /**
     * Get records matching a specific condition from any table.
     * @param tableName Name of the table
     * @param condition Condition as an object (e.g., `{ columnName: value }`)
     */
    getWhere: function (tableName, condition, distinctColumn, orderByColumn, excludeCondition, rawQuery, rawQueryParams) {
        return __awaiter(this, void 0, void 0, function () {
            var query;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = db(tableName);
                        if (condition) {
                            query = query.where(condition);
                        }
                        if (excludeCondition) {
                            query = query.whereNot(excludeCondition);
                        }
                        if (rawQuery) {
                            query = query.andWhereRaw(rawQuery, rawQueryParams);
                        }
                        if (distinctColumn && tableName !== constants_1.TABLES.CUSTOMERS) {
                            query = query.distinct(distinctColumn);
                        }
                        if (orderByColumn) {
                            query = query.orderBy(orderByColumn, 'desc');
                        }
                        console.log('Executing SQL query:', query.toString());
                        return [4 /*yield*/, query];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    getCount: function (tableName, condition, excludeCondition) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = db(tableName);
                        if (condition) {
                            query = query.where(condition);
                        }
                        if (excludeCondition) {
                            query = query.whereNot(excludeCondition);
                        }
                        query = query.count('* as count');
                        return [4 /*yield*/, query];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0].count];
                }
            });
        });
    },
    /**
     * Get specific columns from a table with optional conditions.
     * @param tableName Name of the table
     * @param columns Array of column names to retrieve
     * @param condition Optional condition object (e.g., `{ columnName: value }`)
     */
    getColumns: function (tableName_1, columns_1) {
        return __awaiter(this, arguments, void 0, function (tableName, columns, condition) {
            var _a;
            if (condition === void 0) { condition = {}; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, (_a = db(tableName)).select.apply(_a, columns).where(condition)];
                    case 1: return [2 /*return*/, _b.sent()];
                }
            });
        });
    },
    executeRawQuery: function (rawQuery, rawQueryParams) {
        return __awaiter(this, void 0, void 0, function () {
            var results, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, db.raw(rawQuery, rawQueryParams)];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, results.rows];
                    case 2:
                        error_1 = _a.sent();
                        console.error('Error executing raw SQL query:', error_1);
                        throw new Error('Failed to execute raw SQL query');
                    case 3: return [2 /*return*/];
                }
            });
        });
    },
    /**
     * Get records with pagination from any table.
     * @param tableName Name of the table
     * @param limit Number of records to retrieve
     * @param offset Number of records to skip
     */
    getWithPagination: function (tableName, limit, offset) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db(tableName).select('*').limit(limit).offset(offset)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    /**
     * Close the database connection (useful for cleanup)
     */
    closeConnection: function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.destroy()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
};
