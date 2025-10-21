// WORKFLOW STEP 1: Import context gathering utilities
// These functions scan the codebase to provide the LLM with awareness of project structure
import { getFileTreeString, getFileList } from './context.js';
import dotenv from 'dotenv';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';


// WORKFLOW STEP 2: Define the structure of a single execution step
// Each step represents one atomic action in the implementation plan
export interface PlanStep {
  step: number;              // Sequential order (1, 2, 3...)
  action: string;            // Brief title: "Create authentication service"
  description: string;       // Detailed what/how, including validation steps
  files?: string[];          // Specific file paths to create/modify
  reasoning: string;         // Why this step is necessary (helps LLM and humans understand dependencies)
}

// WORKFLOW STEP 3: Define the complete execution plan structure
// This is what the LLM will return after analyzing the user's request
export interface ExecutionPlan {
  summary: string;                                    // One-line overview of the entire change
  steps: PlanStep[];                                  // Ordered list of implementation steps
  estimatedComplexity: 'low' | 'medium' | 'high';   // Helps user gauge time/effort
  prerequisites: string[];                            // What must exist before starting (deps, env vars, etc.)
  risks: string[];                                    // Potential breaking changes or concerns
}

// WORKFLOW STEP 4: Define the prompt pair we'll send to the LLM
// Separating system (role/rules) from user (specific request) improves LLM instruction-following
export interface LLMPrompts {
  systemPrompt: string;  // Sets the LLM's role, constraints, output format
  userPrompt: string;    // Contains the actual user request + context
}

/**
 * WORKFLOW STEP 5: Main function - transforms user input into LLM-ready prompts
 * 
 * This is the core orchestrator that:
 * 1. Gathers codebase context (file tree + file list)
 * 2. Identifies relevant files (from @ mentions + keyword matching)
 * 3. Classifies user intent (create/modify/fix/etc.)
 * 4. Constructs two prompts: system (rules) and user (request)
 * 
 * @param userInput - Raw text from the user: "Add error handling to @src/index.ts"
 * @param referencedFiles - Files explicitly tagged with @ in the input
 * @param rootDir - Project root (defaults to current working directory)
 * @returns Object with systemPrompt and userPrompt ready to send to LLM API
 */
export function generatePlanPrompts(
  userInput: string,
  referencedFiles: string[] = [],
  rootDir: string = process.cwd()
): LLMPrompts {
  // STEP 5A: Gather complete codebase context
  // fileTree = visual tree structure (folders/files with emojis)
  // allFiles = flat list of all file paths for keyword matching
  const fileTree = getFileTreeString(rootDir);
  const allFiles = getFileList(rootDir);
  
  // STEP 5B: Smart file filtering - find files relevant to this request
  // Includes: explicitly @-mentioned files + files whose names match keywords in the request
  const relevantFiles = filterRelevantFiles(userInput, referencedFiles, allFiles);
  
  // STEP 5C: Classify the user's intent (helps LLM understand the type of change)
  const intent = extractIntent(userInput);
  
  // STEP 5D: Format the context sections for inclusion in the prompt
  // Only include sections if there's actual data (cleaner prompts)
  const fileContext = referencedFiles.length > 0 
    ? `\n\nReferenced Files:\n${referencedFiles.map(f => `- ${f}`).join('\n')}`
    : '';
  
  const relevantFilesContext = relevantFiles.length > 0
    ? `\n\nPotentially Relevant Files:\n${relevantFiles.map(f => `- ${f}`).join('\n')}`
    : '';

  // STEP 5E: Build the system prompt - establishes LLM role and output constraints
  // This tells the LLM HOW to respond (format, rules, structure)
  // Key constraints:
  // - JSON-only output (no markdown, no explanations outside JSON)
  // - Use real file paths from the provided tree
  // - Dependency-aware ordering (types before features, features before UI)
  // - Include validation steps and risk assessment
  const systemPrompt = `You are an expert software development assistant. Produce a precise, actionable implementation plan for code changes.

Codebase context (file tree):

${fileTree}

Additional context:
${fileContext}${relevantFilesContext}

Strict requirements for your plan:
- Output MUST be valid JSON matching the schema below (no extra text).
- Reference concrete file paths that exist in the tree when modifying files.
- If creating files, include full relative paths and initial content outline.
- Order steps to resolve dependencies first (types → utils → features → CLI/UI → docs/tests).
- Call out risky operations and how to validate success after each step.
- Prefer minimal edits with maximum impact; avoid speculative changes.

JSON schema (use exactly these keys):
{
  "summary": string,
  "steps": [
    {
      "step": number,
      "action": string,
      "description": string,
      "files": string[],
      "reasoning": string
    }
  ],
  "estimatedComplexity": "low" | "medium" | "high",
  "prerequisites": string[],
  "risks": string[]
}`;

  // STEP 5F: Build the user prompt - contains the actual request and specific guidance
  // This tells the LLM WHAT to plan
  // Includes the classified intent to help LLM understand the change type
  // Reinforces JSON-only output and safe, minimal edits
  const userPrompt = `User Request: "${userInput}"

Intent: ${intent}

Please return ONLY the JSON object adhering to the schema. When you list files, prefer those under src/, and reference exact paths from the provided tree. For each step, include a brief validation note inside "description" about how to verify the change (e.g., build command, type-check, or quick runtime test). If you are uncertain about a file, propose the safest minimal change and note assumptions in "reasoning".`;

  // STEP 5G: Return both prompts as a pair
  // These will be sent to the LLM API (system message + user message)
  return {
    systemPrompt,
    userPrompt
  };
}

