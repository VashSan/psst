/**
 * Flags to use as log level
 */
export enum LogLevel {
    Debug = 1,
    Info  = 2,
    Warn  = 4,
    Error = 8
}

/**
 * An object that is able to write a log message to a distinct target.
 */
export interface ILogTarget {
    log(level: LogLevel, text: string, ...args: any[]): void;
}

/**
 * An object that is able to log different kind of log messages to 
 * an ILogTarget.
 */
export interface ILogger {
    /**
     * Add a new log target to the logger
     * @param target is a new log target instance
     */
    add(target: ILogTarget) : void;

    /**
     * Remove an existing log target from the logger
     * @param target the log target instance to remove.
     */
    remove(target: ILogTarget) : void;

    /**
     * A log message usually used for development purposes.
     * @param text to log
     * @param args formatting arguments
     */
    log(text: any, ...args: any[]) : void;

    /**
     * A log message for general purposes about program runtime.
     * @param text to log
     * @param args formatting arguments
     */
    info(text: any, ...args: any[]) : void;

    /**
     * A log message that warns the user about assumptions and conditions that
     * are outside of the happy path.
     * @param text to log
     * @param args formatting arguments
     */
    warn(text: any, ...args: any[]) : void;

    /**
     * A log message usually intended for the developer in an unrecoverable
     * situation. It usally should be understandable for the user as well.
     * @param text to log
     * @param args formatting arguments
     */
    error(text: any, ...args: any[]) : void;
}