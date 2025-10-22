/**
 * @fileoverview Helper functions for path resolution and file validation
 * @module services/certificate/helpers/path
 */

import * as fs from "fs";
import * as path from "path";

/**
 * Resolve a file path relative to a base directory
 *
 * @param filePath - Relative or absolute file path
 * @param baseDir - Base directory for resolution (defaults to cwd)
 * @returns Absolute file path
 *
 * @public
 */
export function resolvePath(
  filePath: string,
  baseDir: string = process.cwd()
): string {
  return path.resolve(baseDir, filePath);
}

/**
 * Check if a file exists and is readable
 *
 * @param filePath - Absolute or relative file path
 * @param baseDir - Base directory for resolution
 * @returns True if file exists and is a file
 *
 * @public
 */
export function fileExists(
  filePath: string,
  baseDir: string = process.cwd()
): boolean {
  try {
    const resolvedPath = resolvePath(filePath, baseDir);
    return fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile();
  } catch {
    return false;
  }
}

/**
 * Read file contents as Buffer
 *
 * @param filePath - File path to read
 * @param baseDir - Base directory for resolution
 * @returns File contents as Buffer
 * @throws Error if file doesn't exist or can't be read
 *
 * @public
 */
export function readFileBuffer(
  filePath: string,
  baseDir: string = process.cwd()
): Buffer {
  const resolvedPath = resolvePath(filePath, baseDir);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }

  if (!fs.statSync(resolvedPath).isFile()) {
    throw new Error(`Path is not a file: ${resolvedPath}`);
  }

  return fs.readFileSync(resolvedPath);
}

/**
 * Validate file path and return error message if invalid
 *
 * @param filePath - File path to validate
 * @param baseDir - Base directory for resolution
 * @param fileType - Description of file type (e.g., "Certificate", "Key")
 * @returns Error message if invalid, null if valid
 *
 * @public
 */
export function validateFilePath(
  filePath: string,
  baseDir: string = process.cwd(),
  fileType: string = "File"
): string | null {
  try {
    const resolvedPath = resolvePath(filePath, baseDir);

    if (!fs.existsSync(resolvedPath)) {
      return `${fileType} file not found: ${resolvedPath}`;
    }

    if (!fs.statSync(resolvedPath).isFile()) {
      return `${fileType} path is not a file: ${resolvedPath}`;
    }

    return null;
  } catch (error) {
    return `${fileType} validation error: ${(error as Error).message}`;
  }
}
