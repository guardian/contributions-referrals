export function logError(msg: string, ...args: any[]) {
    console.error.apply(null, [`[ERROR] ${msg}`, ...args]);
}

export function logWarning(msg: string, ...args: any[]) {
    console.log.apply(null, [`[WARN] ${msg}`, ...args]);
}

export function logInfo(msg: string, ...args: any[]) {
    console.log.apply(null, [`[INFO] ${msg}`, ...args]);
}
