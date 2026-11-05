import test from "node:test";
import {runCoreTests} from "./core-loop.test.ts";
test("cloud-backed core loop rules",()=>runCoreTests());
