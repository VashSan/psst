import { ILogTarget, ILogger, LogLevel } from "./contracts"

export class Logger implements ILogger {
    private level: LogLevel;
    private logTargets: ILogTarget[] = [];

    constructor( level: LogLevel = LogLevel.Debug | LogLevel.Error | LogLevel.Info | LogLevel.Warn ) {
        this.level = level;
    }

    public setLogLevel(level: LogLevel) {
        this.level = level;
    }

    public add(target: ILogTarget): void {
        let i = this.logTargets.indexOf(target);
        if (i == -1) {
            this.logTargets.push(target);
        }
    }

    public remove(target: ILogTarget): void {
        let i = this.logTargets.indexOf(target);
        if (i >= 0) {
            this.logTargets.splice(i, 1);
        }
    }

    public log(text: any, ...args: any[]) {
        if (this.level & LogLevel.Debug) {
            this.writeTarget(LogLevel.Debug, text, ...args);
        }
    }

    public info(text: any, ...args: any[]) {
        if (this.level & LogLevel.Info) {
            this.writeTarget(LogLevel.Info, text, ...args);
        }
    }

    public warn(text: any, ...args: any[]) {
        if (this.level & LogLevel.Warn) {
            this.writeTarget(LogLevel.Warn, text, ...args);
        }
    }

    public error(text: any, ...args: any[]) {
        if (this.level & LogLevel.Error) {
            this.writeTarget(LogLevel.Error, text, ...args);
        }
    }

    private writeTarget(level: LogLevel, text: string, ...args: any[]) {
        if (this.logTargets.length == 0) {
            console.error("No logger specified");
        }

        for (const target of this.logTargets) {
            target.log(level, text, ...args);
        }
    }
}