/**
 * WORKFLOW STEP 6: Smart file relevance filter
 * 
 * Purpose: Give the LLM focused context by identifying which files are likely involved
 * 
 * Strategy:
 * 1. Always include files explicitly tagged with @ (user knows these are important)
 * 2. Extract meaningful keywords from the request (skip common words like "the", "and")
 * 3. Match keywords against file paths (e.g., "auth" matches "src/auth.ts")
 * 4. Cap at 20 files to prevent token bloat
 * 
 * Example: "Add logging to auth service" → keywords: ["logging", "auth", "service"]
 *          → matches: src/auth.ts, src/services/auth.service.ts, src/logger.ts
 */
function filterRelevantFiles(userInput: string, referencedFiles: string[], allFiles: string[]): string[] {
  const keywords = extractKeywords(userInput);  // Get important words from request
  const relevantFiles: string[] = [];
  
  // STEP 6A: Always include explicitly @-mentioned files (highest priority)
  relevantFiles.push(...referencedFiles);
  
  // STEP 6B: Find files whose paths contain request keywords
  for (const file of allFiles) {
    if (referencedFiles.includes(file)) continue;  // Skip already-included files
    
    const fileName = file.toLowerCase();
    const hasKeyword = keywords.some(keyword => 
      fileName.includes(keyword.toLowerCase())  // Case-insensitive match
    );
    
    if (hasKeyword) {
      relevantFiles.push(file);
    }
  }
  
  // STEP 6C: Limit to 20 files to keep prompt size manageable
  // LLMs have token limits; too many files = truncated context or high costs
  return relevantFiles.slice(0, 20);
}

/**
 * WORKFLOW STEP 7: Keyword extraction with stop-word filtering
 * 
 * Purpose: Extract meaningful words from user input for file matching
 * 
 * Process:
 * 1. Lowercase everything for case-insensitive matching
 * 2. Split on common delimiters (space, comma, period, dash)
 * 3. Filter out "stop words" (common words with low semantic value)
 * 4. Filter out very short words (< 3 chars, often noise)
 * 5. Cap at 10 keywords (most relevant ones appear early)
 * 
 * Example: "Add error handling to the authentication service"
 *          → ["add", "error", "handling", "authentication", "service"]
 *          (dropped: "to", "the")
 */
function extractKeywords(input: string): string[] {
  // Common English words that don't help identify files (stop words)
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must', 'shall',
    'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'
  ]);
  
  return input
    .toLowerCase()                                      // "Add Error" → "add error"
    .split(/[\s,.-]+/)                                  // Split on whitespace/punctuation
    .filter(word => word.length > 2 && !commonWords.has(word))  // Keep meaningful words
    .slice(0, 10);                                      // Top 10 to stay focused
}

/**
 * WORKFLOW STEP 8: Intent classification
 * 
 * Purpose: Categorize what type of change the user wants (helps LLM tailor the plan)
 * 
 * Categories:
 * - Create/Add: new features, files, functionality
 * - Modify: changes to existing code
 * - Fix: bug fixes, error handling
 * - Remove: deletion, cleanup
 * - Refactor: code quality improvements
 * - Test: testing additions/updates
 * - Documentation: docs, comments, README
 * 
 * Why this matters: The LLM can adjust its planning strategy based on intent
 * - "Create" → plan for new file structure, exports, imports
 * - "Fix" → focus on edge cases, error handling, validation
 * - "Refactor" → emphasize backwards compatibility, no behavior changes
 * 
 * Example: "Fix the bug in authentication" → "Fix bugs or errors"
 */
