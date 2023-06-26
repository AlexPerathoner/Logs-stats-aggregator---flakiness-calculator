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

function orderStatsByTimestamp(stats: JsonFormat): JsonFormat {
	let orderedStats: JsonFormat = {};
	console.log("Ordering stats by timestamp...")
	Object.keys(stats).sort().forEach(function (key) {
		orderedStats[parseInt(key)] = stats[parseInt(key)];
	});
	console.log("Finished ordering stats by timestamp.\n")
	return orderedStats;
}


export function aggregateMeasurementsByTestCase(testCases: TimedTestCaseIterationsMap, stats: JsonFormat): AggregatedTestCaseWithMeasurementsMap {
	let aggregatedMeasurementsByTestCase: AggregatedTestCaseWithMeasurementsMap = {};
	// order stats by timestamp
	let orderedStats = orderStatsByTimestamp(stats);
	let maxTimestamp = parseInt(Object.keys(orderedStats)[Object.keys(orderedStats).length - 1]);
	let currentTimestamp = parseInt(Object.keys(orderedStats)[0]);
	// print as many # as there are test cases
	console.log("#".repeat(Object.keys(testCases).length))
	Object.entries(testCases).forEach(([testCaseName, testCaseIterations]) => {
		Object.entries(testCaseIterations).forEach(([iteration, testCase]) => {
			let start = testCase.startTime;
			let end = testCase.endTime;
			let iterationGotThere = true;
			
			// skip to start
			for (; currentTimestamp < maxTimestamp && currentTimestamp < start; currentTimestamp++) {
			}

			for (; currentTimestamp < maxTimestamp && currentTimestamp <= end; currentTimestamp++) {
				iterationGotThere = true
				// if currentTimestamp is in keys of orderedStats
				if (!orderedStats[currentTimestamp]) {
					continue;
				}
				let measurement = orderedStats[currentTimestamp];
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
					if (aggregatedMeasurementsByTestCase[testCaseName][iteration].measurements === undefined) {
						aggregatedMeasurementsByTestCase[testCaseName][iteration].measurements = [];
					}
				}
			}
			if (!iterationGotThere) { // can happen if the test case is too fast and the measurements frequency is too low
				// console.error("Failed to find measurements for testCase\t" + testCaseName + " iteration " + iteration + " between " + start + " and " + end + " duration: " + (end - start) + "ms");
				if (!aggregatedMeasurementsByTestCase[testCaseName]) {
					aggregatedMeasurementsByTestCase[testCaseName] = {};
				}
				aggregatedMeasurementsByTestCase[testCaseName][iteration] = {
					measurements: [],
					failed: testCase.failed,
				}
			}
		});
		process.stdout.write("#")
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
		let failed = 0;
		let passed = 0;
		let runs = 0;
		let flips = 0;
		Object.entries(testCase).forEach(([iteration, testCaseIteration]) => {
			// max
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
			// avg
			avgMeasurement.userLoad += testCaseIteration.avg.userLoad;
			avgMeasurement.systemLoad += testCaseIteration.avg.systemLoad;
			avgMeasurement.totalLoad += testCaseIteration.avg.totalLoad;
			avgMeasurement.activeMemory += testCaseIteration.avg.activeMemory;
			avgMeasurement.availableMemory += testCaseIteration.avg.availableMemory;
			avgMeasurement.networkRead += testCaseIteration.avg.networkRead;
			avgMeasurement.networkWrite += testCaseIteration.avg.networkWrite;
			avgMeasurement.diskRead += testCaseIteration.avg.diskRead;
			avgMeasurement.diskWrite += testCaseIteration.avg.diskWrite;
			// fail rate
			if (testCaseIteration.failed) {
				failed++;
			} else {
				passed++;
			}
			runs++;
			// flip rate
			if (prevStatus === null) {
				prevStatus = testCaseIteration.failed;
			} else if (prevStatus !== testCaseIteration.failed) {
				flips++;
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

		let failRate = failed / runs
		let passRate = 1 - failRate
		let flipRate = flips / (runs - 1)
		let logResultPassed = 0
		let logResultFailed = 0
		if (failRate != 0) {
			logResultFailed = Math.log2(failRate)
		}
		if (passRate != 0) {
			logResultPassed = Math.log2(passRate)
		}
		let entropy = - (failRate * logResultFailed + passRate * logResultPassed)

		aggregatedTestCasesWithFlakiness.push({
            testCase: testCaseName,
			max_userLoad: maxMeasurement.userLoad,
			max_systemLoad: maxMeasurement.systemLoad,
			max_totalLoad: maxMeasurement.totalLoad,
			max_activeMemory: maxMeasurement.activeMemory,
			max_availableMemory: maxMeasurement.availableMemory,
			max_diskRead: maxMeasurement.diskRead,
			max_diskWrite: maxMeasurement.diskWrite,
			max_networkRead: maxMeasurement.networkRead,
			max_networkWrite: maxMeasurement.networkWrite,
			avg_userLoad: avgMeasurement.userLoad,
			avg_systemLoad: avgMeasurement.systemLoad,
			avg_totalLoad: avgMeasurement.totalLoad,
			avg_activeMemory: avgMeasurement.activeMemory,
			avg_availableMemory: avgMeasurement.availableMemory,
			avg_diskRead: avgMeasurement.diskRead,
			avg_diskWrite: avgMeasurement.diskWrite,
			avg_networkRead: avgMeasurement.networkRead,
			avg_networkWrite: avgMeasurement.networkWrite,
			failed: failed,
			passed: passed,
			fail_rate: failRate,
			flip_rate: flipRate,
			entropy: entropy
		});
	});
	return aggregatedTestCasesWithFlakiness;
}
