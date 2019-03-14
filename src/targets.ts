import * as moment from "moment";
import * as fs from "fs";
import { isNullOrUndefined } from "util";

import { Logger } from "./logger";
import { LogLevel, ILogger, ILogTarget } from "./contracts";

export class LogFactory { 
    private static singleLogger: ILogger;

    public static getLogger(level: LogLevel) : ILogger {
        if (this.singleLogger == undefined) {
            this.singleLogger = new Logger(level, []);
        }
        return this.singleLogger;
    }

    public static createConsoleTarget() : ILogTarget {
        return new ConsoleTarget();
    }

    public static createFileTarget(logPath: string, maxLogAgeDays: number) : ILogTarget {
        return new FileTarget(logPath, maxLogAgeDays);
    }
}

class ConsoleTarget implements ILogTarget {
    log(level: LogLevel, message: string, ...args: any[]) {
        let now =  moment();
        let time = now.format("hh:mm:ss.SSS");
        let text = `${time}\t${message}`;

        switch (level) {
            case LogLevel.Debug:
                console.log(text, ...args);
                break;
            case LogLevel.Info:
                console.info(text, ...args);
                break;
            case LogLevel.Warn:
                console.warn(text, ...args);
                break;
            default:
            // all undefined levels are handled as error
            case LogLevel.Error:
                console.error(text, ...args);
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