function extractIntent(input: string): string {
  const lowerInput = input.toLowerCase();
  
  // Pattern matching: check for common verbs/terms in each category
  if (lowerInput.includes('add') || lowerInput.includes('create') || lowerInput.includes('new')) {
    return 'Create/Add new functionality';
  } else if (lowerInput.includes('modify') || lowerInput.includes('change') || lowerInput.includes('update')) {
    return 'Modify existing functionality';
  } else if (lowerInput.includes('fix') || lowerInput.includes('bug') || lowerInput.includes('error')) {
    return 'Fix bugs or errors';
  } else if (lowerInput.includes('remove') || lowerInput.includes('delete') || lowerInput.includes('clean')) {
    return 'Remove/Delete functionality';
  } else if (lowerInput.includes('refactor') || lowerInput.includes('improve') || lowerInput.includes('optimize')) {
    return 'Refactor/Improve code';
  } else if (lowerInput.includes('test') || lowerInput.includes('testing')) {
    return 'Add or modify tests';
  } else if (lowerInput.includes('document') || lowerInput.includes('comment') || lowerInput.includes('readme')) {
    return 'Add or update documentation';
  } else {
    return 'General code changes';  // Fallback for unclear requests
  }
}

/**
 * WORKFLOW STEP 9: Parse LLM response (post-planning utility)
 * 
 * Purpose: Convert raw LLM text response into typed ExecutionPlan object
 * 
 * Process:
 * 1. Extract JSON from response (LLMs sometimes add markdown fences or explanations)
 * 2. Parse the JSON string into a JavaScript object
 * 3. Validate it has required fields (summary, steps array)
 * 4. Return typed ExecutionPlan or null if parsing fails
 * 
 * Why needed: LLMs don't always return pure JSON; they may wrap it in ```json blocks
 * or add explanatory text. This function is defensive and extracts the plan cleanly.
 * 
 * Example response: "Here's your plan:\n```json\n{\"summary\":...}\n```"
 *                   → Extracts just the {...} part
 */
export function parsePlanResponse(llmResponse: string): ExecutionPlan | null {
  try {
    // STEP 9A: Extract JSON using greedy regex (matches first { to last })
    const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    // STEP 9B: Parse the JSON string
    const plan = JSON.parse(jsonMatch[0]);
    
    // STEP 9C: Validate minimum required structure
    // Must have summary (string) and steps (array) to be a valid plan
    if (!plan.summary || !plan.steps || !Array.isArray(plan.steps)) {
      throw new Error('Invalid plan structure');
    }
    
    // STEP 9D: Return as strongly-typed ExecutionPlan
    return plan as ExecutionPlan;
  } catch (error) {
    // If anything goes wrong, log error and return null (caller handles gracefully)
    console.error('Failed to parse LLM response:', error);
    return null;
  }
}

/**
 * WORKFLOW STEP 10: Pretty-print plan for human readability (display utility)
 * 
 * Purpose: Transform structured ExecutionPlan into formatted terminal output
 * 
 * Output sections:
 * 1. Header with emoji icon
 * 2. Summary (one-line overview)
 * 3. Complexity estimate (helps user gauge time/effort)
 * 4. Prerequisites (if any) - what needs to exist first
 * 5. Risks (if any) - warnings about potential issues
 * 6. Steps (main content) - numbered list with details
 * 
 * Each step shows:
 * - Action (title)
 * - Description (detailed instructions + validation notes)
 * - Files (which files to modify/create)
 * - Reasoning (why this step is needed, dependency explanation)
 * 
 * Example output:
 * ═══════════════════════════════════════════════════
 * 📝 Summary: Add authentication to user service
 * ⚡ Complexity: MEDIUM
 * 
 * 📋 Steps:
 * 1. Create auth types
 *    Define User and Token interfaces...
 *    📁 Files: src/types/auth.ts
 *    💭 Reasoning: Type definitions needed before service implementation
 */
