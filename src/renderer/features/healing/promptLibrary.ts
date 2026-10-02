import promptsFile from '@assets/prompts.json';
import { parsePromptLibrary } from '../../domain/healingProgram';

export const PROMPT_LIBRARY = parsePromptLibrary(promptsFile);
