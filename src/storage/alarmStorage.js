import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@alarm_logs_v1";

/**
 * Saves a new alarm to local storage.
 * @param {object} newAlarm - { deviceId, message, status (optional) }
 */
export async function saveAlarm(newAlarm) {
    try {
        const existingStr = await AsyncStorage.getItem(KEY);
        let alarms = existingStr ? JSON.parse(existingStr) : [];

        // Create entry
        const entry = {
            id: Date.now().toString() + Math.random().toString().slice(2, 6),
            deviceId: newAlarm.deviceId || "Unknown",
            message: newAlarm.message || "Alarm triggered",
            status: newAlarm.status || "Alarm",
            dateTime: new Date().toLocaleString("en-GB"), // format: DD/MM/YYYY, HH:MM:SS roughly depends on locale
            ts: Date.now(),
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
        return json ? JSON.parse(json) : [];
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
