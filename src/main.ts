import * as fs from "fs";
import { aggregateMeasurementsByTestCase, calculateMaxAndAverageMeasurements, getStartAndEndTimeOfTestCasesInLog } from "./functions";
import { AggregatedTestCaseWithIterationMaxAvgMap, AggregatedTestCaseWithMeasurementsMap, JsonFormat, TimedTestCaseWithIterationMap } from "./types";

let startTime = Date.now();
console.log("Starting...\n\nReading log file...");
const logLines = fs.readFileSync("logs.log", "utf8").toString().split("\n");
console.log("Found " + logLines.length + " lines...");
let testCases: TimedTestCaseWithIterationMap = getStartAndEndTimeOfTestCasesInLog(logLines);

console.log("Found " + Object.keys(testCases).length + " test cases.\n");
// console.log(testCases);

const stats: JsonFormat = JSON.parse(fs.readFileSync("raw-stats.json", "utf8"));
console.log("Found " + Object.keys(stats).length + " stat entries...\n");

console.log("Aggregating measurements by test case...");
let aggregatedMeasurementsByTestCase: AggregatedTestCaseWithMeasurementsMap = aggregateMeasurementsByTestCase(testCases, stats);
console.log("Done aggregating measurements by test case.\n");

console.log("Calculating max and average measurements for each test case...");
let aggregatedMeasurementsByTestCaseWithMaxAndAverageStats: AggregatedTestCaseWithIterationMaxAvgMap =
	calculateMaxAndAverageMeasurements(aggregatedMeasurementsByTestCase);
console.log("Done calculating max and average measurements for each test case.\n");

console.log("Writing aggregated stats to file...");
fs.writeFileSync("aggregated-stats.json", JSON.stringify(aggregatedMeasurementsByTestCaseWithMaxAndAverageStats, null, 2));

let endTime = Date.now();
console.log("Done writing aggregated stats to file.\n\nFinished. Took " + (endTime - startTime) + "ms.");
