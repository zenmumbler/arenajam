import resolve from "@rollup/plugin-node-resolve";
import tsc from "rollup-plugin-typescript2";
import typescript from "typescript";

export default [
	{
		input: `src/arenajam.ts`,
		output: [{
			file: `build/arenajam.js`,
			format: "iife",
			name: "arenajam",
		}],
		plugins: [
			resolve({ browser: true }),
			tsc({ typescript })
		]
	}
];
