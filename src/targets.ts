import * as moment from "moment";
import * as fs from "fs";
import { isNullOrUndefined } from "util";

import { Logger } from "./logger";
import { LogLevel, ILogger, ILogTarget } from "./contracts";

export class LogManager {
    private static singleLogger: ILogger;
    private static consoleTarget: ILogTarget | undefined;
    private static mapOfFileTargets: Map<string, ILogTarget> = new Map<string, ILogTarget>();

    public static getLogger(): ILogger {
        if (this.singleLogger == undefined) {
            this.singleLogger = new Logger();
            this.addConsoleTarget();
        }
        return this.singleLogger;
    }

    public static addConsoleTarget() {
        if (this.consoleTarget == undefined) {
            this.consoleTarget = this.createConsoleTarget();
        }
        let logger = this.getLogger();
        logger.add(this.consoleTarget);
        return this.consoleTarget;
    }

    public static removeConsoleTarget() {
        if (this.consoleTarget != undefined) {
            let logger = this.getLogger();
            logger.remove(this.consoleTarget);
            this.consoleTarget = undefined;
        }
    }

    public static createConsoleTarget(): ILogTarget {
        return new ConsoleTarget();
    }

    public static addFileTarget(logPath: string, maxLogAgeDays: number): void {
        let fileTarget = this.mapOfFileTargets.get(logPath);
        if (fileTarget != undefined) {
            return;
        }

        fileTarget = this.createFileTarget(logPath, maxLogAgeDays);
        this.mapOfFileTargets.set(logPath, fileTarget);

        let logger = this.getLogger();
        logger.add(fileTarget);
    }

    public static removeFileTarget(logPath: string): void {
        let fileTarget = this.mapOfFileTargets.get(logPath);
        if (fileTarget == undefined) {
            return;
        }

        this.mapOfFileTargets.delete(logPath);

        let logger = this.getLogger();
        logger.remove(fileTarget);
    }

    public static createFileTarget(logPath: string, maxLogAgeDays: number): ILogTarget {
        return new FileTarget(logPath, maxLogAgeDays);
    }

}

class Colorize {
    private static readonly color = {
        Reset: "\x1b[0m",
        Bright: "\x1b[1m",
        Dim: "\x1b[2m",
        Underscore: "\x1b[4m",
        Blink: "\x1b[5m",
        Reverse: "\x1b[7m",
        Hidden: "\x1b[8m",

        FgBlack: "\x1b[30m",
        FgRed: "\x1b[31m",
        FgGreen: "\x1b[32m",
        FgYellow: "\x1b[33m",
        FgBlue: "\x1b[34m",
        FgMagenta: "\x1b[35m",
        FgCyan: "\x1b[36m",
        FgWhite: "\x1b[37m",

        BgBlack: "\x1b[40m",
        BgRed: "\x1b[41m",
        BgGreen: "\x1b[42m",
        BgYellow: "\x1b[43m",
        BgBlue: "\x1b[44m",
        BgMagenta: "\x1b[45m",
        BgCyan: "\x1b[46m",
        BgWhite: "\x1b[47m",
    };

    private colorize(color: string, text: string): string {
        return `${color}${text}${Colorize.color.Reset}`;
    }

    public white(text: string): string {
        return this.colorize(Colorize.color.FgWhite, text);
    };

    public red(text: string): string {
        return this.colorize(Colorize.color.FgRed, text);
    };

    public green(text: string): string {
        return this.colorize(Colorize.color.FgGreen, text);
    };

    public yellow(text: string): string {
        return this.colorize(Colorize.color.FgYellow, text);
    };
}

class ConsoleTarget implements ILogTarget {
    private colorizer: Colorize = new Colorize();

    log(level: LogLevel, message: string, ...args: any[]) {
        const now = moment();
        const time = now.format("hh:mm:ss.SSS");
        const text = `${time}\t${message}`;
        const c = this.colorizer;

        switch (level) {
            case LogLevel.Debug:
                console.log(c.white(text), ...args);
                break;
            case LogLevel.Info:
                console.info(c.green(text), ...args);
                break;
            case LogLevel.Warn:
                console.warn(c.yellow(text), ...args);
                break;
            default:
            // all undefined levels are handled as error
            case LogLevel.Error:
                console.error(c.red(text), ...args);
                console.trace();
        }
    }
}

class FileTarget implements ILogTarget {
    private logPath: string;
    private newLine: string;
    private initDate: moment.Moment;

    private maxLogAgeInDays = 10;
    private fileName = "";
    private readonly dateFormat = "YYYY-MM-DD";

    constructor(logPath: string, maxLogAgeDays: number) {
        this.newLine = process.platform == "win32" ? "\r\n" : "\n";
        this.initDate = moment();
        this.logPath = logPath;
        this.maxLogAgeInDays = maxLogAgeDays;

        this.updateFileName();
        this.cleanupOldFiles();
    }

    log(level: LogLevel, text: string, ...args: any[]) {
        let now = moment();

        this.updateFileName(now);

        let time = now.format("YYYY-MM-DD hh:mm:ss.SSS Z");
        let data: string;
        let kind = level.toString();
        if (args.length > 0) {
            let argsJoined = args.join("");
            data = `${time}\t${kind}\t${text}\t${argsJoined}${this.newLine}`;
        } else {
            data = `${time}\t${kind}\t${text}${this.newLine}`;
        }

        fs.open(this.fileName, 'a', (err, fd) => {
            if (err) {
                console.error("failed to open log file");
                return;
            }
            fs.appendFile(fd, data, (err) => {
                if (err) {
                    console.error("failed to write to log file");
                }
            });
        });
    }

    private updateFileName(now?: moment.Moment) {
        if (isNullOrUndefined(now)) {
            now = this.initDate;
        }
        if (now.day() != this.initDate.day() || this.fileName.length == 0) {
            this.initDate = now;
            let date = now.format(this.dateFormat);
            this.fileName = `${this.logPath}\\${date}.log`;
        }
    }

    private cleanupOldFiles() {
        let that = this;
        let threshold = moment().subtract(that.maxLogAgeInDays, "days");

        fs.readdir(this.logPath, (err, listOfFiles) => {
            if (!isNullOrUndefined(err)) {
                console.error(err); // dont use Logger ... we could get in to endless recursion
                return;
            }

            for (const file of listOfFiles) {
                that.cleanupOldLogFile(file, threshold, that);
            }
        });
    }

    private cleanupOldLogFile(file: string, threshold: moment.Moment, that: FileTarget) {
        let filePath = `${that.logPath}\\${file}`;
        if (file.endsWith(".log")) {
            let fileDateString = file.substr(0, that.dateFormat.length);
            let fileDate = moment(fileDateString);
            if (fileDate.isBefore(threshold)) {
                fs.unlink(filePath, (err) => {
                    if (!isNullOrUndefined(err)) {
                        console.error(err); // dont use Logger ... we could get in to endless recursion
                    }
                });
            }
        }
    }
}