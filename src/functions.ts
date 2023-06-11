import {
	AggregatedTestCaseWithIterationMaxAvgMap,
	AggregatedTestCaseWithMeasurementsMap,
	JsonFormat,
	Measurement,
	TimedTestCaseWithIterationMap,
} from "./types";

export function getStartAndEndTimeOfTestCasesInLog(logLines: string[]): TimedTestCaseWithIterationMap {
	let testCases: TimedTestCaseWithIterationMap = {};
	let testSuiteStarted = false;
	let testCaseStarted = false;
	let testCaseName = "";
	let startTime = 0;
	for (let i = 0; i < logLines.length; i++) {
		if (logLines[i].includes("Test Suite")) {
			testSuiteStarted = true;
		}
		if (testSuiteStarted) {
            let line = logLines[i];
			if (line.includes("Test Case") && line.includes("started")) {
				testCaseStarted = true;
				let iteration = parseInt(line.split("started (Iteration ")[1].split(" of")[0]);
				testCaseName = line.split("Test Case ")[1].split(" started")[0] + " (Iteration " + iteration + ")";
				startTime = Date.parse(line.split(" Test Case ")[0]);
                continue;
				// console.log(testCaseName + " started at " + startTime + " (Iteration " + iteration + ")");
			}
			if (testCaseStarted) {
				if ((line.includes("passed") || line.includes("failed")) && line.includes("Test Case")) {
                    let failed = line.includes("failed");
					// test finished
					testCaseStarted = false;
					let endTime = Date.parse(line.split(" Test Case ")[0]);
                    // check if endTime parsing failed
                    if (isNaN(endTime)) {
                        console.error("Failed to parse endTime for testCase " + testCaseName + " at line " + (i+1) + ": " + line);
                        continue;
                    }
					testCases[testCaseName] = {
						startTime: startTime,
						endTime: endTime,
                        failed: failed,
					};
				}
			}
		}
	}
	return testCases;
}

export function aggregateMeasurementsByTestCase(testCases: TimedTestCaseWithIterationMap, stats: JsonFormat): AggregatedTestCaseWithMeasurementsMap {
	let aggregatedMeasurementsByTestCase: AggregatedTestCaseWithMeasurementsMap = {};
	Object.entries(testCases).forEach(([testCaseName, testCaseTimestamps]) => {
		// iterate over all stats, as there's no guarantee that testCases are in order
		Object.entries(stats).forEach(([measurementTimestampStr, measurement]) => {
			let measurementTimestamp = parseInt(measurementTimestampStr);
			let start = testCaseTimestamps.startTime;
			let end = testCaseTimestamps.endTime;
			if (measurementTimestamp >= start && measurementTimestamp <= end) {
				if (aggregatedMeasurementsByTestCase[testCaseName]) {
					aggregatedMeasurementsByTestCase[testCaseName].measurements.push(measurement as Measurement);
				} else {
					aggregatedMeasurementsByTestCase[testCaseName] = {
						measurements: [measurement as Measurement],
                        failed: testCaseTimestamps.failed,
					};
				}
			}
		});
	});
	return aggregatedMeasurementsByTestCase;
}

export function calculateMaxAndAverageMeasurements(
	aggregatedMeasurementsByTestCase: AggregatedTestCaseWithMeasurementsMap
): AggregatedTestCaseWithIterationMaxAvgMap {
	let aggregatedMeasurementsByTestCaseWithMaxAndAverageStats: AggregatedTestCaseWithIterationMaxAvgMap = {};

	Object.entries(aggregatedMeasurementsByTestCase).forEach(([testCaseName, testCaseMeasurements]) => {
		let maxMeasurement: Measurement = {
			userLoad: 0,
			systemLoad: 0,
			totalLoad: 0,
			activeMemory: 0,
			availableMemory: Number.MAX_SAFE_INTEGER,
			networkRead: 0,
			networkWrite: 0,
			diskRead: 0,
			diskWrite: 0,
		};
		let avgMeasurement: Measurement = {
			userLoad: 0,
			systemLoad: 0,
			totalLoad: 0,
			activeMemory: 0,
			availableMemory: 0,
			networkRead: 0,
			networkWrite: 0,
			diskRead: 0,
			diskWrite: 0,
		};
		testCaseMeasurements.measurements.forEach((measurement) => {
			if (measurement.totalLoad > maxMeasurement.totalLoad) {
				maxMeasurement.totalLoad = measurement.totalLoad;
			}
            if (measurement.userLoad > maxMeasurement.userLoad) {
                maxMeasurement.userLoad = measurement.userLoad;
            }
            if (measurement.systemLoad > maxMeasurement.systemLoad) {
                maxMeasurement.systemLoad = measurement.systemLoad;
            }
            if (measurement.activeMemory > maxMeasurement.activeMemory) {
                maxMeasurement.activeMemory = measurement.activeMemory;
            }
            // availableMemory is a "negative" number, so we want the lowest number
            if (measurement.availableMemory < maxMeasurement.availableMemory) {
                maxMeasurement.availableMemory = measurement.availableMemory;
            }
            if (measurement.networkRead > maxMeasurement.networkRead) {
                maxMeasurement.networkRead = measurement.networkRead;
            }
            if (measurement.networkWrite > maxMeasurement.networkWrite) {
                maxMeasurement.networkWrite = measurement.networkWrite;
            }
            if (measurement.diskRead > maxMeasurement.diskRead) {
                maxMeasurement.diskRead = measurement.diskRead;
            }
            if (measurement.diskWrite > maxMeasurement.diskWrite) {
                maxMeasurement.diskWrite = measurement.diskWrite;
            }

			avgMeasurement.userLoad += measurement.userLoad;
			avgMeasurement.systemLoad += measurement.systemLoad;
			avgMeasurement.totalLoad += measurement.totalLoad;
			avgMeasurement.activeMemory += measurement.activeMemory;
			avgMeasurement.availableMemory += measurement.availableMemory;
			avgMeasurement.networkRead += measurement.networkRead;
			avgMeasurement.networkWrite += measurement.networkWrite;
			avgMeasurement.diskRead += measurement.diskRead;
			avgMeasurement.diskWrite += measurement.diskWrite;
		});

		avgMeasurement.userLoad /= testCaseMeasurements.measurements.length;
		avgMeasurement.systemLoad /= testCaseMeasurements.measurements.length;
		avgMeasurement.totalLoad /= testCaseMeasurements.measurements.length;
		avgMeasurement.activeMemory /= testCaseMeasurements.measurements.length;
		avgMeasurement.availableMemory /= testCaseMeasurements.measurements.length;
		avgMeasurement.networkRead /= testCaseMeasurements.measurements.length;
		avgMeasurement.networkWrite /= testCaseMeasurements.measurements.length;
		avgMeasurement.diskRead /= testCaseMeasurements.measurements.length;
		avgMeasurement.diskWrite /= testCaseMeasurements.measurements.length;

		aggregatedMeasurementsByTestCaseWithMaxAndAverageStats[testCaseName] = {
			max: maxMeasurement,
			avg: avgMeasurement,
            failed: testCaseMeasurements.failed,
		};
	});
	return aggregatedMeasurementsByTestCaseWithMaxAndAverageStats;
}
