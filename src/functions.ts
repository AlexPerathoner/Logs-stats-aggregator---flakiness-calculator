import {
	AggregatedTestCaseWithFlakiness,
	AggregatedTestCaseWithIterationMaxAvgMap,
	AggregatedTestCaseWithMeasurementsMap,
	JsonFormat,
	Measurement,
	TimedTestCaseIterationsMap,
} from "./types";

export function getStartAndEndTimeOfTestCasesInLog(logLines: string[]): TimedTestCaseIterationsMap {
	let testCases: TimedTestCaseIterationsMap = {};
	let testSuiteStarted = false;
	let testCaseStarted = false;
	let testCaseName = "";
	let startTime = 0;
	let iteration = 0;
	for (let i = 0; i < logLines.length; i++) {
		if (logLines[i].includes("Test Suite")) {
			testSuiteStarted = true;
		}
		if (testSuiteStarted) {
			let line = logLines[i];
			if (line.includes("Test Case") && line.includes("started")) {
				testCaseStarted = true;
				iteration = parseInt(line.split("started (Iteration ")[1].split(" of")[0]);
				testCaseName = line.split("Test Case ")[1].split(" started")[0];
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
						console.error("Failed to parse endTime for testCase " + testCaseName + " at line " + (i + 1) + ": " + line);
						continue;
					}
					if (!testCases[testCaseName]) {
						testCases[testCaseName] = {};
					}
					testCases[testCaseName][iteration] = {
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

export function aggregateMeasurementsByTestCase(testCases: TimedTestCaseIterationsMap, stats: JsonFormat): AggregatedTestCaseWithMeasurementsMap {
	let aggregatedMeasurementsByTestCase: AggregatedTestCaseWithMeasurementsMap = {};
	Object.entries(testCases).forEach(([testCaseName, testCaseIterations]) => {
		Object.entries(testCaseIterations).forEach(([iteration, testCase]) => {
			// iterate over all stats, as there's no guarantee that testCases are in order
			Object.entries(stats).forEach(([measurementTimestampStr, measurement]) => {
				let measurementTimestamp = parseInt(measurementTimestampStr);
				let start = testCase.startTime;
				let end = testCase.endTime;
				if (measurementTimestamp >= start && measurementTimestamp <= end) {
					if (!aggregatedMeasurementsByTestCase[testCaseName]) {
						aggregatedMeasurementsByTestCase[testCaseName] = {};
					}
					if (aggregatedMeasurementsByTestCase[testCaseName][iteration]) {
						aggregatedMeasurementsByTestCase[testCaseName][iteration].measurements.push(measurement as Measurement);
					} else {
						aggregatedMeasurementsByTestCase[testCaseName][iteration] = {
							measurements: [measurement as Measurement],
							failed: testCase.failed,
						};
					}
				}
			});
		});
	});
	return aggregatedMeasurementsByTestCase;
}

export function calculateMaxAndAverageMeasurements(
	aggregatedMeasurementsByTestCase: AggregatedTestCaseWithMeasurementsMap
): AggregatedTestCaseWithIterationMaxAvgMap {
	let aggregatedMeasurementsByTestCaseWithMaxAndAverageStats: AggregatedTestCaseWithIterationMaxAvgMap = {};

	Object.entries(aggregatedMeasurementsByTestCase).forEach(([testCaseName, testCaseMeasurementsIterations]) => {
		Object.entries(testCaseMeasurementsIterations).forEach(([iteration, testCaseMeasurementsIteration]) => {
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
			testCaseMeasurementsIteration.measurements.forEach((measurement) => {
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

			avgMeasurement.userLoad /= testCaseMeasurementsIteration.measurements.length;
			avgMeasurement.systemLoad /= testCaseMeasurementsIteration.measurements.length;
			avgMeasurement.totalLoad /= testCaseMeasurementsIteration.measurements.length;
			avgMeasurement.activeMemory /= testCaseMeasurementsIteration.measurements.length;
			avgMeasurement.availableMemory /= testCaseMeasurementsIteration.measurements.length;
			avgMeasurement.networkRead /= testCaseMeasurementsIteration.measurements.length;
			avgMeasurement.networkWrite /= testCaseMeasurementsIteration.measurements.length;
			avgMeasurement.diskRead /= testCaseMeasurementsIteration.measurements.length;
			avgMeasurement.diskWrite /= testCaseMeasurementsIteration.measurements.length;

			if (!aggregatedMeasurementsByTestCaseWithMaxAndAverageStats[testCaseName]) {
				aggregatedMeasurementsByTestCaseWithMaxAndAverageStats[testCaseName] = {};
			}
			aggregatedMeasurementsByTestCaseWithMaxAndAverageStats[testCaseName][iteration] = {
				max: maxMeasurement,
				avg: avgMeasurement,
				failed: testCaseMeasurementsIteration.failed,
			};
		});
	});
	return aggregatedMeasurementsByTestCaseWithMaxAndAverageStats;
}

export function calculateFlakiness(
	aggregatedMeasurementsByTestCaseWithMaxAndAverageStats: AggregatedTestCaseWithIterationMaxAvgMap
): AggregatedTestCaseWithFlakiness[] {
	let aggregatedTestCasesWithFlakiness: AggregatedTestCaseWithFlakiness[] = [];
	Object.entries(aggregatedMeasurementsByTestCaseWithMaxAndAverageStats).forEach(([testCaseName, testCase]) => {
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
		let prevStatus: Boolean = null;
		let changesOfStatus = 0;
		Object.entries(testCase).forEach(([iteration, testCaseIteration]) => {
			if (testCaseIteration.max.userLoad > maxMeasurement.userLoad) {
				maxMeasurement.userLoad = testCaseIteration.max.userLoad;
			}
			if (testCaseIteration.max.systemLoad > maxMeasurement.systemLoad) {
				maxMeasurement.systemLoad = testCaseIteration.max.systemLoad;
			}
			if (testCaseIteration.max.totalLoad > maxMeasurement.totalLoad) {
				maxMeasurement.totalLoad = testCaseIteration.max.totalLoad;
			}
			if (testCaseIteration.max.activeMemory > maxMeasurement.activeMemory) {
				maxMeasurement.activeMemory = testCaseIteration.max.activeMemory;
			}
			if (testCaseIteration.max.availableMemory < maxMeasurement.availableMemory) {
				maxMeasurement.availableMemory = testCaseIteration.max.availableMemory;
			}
			if (testCaseIteration.max.networkRead > maxMeasurement.networkRead) {
				maxMeasurement.networkRead = testCaseIteration.max.networkRead;
			}
			if (testCaseIteration.max.networkWrite > maxMeasurement.networkWrite) {
				maxMeasurement.networkWrite = testCaseIteration.max.networkWrite;
			}
			if (testCaseIteration.max.diskRead > maxMeasurement.diskRead) {
				maxMeasurement.diskRead = testCaseIteration.max.diskRead;
			}
			if (testCaseIteration.max.diskWrite > maxMeasurement.diskWrite) {
				maxMeasurement.diskWrite = testCaseIteration.max.diskWrite;
			}
			avgMeasurement.userLoad += testCaseIteration.avg.userLoad;
			avgMeasurement.systemLoad += testCaseIteration.avg.systemLoad;
			avgMeasurement.totalLoad += testCaseIteration.avg.totalLoad;
			avgMeasurement.activeMemory += testCaseIteration.avg.activeMemory;
			avgMeasurement.availableMemory += testCaseIteration.avg.availableMemory;
			avgMeasurement.networkRead += testCaseIteration.avg.networkRead;
			avgMeasurement.networkWrite += testCaseIteration.avg.networkWrite;
			avgMeasurement.diskRead += testCaseIteration.avg.diskRead;
			avgMeasurement.diskWrite += testCaseIteration.avg.diskWrite;

			if (prevStatus === null) {
				prevStatus = testCaseIteration.failed;
			} else if (prevStatus !== testCaseIteration.failed) {
				changesOfStatus++;
			}
		});
		let numberOfItems = Object.keys(testCase).length;
		avgMeasurement.userLoad /= numberOfItems;
		avgMeasurement.systemLoad /= numberOfItems;
		avgMeasurement.totalLoad /= numberOfItems;
		avgMeasurement.activeMemory /= numberOfItems;
		avgMeasurement.availableMemory /= numberOfItems;
		avgMeasurement.networkRead /= numberOfItems;
		avgMeasurement.networkWrite /= numberOfItems;
		avgMeasurement.diskRead /= numberOfItems;
		avgMeasurement.diskWrite /= numberOfItems;

		let flakiness = (changesOfStatus /= numberOfItems - 1);
		if (flakiness === null || isNaN(flakiness)) {
			flakiness = 0;
		}

		aggregatedTestCasesWithFlakiness.push({
            testCase: testCaseName,
			max: maxMeasurement,
			avg: avgMeasurement,
			flakiness: flakiness,
		});
	});
	return aggregatedTestCasesWithFlakiness;
}
