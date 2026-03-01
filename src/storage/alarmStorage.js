import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@alarm_logs_v1";

// Format timestamp into desired string: "Tue, Jan 27, 2026, 00:44:43 GMT+5:30"
function formatIstDate(ts = Date.now()) {
    const date = new Date(ts);

    // Build parts in Asia/Kolkata timezone
    const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        weekday: "short",
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
    const parts = fmt.formatToParts(date).reduce((acc, p) => {
        acc[p.type] = p.value;
        return acc;
    }, {});

    // Static IST offset label
    const offsetLabel = "GMT+5:30";

    return `${parts.weekday}, ${parts.month} ${parts.day}, ${parts.year}, ${parts.hour}:${parts.minute}:${parts.second} ${offsetLabel}`;
}

/**
 * Saves a new alarm to local storage.
 * @param {object} newAlarm - { deviceId, message, status (optional), ts (optional) }
 */
export async function saveAlarm(newAlarm) {
    try {
        const existingStr = await AsyncStorage.getItem(KEY);
        let alarms = existingStr ? JSON.parse(existingStr) : [];

        const tsVal = Number.isFinite(Number(newAlarm.ts)) ? Number(newAlarm.ts) : Date.now();

        // Derive fields with payload fallbacks (parse string payload if provided)
        const normalizePayload = (p) => {
            if (!p) return {};
            if (typeof p === "string") {
                try {
                    const parsed = JSON.parse(p);
                    return parsed && typeof parsed === "object" ? parsed : {};
                } catch {
                    return {};
                }
            }
            return typeof p === "object" ? p : {};
        };

        const payload = normalizePayload(newAlarm?.payload);
        const pickMessage = () => {
            const candidates = [
                payload.message,
                payload.Message,
                payload.msg,
                newAlarm.message,
            ];
            const found = candidates.find((v) => typeof v === "string" && v.trim().length > 0);
            return found || "Alarm triggered";
        };
        const deviceName =
            payload.deviceName ||
            payload.device_name ||
            newAlarm.deviceName ||
            newAlarm.device_name ||
            "Unknown";
        const message = pickMessage();
        const status =
            newAlarm.status ||
            (Number(payload.alarmFlag ?? newAlarm.alarmFlag) === 1 ? "Alarm" : "Ok");
        const alarmFlag = Number.isFinite(Number(payload.alarmFlag ?? newAlarm.alarmFlag))
            ? Number(payload.alarmFlag ?? newAlarm.alarmFlag)
            : null;

        // Create entry
        const entry = {
            id: Date.now().toString() + Math.random().toString().slice(2, 6),
            deviceId: newAlarm.deviceId || "Unknown",
            deviceName,
            message,
            status,
            alarmFlag,
            payload, // keep original payload (normalized) so UI can read future fields
            dateTime: formatIstDate(tsVal),
            ts: tsVal,
        };

        // Prepend new alarm
        alarms.unshift(entry);

        // Limit to last 500 alarms to save space
        if (alarms.length > 500) {
            alarms = alarms.slice(0, 500);
        }

        await AsyncStorage.setItem(KEY, JSON.stringify(alarms));
        return entry;
    } catch (e) {
        console.warn("Failed to save alarm:", e);
        return null;
    }
}

/**
 * Retrieves alarms, optionally filtered by date range.
 * Currently returns all alarms as date filtering can be done in UI or helper.
 */
export async function getAlarms() {
    try {
        const json = await AsyncStorage.getItem(KEY);
        const raw = json ? JSON.parse(json) : [];

        let mutated = false;
        const normalizePayload = (p) => {
            if (!p) return {};
            if (typeof p === "string") {
                try {
                    const parsed = JSON.parse(p);
                    return parsed && typeof parsed === "object" ? parsed : {};
                } catch {
                    return {};
                }
            }
            return typeof p === "object" ? p : {};
        };

        const normalized = (raw || []).map((entry) => {
            const tsNum = Number(entry?.ts ?? entry?.timestamp);
            const ts = Number.isFinite(tsNum) ? tsNum : Date.now();
            const formatted = formatIstDate(ts);
            const payload = normalizePayload(entry?.payload);
            const parseNameFromMessage = (msg) => {
                if (!msg) return undefined;
                const str = String(msg);
                if (!str.includes("-")) return undefined;
                return str.split("-").pop().trim() || undefined;
            };
            const pickMessage = () => {
                const candidates = [
                    payload.message,
                    payload.Message,
                    payload.msg,
                    entry.message,
                ];
                const found = candidates.find((v) => typeof v === "string" && v.trim().length > 0);
                return found || "Alarm triggered";
            };

            const next = {
                ...entry,
                payload, // ensure payload remains available to UI
                deviceName:
                    payload.deviceName ||
                    payload.device_name ||
                    entry.deviceName ||
                    entry.device_name ||
                    parseNameFromMessage(entry.message) ||
                    "Unknown",
                message: pickMessage(),
                status:
                    entry.status ||
                    (Number(payload.alarmFlag ?? entry.alarmFlag) === 1 ? "Alarm" : "Ok"),
                ts,
                dateTime: formatted,
            };
            if (next.ts !== entry?.ts || next.dateTime !== entry?.dateTime) mutated = true;
            return next;
        });

        if (mutated) {
            await AsyncStorage.setItem(KEY, JSON.stringify(normalized));
        }

        return normalized;
    } catch (e) {
        return [];
    }
}

/**
 * Clears all alarm logs.
 */
export async function clearAlarms() {
    try {
        await AsyncStorage.removeItem(KEY);
    } catch (e) {
        console.warn("Failed to clear alarms:", e);
    }
}