export function formatPlan(plan: ExecutionPlan): string {
  let output = `\n📋 Execution Plan\n`;
  output += `═${'═'.repeat(50)}\n\n`;
  output += `📝 Summary: ${plan.summary}\n\n`;
  output += `⚡ Complexity: ${plan.estimatedComplexity.toUpperCase()}\n\n`;
  
  // Only show prerequisites section if there are any
  if (plan.prerequisites.length > 0) {
    output += `📋 Prerequisites:\n`;
    plan.prerequisites.forEach(prereq => {
      output += `  • ${prereq}\n`;
    });
    output += `\n`;
  }
  
  // Only show risks section if there are any
  if (plan.risks.length > 0) {
    output += `⚠️  Risks & Considerations:\n`;
    plan.risks.forEach(risk => {
      output += `  • ${risk}\n`;
    });
    output += `\n`;
  }
  
  // Main steps section (always shown)
  output += `📋 Steps:\n`;
  plan.steps.forEach(step => {
    output += `\n${step.step}. ${step.action}\n`;
    output += `   ${step.description}\n`;
    if (step.files && step.files.length > 0) {
      output += `   📁 Files: ${step.files.join(', ')}\n`;
    }
    output += `   💭 Reasoning: ${step.reasoning}\n`;
  });
  
  return output;
}

/**
 * WORKFLOW STEP 11: Make API request to Google Gemini
 * 
 * Purpose: Send prompts to Google Gemini API and get LLM-generated execution plan
 * 
 * Process:
 * 1. Validate API key exists in environment
 * 2. Format request with combined system and user prompts
 * 3. Send POST request to Gemini endpoint
 * 4. Parse and return the LLM's response
 * 
 * @param systemPrompt - The system message defining LLM role and constraints
 * @param userPrompt - The user message with the actual request
 * @param model - Gemini model identifier (defaults to gemini-1.5-flash)
 * @returns The LLM's response text
 * @throws Error if API key is missing or request fails
 */
export async function callOpenRouter(
  systemPrompt: string,
  userPrompt: string,
  model: string = 'gemini-2.5-pro'
): Promise<string> {
  // STEP 11A: Validate environment variable
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  // STEP 11B: Prepare API request payload for Gemini
  // Gemini doesn't have separate system/user roles, so combine the prompts
  const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
  
  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: combinedPrompt
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    }
  };

  // STEP 11C: Make HTTP POST request to Gemini
  try {
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    // STEP 11D: Check if request was successful
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API request failed (${response.status}): ${errorText}`);
    }

    // STEP 11E: Parse response JSON
    const data = await response.json();
    
    // STEP 11F: Extract message content from response
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error('No content in Gemini response');
    }

    return content;
  } catch (error) {
    // STEP 11G: Handle network errors or parsing failures
    if (error instanceof Error) {
      throw new Error(`Failed to call Gemini API: ${error.message}`);
    }
    throw error;
  }
}

/**
 * WORKFLOW STEP 12: Execute a single plan step
 * 
 * Purpose: Implement one step of the execution plan by generating and applying code changes
 * 
 * Process:
 * 1. Analyze the step to determine if it's creating or modifying files
 * 2. For each file, use LLM to generate the actual code changes
 * 3. Apply the changes (create or modify files)
 * 4. Return success/failure status
 * 
 * @param step - The plan step to execute
 * @param rootDir - Project root directory
 * @returns Object with success status and any error messages
 */
export async function executeStep(
  step: PlanStep,
  rootDir: string = process.cwd()
): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`\n⚙️  Executing Step ${step.step}: ${step.action}`);
    
    if (!step.files || step.files.length === 0) {
      return {
        success: true,
        message: 'No files to modify (documentation or verification step)'
      };
    }

    // Process each file in the step
    for (const filePath of step.files) {
      const fullPath = `${rootDir}/${filePath}`;
      const fileExists = existsSync(fullPath);

      if (fileExists) {
        // Modify existing file
        console.log(`   📝 Modifying ${filePath}...`);
        await modifyFile(fullPath, step, rootDir);
      } else {
        // Create new file
        console.log(`   ✨ Creating ${filePath}...`);
        await createFile(fullPath, step, rootDir);
      }
    }

    return {
      success: true,
      message: `Successfully completed: ${step.action}`
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * WORKFLOW STEP 13: Create a new file with LLM-generated content
 * 
 * Purpose: Generate appropriate file content based on the step description
 * 
 * Process:
 * 1. Use LLM to generate file content based on step details
 * 2. Create necessary directories if they don't exist
 * 3. Write the file to disk
 * 
 * @param filePath - Full path where file should be created
 * @param step - The plan step containing creation details
 * @param rootDir - Project root directory
 */
async function createFile(
  filePath: string,
  step: PlanStep,
  rootDir: string
): Promise<void> {
  // Generate content using LLM
  const systemPrompt = `You are a code generation assistant. Generate ONLY the code content for the file, with no explanations, markdown formatting, or comments outside the code itself. The code should be production-ready and follow best practices.`;
  
  const fileContext = getFileTreeString(rootDir);
  
  const userPrompt = `Create a new file at: ${filePath}

Task: ${step.action}
Description: ${step.description}
Reasoning: ${step.reasoning}

Project context:
${fileContext}

Generate the complete file content. Output ONLY the raw code with no markdown fences, no explanations, just the file content.`;

  const content = await callOpenRouter(systemPrompt, userPrompt);
  
  // Clean up the response (remove markdown code blocks if present)
  let cleanContent = content.trim();
  if (cleanContent.startsWith('```')) {
    // Remove opening fence
    cleanContent = cleanContent.replace(/^```[\w]*\n/, '');
    // Remove closing fence
    cleanContent = cleanContent.replace(/\n```$/, '');
  }

  // Create directory if it doesn't exist
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Write the file
  writeFileSync(filePath, cleanContent, 'utf-8');
  console.log(`   ✅ Created ${filePath}`);
}

