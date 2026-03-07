export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

export function timeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') {
        throw new Error('Invalid time string');
    }

    const [hours, minutes] = timeStr.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        throw new Error('Invalid time format');
    }

    return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes) {
    const normalized = Math.max(0, totalMinutes);
    const hours = Math.floor(normalized / 60);
    const minutes = normalized % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function addMinutesToTime(timeStr, minutes) {
    return minutesToTime(timeToMinutes(timeStr) + minutes);
}

export function subtractMinutesFromTime(timeStr, minutes) {
    return addMinutesToTime(timeStr, -minutes);
}

export function calculateDuration(startTime, endTime) {
    return timeToMinutes(endTime) - timeToMinutes(startTime);
}

export function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function parseDateKey(dateStr) {
    return new Date(`${dateStr}T00:00:00`);
}

export function compareDateKeys(a, b) {
    return parseDateKey(b) - parseDateKey(a);
}

export function getHourFromTime(timeStr) {
    return Math.floor(timeToMinutes(timeStr) / 60);
}
