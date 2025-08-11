'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  ProjectContextState, 
  ProjectContextActions, 
  ProjectValidationResult, 
  ProjectsResponse 
} from '@/lib/types';

interface ProjectContextType extends ProjectContextState, ProjectContextActions {}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

interface ProjectProviderProps {
  children: React.ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const [projects, setProjects] = useState<ProjectValidationResult[]>([]);
  const [currentProject, setCurrentProject] = useState<ProjectValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/projects');
      const result: ProjectsResponse = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load projects');
      }
      
      const validProjects: ProjectValidationResult[] = result.data.projects;
      setProjects(validProjects);
      
      // 嘗試根據專案名稱（而非索引）來恢復當前專案
      const savedProjectName = localStorage.getItem('projectduck-current-project-name');
      let targetProject: ProjectValidationResult | null = null;
      
      if (savedProjectName) {
        // 先嘗試根據專案名稱找到對應的專案
        const projectByName = validProjects.find(p => p.name === savedProjectName && p.isValid);
        if (projectByName) {
          targetProject = projectByName;
        }
      }
      
      // 如果根據名稱找不到，嘗試使用儲存的索引（向後兼容）
      if (!targetProject) {
        const savedProjectIndex = localStorage.getItem('projectduck-current-project');
        if (savedProjectIndex !== null) {
          const index = parseInt(savedProjectIndex, 10);
          if (!isNaN(index) && index >= 0 && index < validProjects.length) {
            const candidate = validProjects[index];
            if (candidate && candidate.isValid) {
              targetProject = candidate;
            }
          }
        }
      }
      
      // 如果還是沒有找到，使用第一個有效專案
      if (!targetProject && validProjects.length > 0) {
        const firstValidProject = validProjects.find(p => p.isValid);
        if (firstValidProject) {
          targetProject = firstValidProject;
        }
      }
      
      setCurrentProject(targetProject);
      
      if (targetProject) {
        const projectIndex = validProjects.indexOf(targetProject);
        // 同時儲存索引和專案名稱
        localStorage.setItem('projectduck-current-project', projectIndex.toString());
        localStorage.setItem('projectduck-current-project-name', targetProject.name);
        
        window.dispatchEvent(new CustomEvent('projectChange', {
          detail: { project: targetProject }
        }));
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error loading projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const switchProject = useCallback(async (projectIndex: number) => {
    if (projectIndex < 0 || projectIndex >= projects.length) {
      setError(`Project index ${projectIndex} is out of range`);
      return;
    }
    
    const targetProject = projects[projectIndex];
    
    if (!targetProject.isValid) {
      setError(`Cannot switch to invalid project: ${targetProject.errorMessage}`);
      return;
    }
    
    setCurrentProject(targetProject);
    // 同時儲存索引和專案名稱
    localStorage.setItem('projectduck-current-project', projectIndex.toString());
    localStorage.setItem('projectduck-current-project-name', targetProject.name);
    
    window.dispatchEvent(new CustomEvent('projectChange', {
      detail: { project: targetProject }
    }));
    
    setError(null);
  }, [projects]);

  const getCurrentBasePath = useCallback((): string => {
    if (currentProject && currentProject.isValid) {
      return currentProject.path;
    }
    
    // 沒有可用專案時返回空字串，讓調用方處理錯誤
    return '';
  }, [currentProject]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const contextValue: ProjectContextType = {
    projects,
    currentProject,
    isLoading,
    error,
    loadProjects,
    switchProject,
    getCurrentBasePath,
  };

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
}