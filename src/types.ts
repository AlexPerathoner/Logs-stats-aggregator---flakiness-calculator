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

export interface TimedTestCaseIteration {
	startTime: number;
	endTime: number;
	failed: boolean;
}
export interface TimedTestCaseIterationsMap {
	[testCaseName: string]: {
		[iteration: string]: TimedTestCaseIteration;
	};
}

export interface AggregatedTestCaseIterationWithMeasurements {
	measurements: [Measurement];
	failed: boolean;
}
export interface AggregatedTestCaseWithMeasurementsMap {
	[testCase: string]: {
		[iteration: string]: AggregatedTestCaseIterationWithMeasurements;
	};
}
export interface AggregatedTestCaseWithIterationMaxAvg {
	max: Measurement;
	avg: Measurement;
	failed: boolean;
}
export interface AggregatedTestCaseWithIterationMaxAvgMap {
	[testCase: string]: {
		[iteration: string]: AggregatedTestCaseWithIterationMaxAvg;
	};
}
