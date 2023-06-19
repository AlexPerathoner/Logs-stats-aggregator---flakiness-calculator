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
export interface AggregatedTestCaseWithFlakiness {
    testCase: string;
	max_userLoad: number;
	max_systemLoad: number;
	max_totalLoad: number;
	max_activeMemory: number;
	max_availableMemory: number;
	max_networkRead: number;
	max_networkWrite: number;
	max_diskRead: number;
	max_diskWrite: number;
	avg_userLoad: number;
	avg_systemLoad: number;
	avg_totalLoad: number;
	avg_activeMemory: number;
	avg_availableMemory: number;
	avg_networkRead: number;
	avg_networkWrite: number;
	avg_diskRead: number;
	avg_diskWrite: number;
	fail_rate: number;
	flip_rate: number;
	entropy: number;
}