/**
 * WORKFLOW STEP 14: Modify an existing file with LLM-guided changes
 * 
 * Purpose: Apply targeted modifications to existing code
 * 
 * Process:
 * 1. Read current file content
 * 2. Use LLM to generate the modified version based on step description
 * 3. Write the updated content back to the file
 * 
 * @param filePath - Full path to file to modify
 * @param step - The plan step containing modification details
 * @param rootDir - Project root directory
 */
async function modifyFile(
  filePath: string,
  step: PlanStep,
  rootDir: string
): Promise<void> {
  // Read current file content
  const currentContent = readFileSync(filePath, 'utf-8');
  
  // Generate modified content using LLM
  const systemPrompt = `You are a code modification assistant. You will receive the current content of a file and instructions for how to modify it. 

IMPORTANT: Return ONLY the complete, modified file content. Do not use markdown code fences, do not add explanations, do not add comments about what you changed. Just output the raw, complete file content with the modifications applied.`;
  
  const fileContext = getFileTreeString(rootDir);
  
  const userPrompt = `Modify the file at: ${filePath}

Task: ${step.action}
Description: ${step.description}
Reasoning: ${step.reasoning}

Project context:
${fileContext}

Current file content:
${currentContent}

Generate the COMPLETE modified file content with the requested changes applied. Output ONLY the raw code with no markdown fences, no explanations, just the complete file content.`;

  const modifiedContent = await callOpenRouter(systemPrompt, userPrompt);
  
  // Clean up the response (remove markdown code blocks if present)
  let cleanContent = modifiedContent.trim();
  if (cleanContent.startsWith('```')) {
    // Remove opening fence
    cleanContent = cleanContent.replace(/^```[\w]*\n/, '');
    // Remove closing fence
    cleanContent = cleanContent.replace(/\n```$/, '');
  }

  // Write the modified content back
  writeFileSync(filePath, cleanContent, 'utf-8');
  console.log(`   ✅ Modified ${filePath}`);
}

/**
 * WORKFLOW STEP 15: Execute the complete plan
 * 
 * Purpose: Execute all steps in sequence, reporting progress
 * 
 * Process:
 * 1. Iterate through each step in order
 * 2. Execute the step
 * 3. Report success or failure
 * 4. Continue to next step or stop on error (based on continueOnError flag)
 * 
 * @param plan - The complete execution plan
 * @param rootDir - Project root directory
 * @param continueOnError - Whether to continue executing steps if one fails
 * @returns Summary of execution results
 */
export async function executePlan(
  plan: ExecutionPlan,
  rootDir: string = process.cwd(),
  continueOnError: boolean = false
): Promise<{ totalSteps: number; successCount: number; failedSteps: number[] }> {
  console.log('\n🚀 Starting execution...\n');
  
  const results = {
    totalSteps: plan.steps.length,
    successCount: 0,
    failedSteps: [] as number[]
  };

  for (const step of plan.steps) {
    const result = await executeStep(step, rootDir);
    
    if (result.success) {
      results.successCount++;
      console.log(`   ✅ ${result.message}`);
    } else {
      results.failedSteps.push(step.step);
      console.log(`   ❌ Failed: ${result.message}`);
      
      if (!continueOnError) {
        console.log('\n⚠️  Stopping execution due to error.');
        break;
      }
    }
  }

  console.log('\n' + '═'.repeat(50));
  console.log(`\n📊 Execution Summary:`);
  console.log(`   Total steps: ${results.totalSteps}`);
  console.log(`   Successful: ${results.successCount}`);
  console.log(`   Failed: ${results.failedSteps.length}`);
  
  if (results.failedSteps.length > 0) {
    console.log(`   Failed step numbers: ${results.failedSteps.join(', ')}`);
  }

  return results;
}