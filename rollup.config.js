import resolve from "@rollup/plugin-node-resolve";
import tsc from "rollup-plugin-typescript2";
import typescript from "typescript";

export default [
	{
		input: `src/jamdown.ts`,
		output: [{
			file: `build/jamdown.js`,
			format: "iife",
			name: "jamdown",
		}],
		plugins: [
			resolve({ browser: true }),
			tsc({ typescript })
		]
	}
];
