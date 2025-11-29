import { ParamConfig } from '../types';

interface ParsedParams {
  values: Record<string, number>;
  configs: Record<string, ParamConfig>;
}

/**
 * Parses code for parameter annotations.
 * Syntax: // @param name defaultValue min max step
 * Example: // @param radius 50 0 100 1
 */
export const parseParamsFromCode = (code: string): ParsedParams => {
  const values: Record<string, number> = {};
  const configs: Record<string, ParamConfig> = {};

  // Regex breakdown:
  // \/\/          Match //
  // \s*@param     Match @param with optional whitespace
  // \s+           Whitespace
  // (\w+)         Group 1: Parameter Name
  // \s+           Whitespace
  // ([\d.-]+)     Group 2: Default Value
  // (?:           Optional Non-capturing group for Min/Max/Step
  //   \s+([\d.-]+)  Group 3: Min
  //   \s+([\d.-]+)  Group 4: Max
  //   (?:\s+([\d.-]+))? Group 5: Step (Optional)
  // )?
  const regex = /\/\/\s*@param\s+(\w+)\s+([\d.-]+)(?:\s+([\d.-]+)\s+([\d.-]+)(?:\s+([\d.-]+))?)?/g;

  let match;
  while ((match = regex.exec(code)) !== null) {
    const key = match[1];
    const defaultVal = parseFloat(match[2]);
    const min = match[3] ? parseFloat(match[3]) : 0;
    const max = match[4] ? parseFloat(match[4]) : 100;
    const step = match[5] ? parseFloat(match[5]) : (defaultVal % 1 === 0 ? 1 : 0.01);

    if (!isNaN(defaultVal)) {
      values[key] = defaultVal;
      configs[key] = { min, max, step };
    }
  }

  return { values, configs };
};