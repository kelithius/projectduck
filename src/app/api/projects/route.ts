import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { statSync } from 'fs';
import { join } from 'path';
import { ProjectConfig, ProjectValidationResult, ProjectsResponse, ApiError } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const projectsConfigPath = join(process.cwd(), 'projects.json');
    
    if (!existsSync(projectsConfigPath)) {
      const errorResponse: ApiError = {
        success: false,
        error: 'projects.json configuration file not found',
        code: 'CONFIG_NOT_FOUND'
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    const configContent = readFileSync(projectsConfigPath, 'utf-8');
    let config: ProjectConfig;
    
    try {
      config = JSON.parse(configContent);
    } catch (parseError) {
      const errorResponse: ApiError = {
        success: false,
        error: 'Invalid JSON format in projects.json',
        code: 'INVALID_JSON'
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (!config.version || !Array.isArray(config.projects)) {
      const errorResponse: ApiError = {
        success: false,
        error: 'Invalid configuration format. Missing required fields: version or projects array',
        code: 'INVALID_CONFIG'
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const validatedProjects: ProjectValidationResult[] = config.projects.map(project => {
      const validation = validateProject(project);
      return {
        ...project,
        isValid: validation.isValid,
        errorMessage: validation.errorMessage
      };
    });

    const response: ProjectsResponse = {
      success: true,
      data: {
        ...config,
        projects: validatedProjects
      }
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error loading projects configuration');
    
    const errorResponse: ApiError = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred while loading projects',
      code: 'INTERNAL_ERROR'
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

function validateProject(project: unknown): { isValid: boolean; errorMessage?: string } {
  // 類型守護：確保 project 是一個物件
  if (!project || typeof project !== 'object') {
    return { isValid: false, errorMessage: 'Project must be an object' };
  }
  
  const proj = project as Record<string, unknown>;
  if (!proj.name || typeof proj.name !== 'string') {
    return { isValid: false, errorMessage: 'Project name is required and must be a string' };
  }
  
  if (!proj.path || typeof proj.path !== 'string') {
    return { isValid: false, errorMessage: 'Project path is required and must be a string' };
  }
  
  try {
    if (!existsSync(proj.path as string)) {
      return { isValid: false, errorMessage: 'Project directory does not exist' };
    }
    
    const stats = statSync(proj.path as string);
    if (!stats.isDirectory()) {
      return { isValid: false, errorMessage: 'Project path is not a directory' };
    }
  } catch (error) {
    return { 
      isValid: false, 
      errorMessage: 'Cannot access project directory' 
    };
  }
  
  return { isValid: true };
}