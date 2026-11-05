import test from "node:test";
import {runMeasurementTests} from "./measurement.test.ts";
test("measurement legacy mapping, snapshot formats, save aggregation and request batching",runMeasurementTests);
import {runRepositoryMeasurementTests} from "./measurement-repository.test.ts";
test("duration/breath prepare → edit → save → reload → complete → History → Previous (fake transport)",runRepositoryMeasurementTests);
