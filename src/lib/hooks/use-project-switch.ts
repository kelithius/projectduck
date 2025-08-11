'use client';

import { useCallback } from 'react';
import { useProject } from '@/lib/providers/project-provider';
import { ProjectValidationResult } from '@/lib/types';

interface UseProjectSwitchReturn {
  currentProject: ProjectValidationResult | null;
  projects: ProjectValidationResult[];
  switchToProject: (projectIndex: number) => Promise<void>;
  refreshProjects: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  getCurrentBasePath: () => string;
  getValidProjects: () => ProjectValidationResult[];
  getInvalidProjects: () => ProjectValidationResult[];
  getCurrentProjectIndex: () => number;
}

export function useProjectSwitch(): UseProjectSwitchReturn {
  const {
    currentProject,
    projects,
    switchProject,
    loadProjects,
    isLoading,
    error,
    getCurrentBasePath,
  } = useProject();

  const switchToProject = useCallback(async (projectIndex: number) => {
    await switchProject(projectIndex);
  }, [switchProject]);

  const refreshProjects = useCallback(async () => {
    await loadProjects();
  }, [loadProjects]);

  const getValidProjects = useCallback((): ProjectValidationResult[] => {
    return projects.filter(project => project.isValid);
  }, [projects]);

  const getInvalidProjects = useCallback((): ProjectValidationResult[] => {
    return projects.filter(project => !project.isValid);
  }, [projects]);

  const getCurrentProjectIndex = useCallback((): number => {
    if (currentProject) {
      return projects.indexOf(currentProject);
    }
    return -1;
  }, [currentProject, projects]);

  return {
    currentProject,
    projects,
    switchToProject,
    refreshProjects,
    isLoading,
    error,
    getCurrentBasePath,
    getValidProjects,
    getInvalidProjects,
    getCurrentProjectIndex,
  };
}