export interface JsonFormat {
	[timestamp: number]: TimedMeasurement;
}

export interface Measurement {
	userLoad: number;
	systemLoad: number;
	totalLoad: number;
	activeMemory: number;
	availableMemory: number;
	networkRead: number;
	networkWrite: number;
	diskRead: number;
	diskWrite: number;
}
export interface TimedMeasurement extends Measurement {
	isoString: string;
}

export interface TimedTestCaseWithIteration {
	startTime: number;
	endTime: number;
    failed: boolean;
}
export interface TimedTestCaseWithIterationMap {
	[testCaseName: string]: TimedTestCaseWithIteration;
}

export interface AggregatedTestCaseWithMeasurements {
	measurements: [Measurement];
    failed: boolean;
}
export interface AggregatedTestCaseWithMeasurementsMap {
	[testCase: string]: AggregatedTestCaseWithMeasurements;
}
export interface AggregatedTestCaseWithIterationMaxAvg {
	max: Measurement;
	avg: Measurement;
    failed: boolean;
}
export interface AggregatedTestCaseWithIterationMaxAvgMap {
	[testCase: string]: AggregatedTestCaseWithIterationMaxAvg;
}
