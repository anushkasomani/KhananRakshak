"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
/** One shared client for the whole server. SQLite allows only one writer at a time, so separate clients per file just add lock contention. */
exports.prisma = new client_1.PrismaClient();
