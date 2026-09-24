"use strict";
/**
 * Automatic voice calls for severe escalations.
 *
 * No provider is wired up yet, so every attempt reports NOT_CONFIGURED and the app falls back to the
 * call/SMS buttons. To enable real calls, implement VoiceProvider for your telephony service
 * (Exotel, Twilio, Plivo, ...) and return it from loadProvider() based on VOICE_PROVIDER in .env.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.voiceCallsEnabled = void 0;
exports.placeCalls = placeCalls;
function loadProvider() {
    switch ((process.env.VOICE_PROVIDER || '').toLowerCase()) {
        // case 'exotel': return new ExotelProvider(process.env.EXOTEL_SID!, process.env.EXOTEL_TOKEN!, ...);
        default:
            return null;
    }
}
const provider = loadProvider();
const voiceCallsEnabled = () => provider !== null;
exports.voiceCallsEnabled = voiceCallsEnabled;
async function placeCalls(targets, message) {
    const reachable = targets.filter((t) => t.phone);
    if (!reachable.length)
        return 'NONE';
    if (!provider)
        return 'NOT_CONFIGURED';
    const results = await Promise.allSettled(reachable.map((t) => provider.call(t, message)));
    results.forEach((r, i) => r.status === 'rejected' && console.error(`Voice call to ${reachable[i].name} failed:`, r.reason));
    return results.some((r) => r.status === 'fulfilled') ? 'PLACED' : 'FAILED';
}
