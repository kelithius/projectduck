'use client';

import React from 'react';
import { Drawer, Typography, Space, Alert, Button, Spin, Divider } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useProjectSwitch } from '@/lib/hooks/use-project-switch';
import { ProjectItem } from './ProjectItem';

const { Title, Text } = Typography;

interface ProjectSidebarProps {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
}

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  visible,
  onClose,
  isDark
}) => {
  const { t } = useTranslation();
  const {
    currentProject,
    projects,
    getValidProjects,
    getInvalidProjects,
    switchToProject,
    isLoading,
    error
  } = useProjectSwitch();

  const validProjects = getValidProjects();
  const invalidProjects = getInvalidProjects();

  const handleProjectSelect = async (projectIndex: number) => {
    await switchToProject(projectIndex);
    onClose();
  };


  const drawerStyle = {
    backgroundColor: isDark ? '#1f1f1f' : '#ffffff',
    borderRight: `1px solid ${isDark ? '#303030' : '#d9d9d9'}`
  };

  const headerStyle = {
    backgroundColor: isDark ? '#141414' : '#fafafa',
    borderBottom: `1px solid ${isDark ? '#303030' : '#d9d9d9'}`,
    padding: '16px 24px'
  };

  const bodyStyle = {
    backgroundColor: isDark ? '#1f1f1f' : '#ffffff',
    padding: '0'
  };

  return (
    <Drawer
      title={
        <div style={headerStyle}>
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Title 
                level={4} 
                style={{ 
                  margin: 0, 
                  color: isDark ? '#ffffff' : '#000000' 
                }}
              >
                {t('project.sidebar.title', '選擇專案')}
              </Title>
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={onClose}
                style={{ 
                  color: isDark ? '#ffffff' : '#1890ff' 
                }}
              />
            </Space>
          </Space>
        </div>
      }
      placement="left"
      onClose={onClose}
      open={visible}
      width={320}
      closable={false}
      styles={{
        header: { display: 'none' },
        body: bodyStyle,
        content: drawerStyle
      }}
      mask={true}
      maskClosable={true}
    >
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={headerStyle}>
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Title 
                level={4} 
                style={{ 
                  margin: 0, 
                  color: isDark ? '#ffffff' : '#000000' 
                }}
              >
                {t('project.sidebar.title', '選擇專案')}
              </Title>
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={onClose}
                style={{ 
                  color: isDark ? '#ffffff' : '#1890ff' 
                }}
              />
            </Space>
          </Space>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 0' }}>
          {isLoading && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              height: '100px'
            }}>
              <Spin size="large" />
            </div>
          )}

          {error && (
            <div style={{ padding: '0 16px', marginBottom: '16px' }}>
              <Alert
                message={t('project.sidebar.error', '載入專案時發生錯誤')}
                description={error}
                type="error"
                showIcon
                style={{
                  backgroundColor: isDark ? '#2a1215' : '#fff2f0',
                  borderColor: isDark ? '#a61d24' : '#ffccc7'
                }}
              />
            </div>
          )}

          {!isLoading && !error && (
            <div>
              {/* Valid Projects */}
              {validProjects.length > 0 && (
                <div>
                  <div style={{ padding: '0 16px', marginBottom: '8px' }}>
                    <Text 
                      strong 
                      style={{ 
                        fontSize: '14px',
                        color: isDark ? '#ffffff' : '#000000' 
                      }}
                    >
                      {t('project.sidebar.available', '可用專案')}
                    </Text>
                  </div>
                  {validProjects.map((project) => {
                    const projectIndex = projects.indexOf(project);
                    return (
                      <ProjectItem
                        key={projectIndex}
                        project={project}
                        isActive={currentProject === project}
                        onClick={() => handleProjectSelect(projectIndex)}
                        isDark={isDark}
                      />
                    );
                  })}
                </div>
              )}

              {/* Invalid Projects */}
              {invalidProjects.length > 0 && (
                <div>
                  {validProjects.length > 0 && (
                    <Divider 
                      style={{ 
                        borderColor: isDark ? '#303030' : '#d9d9d9',
                        margin: '16px 0'
                      }} 
                    />
                  )}
                  <div style={{ padding: '0 16px', marginBottom: '8px' }}>
                    <Text 
                      type="warning"
                      style={{ 
                        fontSize: '14px'
                      }}
                    >
                      {t('project.sidebar.unavailable', '無法存取的專案')}
                    </Text>
                  </div>
                  {invalidProjects.map((project) => {
                    const projectIndex = projects.indexOf(project);
                    return (
                      <ProjectItem
                        key={projectIndex}
                        project={project}
                        isActive={false}
                        onClick={() => {}}
                        isDark={isDark}
                        disabled={true}
                      />
                    );
                  })}
                </div>
              )}

              {validProjects.length === 0 && invalidProjects.length === 0 && (
                <div style={{ padding: '16px', textAlign: 'center' }}>
                  <Text 
                    type="secondary"
                    style={{ 
                      color: isDark ? '#8c8c8c' : '#8c8c8c' 
                    }}
                  >
                    {t('project.sidebar.noProjects', '沒有找到專案')}
                  </Text>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
};