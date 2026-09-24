"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDateString = exports.indiaDate = void 0;
exports.distanceMeters = distanceMeters;
exports.recentDates = recentDates;
const EARTH_RADIUS_M = 6371000;
const toRad = (deg) => (deg * Math.PI) / 180;
/** Great-circle distance in metres between two lat/lng points. */
function distanceMeters(lat1, lng1, lat2, lng2) {
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}
const IST_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
/** Calendar day (YYYY-MM-DD) in India time; attendance days roll over at IST midnight. */
const indiaDate = (d = new Date()) => IST_DATE.format(d);
exports.indiaDate = indiaDate;
const isDateString = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
exports.isDateString = isDateString;
/** The `count` India-time days ending at `end`, oldest first. */
function recentDates(count, end = new Date()) {
    const out = [];
    for (let i = count - 1; i >= 0; i--)
        out.push((0, exports.indiaDate)(new Date(end.getTime() - i * 86400000)));
    return out;
}
