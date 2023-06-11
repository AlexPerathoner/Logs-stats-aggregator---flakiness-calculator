import * as fs from "fs";
import {
	aggregateMeasurementsByTestCase,
	calculateFlakiness,
	calculateMaxAndAverageMeasurements,
	getStartAndEndTimeOfTestCasesInLog,
} from "./functions";
import {
	AggregatedTestCaseWithFlakiness,
	AggregatedTestCaseWithIterationMaxAvgMap,
	AggregatedTestCaseWithMeasurementsMap,
	JsonFormat,
	TimedTestCaseIterationsMap,
} from "./types";

let startTime = Date.now();
console.log("Starting...\n\nReading log file...");
const logLines = fs.readFileSync("logs.log", "utf8").toString().split("\n");
console.log("Found " + logLines.length + " lines...");
let testCases: TimedTestCaseIterationsMap = getStartAndEndTimeOfTestCasesInLog(logLines);

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

console.log("Calculating flakiness for each test case...");
let aggregatedTestCasesWithFlakiness: AggregatedTestCaseWithFlakiness[] = calculateFlakiness(aggregatedMeasurementsByTestCaseWithMaxAndAverageStats);
console.log("Done calculating flakiness for each test case.\n");

console.log("Writing aggregated stats to file...");
let currentTimestamp = (new Date()).getTime();

fs.writeFileSync("aggregated-stats-"+ currentTimestamp +".json", JSON.stringify(aggregatedTestCasesWithFlakiness, null, 2));

let endTime = Date.now();
console.log("Done writing aggregated stats to file.\n\nFinished. Took " + (endTime - startTime) + "ms in total.");
