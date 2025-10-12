/**
 * Parser for extracting scenes from monolithic Manim code
 */

import type { SceneMetadata } from './scene-types';

/**
 * Parse Manim code to extract individual scenes based on next_section() calls
 */
export function parseManimScenes(code: string): SceneMetadata[] {
  const lines = code.split('\n');
  const scenes: SceneMetadata[] = [];

  // Find the construct method
  const constructStart = lines.findIndex(line =>
    line.trim().includes('def construct(self)')
  );

  if (constructStart === -1) {
    console.warn('[SCENE-PARSER] No construct method found');
    return [];
  }

  // Find all next_section calls
  const sectionLines: { line: number; name: string }[] = [];

  for (let i = constructStart; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(/self\.next_section\(['"](.*?)['"]\)/);

    if (match) {
      sectionLines.push({
        line: i,
        name: match[1]
      });
    }
  }

  // If no sections found, treat entire construct as one scene
  if (sectionLines.length === 0) {
    const wholeCode = extractCodeBlock(lines, constructStart, lines.length - 1);
    return [{
      name: 'Main Scene',
      code: wholeCode,
      startLine: constructStart,
      endLine: lines.length - 1,
      createdObjects: extractCreatedObjects(wholeCode),
      usedObjects: []
    }];
  }

  // Extract code for each section
  for (let i = 0; i < sectionLines.length; i++) {
    const currentSection = sectionLines[i];
    const nextSection = sectionLines[i + 1];

    const startLine = currentSection.line;
    const endLine = nextSection ? nextSection.line - 1 : lines.length - 1;

    const sectionCode = extractCodeBlock(lines, startLine, endLine);

    scenes.push({
      name: currentSection.name,
      code: sectionCode,
      startLine,
      endLine,
      createdObjects: extractCreatedObjects(sectionCode),
      usedObjects: extractUsedObjects(sectionCode)
    });
  }

  return scenes;
}

/**
 * Extract a block of code between start and end lines
 */
function extractCodeBlock(lines: string[], start: number, end: number): string {
  const codeLines = lines.slice(start, end + 1);

  // Find the minimum indentation (excluding empty lines)
  const indents = codeLines
    .filter(line => line.trim().length > 0)
    .map(line => line.match(/^(\s*)/)?.[1].length || 0);

  const minIndent = Math.min(...indents);

  // Remove the minimum indentation from all lines
  return codeLines
    .map(line => line.slice(minIndent))
    .join('\n');
}

/**
 * Extract object names that are created in this code block
 */
function extractCreatedObjects(code: string): string[] {
  const objects: string[] = [];
  const lines = code.split('\n');

  for (const line of lines) {
    // Match patterns like: circle = Circle()
    const match = line.match(/^\s*(\w+)\s*=\s*\w+\(/);
    if (match && match[1] !== 'self') {
      objects.push(match[1]);
    }
  }

  return objects;
}

/**
 * Extract object names that are used but not created
 */
function extractUsedObjects(code: string): string[] {
  const used: Set<string> = new Set();
  const created = new Set(extractCreatedObjects(code));

  // Find all variable references (simplified)
  const varMatches = code.matchAll(/\b([a-z_]\w*)\b/g);

  for (const match of varMatches) {
    const varName = match[1];
    // Skip common keywords and self
    if (!created.has(varName) &&
        varName !== 'self' &&
        !['for', 'in', 'if', 'else', 'while', 'def', 'class', 'return'].includes(varName)) {
      used.add(varName);
    }
  }

  return Array.from(used);
}

/**
 * Convert scene metadata into a standalone Manim class
 */
export function createStandaloneScene(
  sceneName: string,
  sceneCode: string,
  className?: string
): string {
  const safeClassName = className || sceneName.replace(/\s+/g, '') + 'Scene';

  return `from manim import *

class ${safeClassName}(Scene):
    def construct(self):
${sceneCode.split('\n').map(line => '        ' + line).join('\n')}
`;
}

/**
 * Parse full Manim code and convert to scene-based structure
 */
export function convertToSceneBasedCode(code: string): {
  imports: string;
  baseClass: string;
  scenes: Array<{ name: string; className: string; code: string }>;
} {
  const lines = code.split('\n');

  // Extract imports
  const importLines = lines.filter(line =>
    line.trim().startsWith('import ') ||
    line.trim().startsWith('from ')
  );
  const imports = importLines.join('\n');

  // Extract base class name
  const classMatch = code.match(/class\s+(\w+)\s*\(/);
  const baseClass = classMatch ? classMatch[1] : 'Animation';

  // Parse scenes
  const sceneMetadata = parseManimScenes(code);

  const scenes = sceneMetadata.map((meta, index) => ({
    name: meta.name,
    className: `${baseClass}_${meta.name.replace(/\s+/g, '')}`,
    code: createStandaloneScene(meta.name, meta.code, `${baseClass}_${meta.name.replace(/\s+/g, '')}`)
  }));

  return { imports, baseClass, scenes };
}

/**
 * Merge scene codes back into a monolithic class
 */
export function mergeScenesToMonolithic(
  scenes: Array<{ name: string; code: string }>,
  className: string = 'Animation'
): string {
  const construct = scenes.map(scene => {
    return `        # Section: ${scene.name}
        self.next_section("${scene.name}")
${scene.code.split('\n').map(line => '        ' + line).join('\n')}
`;
  }).join('\n');

  return `from manim import *

class ${className}(Scene):
    def construct(self):
${construct}
`;
}

/**
 * Detect dependencies between scenes
 */
export function detectSceneDependencies(scenes: SceneMetadata[]): Map<string, string[]> {
  const dependencies = new Map<string, string[]>();

  // Build a map of which scenes create which objects
  const objectToScene = new Map<string, string>();

  for (const scene of scenes) {
    for (const obj of scene.createdObjects) {
      objectToScene.set(obj, scene.name);
    }
  }

  // Find dependencies
  for (const scene of scenes) {
    const deps: string[] = [];

    for (const usedObj of scene.usedObjects) {
      const creator = objectToScene.get(usedObj);
      if (creator && creator !== scene.name) {
        deps.push(creator);
      }
    }

    if (deps.length > 0) {
      dependencies.set(scene.name, deps);
    }
  }

  return dependencies;
}
