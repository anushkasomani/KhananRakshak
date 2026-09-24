"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleLevel = exports.isRole = exports.USER_STATUSES = exports.TRADES = exports.OFFICER_TYPES = exports.ROLE_LEVEL = exports.ROLES = void 0;
exports.adminEmails = adminEmails;
exports.validateProfile = validateProfile;
exports.ROLES = ['WORKER', 'SUPERVISOR', 'OFFICER', 'MINE_MANAGER', 'PROJECT_MANAGER', 'DGMS'];
exports.ROLE_LEVEL = {
    WORKER: 1,
    SUPERVISOR: 2,
    OFFICER: 3,
    MINE_MANAGER: 4,
    PROJECT_MANAGER: 5,
    DGMS: 6,
};
exports.OFFICER_TYPES = ['SAFETY', 'VENTILATION', 'ELECTRICAL', 'MECHANICAL', 'SURVEY', 'BLASTING', 'OTHER'];
exports.TRADES = ['DRILLER', 'ELECTRICIAN', 'FITTER', 'BLASTER', 'OPERATOR', 'HELPER', 'OTHER'];
exports.USER_STATUSES = ['NEW', 'PENDING', 'APPROVED', 'REJECTED'];
const isRole = (v) => typeof v === 'string' && exports.ROLES.includes(v);
exports.isRole = isRole;
const roleLevel = (role) => ((0, exports.isRole)(role) ? exports.ROLE_LEVEL[role] : 0);
exports.roleLevel = roleLevel;
function adminEmails() {
    return (process.env.ADMIN_EMAILS || '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
}
// Returns an error message, or null when the combination is valid.
function validateProfile({ role, officerType, trade, mineId }) {
    if (!(0, exports.isRole)(role))
        return 'Choose a valid role.';
    if (role === 'OFFICER' && !exports.OFFICER_TYPES.includes(officerType))
        return 'Choose an officer type.';
    if (role === 'WORKER' && !exports.TRADES.includes(trade))
        return 'Choose a trade.';
    if (role !== 'DGMS' && !mineId)
        return 'Choose a mine.';
    return null;
}
