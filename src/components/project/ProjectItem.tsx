'use client';

import React, { useState } from 'react';
import { Space, Typography, Button, Tooltip } from 'antd';
import { FolderOutlined, ExclamationCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { ProjectValidationResult } from '@/lib/types';
import { useTranslation } from 'react-i18next';
import styles from '@/styles/project-sidebar.module.css';

const { Text } = Typography;

interface ProjectItemProps {
  project: ProjectValidationResult;
  isActive: boolean;
  onClick: () => void;
  isDark: boolean;
  disabled?: boolean;
}

export const ProjectItem: React.FC<ProjectItemProps> = ({
  project,
  isActive,
  onClick,
  isDark,
  disabled = false
}) => {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  const getStatusIcon = () => {
    if (project.isValid) {
      return isActive ? (
        <CheckCircleOutlined style={{ color: '#52c41a' }} />
      ) : (
        <FolderOutlined style={{ color: isDark ? '#8c8c8c' : '#1890ff' }} />
      );
    } else {
      return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
    }
  };

  const getItemStyle = (): React.CSSProperties => {
    let backgroundColor = 'transparent';

    if (disabled) {
      backgroundColor = isDark ? '#1a1a1a' : '#f5f5f5';
    } else if (isActive) {
      backgroundColor = isDark ? '#177ddc' : '#e6f7ff';
    } else if (isHovered && !disabled) {
      backgroundColor = isDark ? '#262626' : '#f5f5f5';
    }

    return {
      backgroundColor
    };
  };

  const titleStyle = {
    fontSize: '14px',
    fontWeight: isActive ? 600 : 500,
    color: disabled 
      ? (isDark ? '#595959' : '#8c8c8c')
      : isActive 
        ? (isDark ? '#ffffff' : '#1890ff')
        : (isDark ? '#ffffff' : '#000000'),
    margin: 0,
    lineHeight: '20px'
  };


  const pathStyle = {
    fontSize: '11px',
    color: disabled 
      ? (isDark ? '#434343' : '#bfbfbf')
      : (isDark ? '#8c8c8c' : '#bfbfbf'),
    margin: '2px 0 0 0',
    lineHeight: '14px',
    wordBreak: 'break-all' as const
  };

  const errorStyle = {
    fontSize: '11px',
    color: '#ff4d4f',
    margin: '2px 0 0 0',
    lineHeight: '14px'
  };

  const content = (
    <div style={{ width: '100%' }}>
      <Space align="start" size={8} style={{ width: '100%' }}>
        <div style={{ marginTop: '2px' }}>
          {getStatusIcon()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text style={titleStyle}>
            {project.name}
          </Text>
          {!project.isValid && project.errorMessage && (
            <Text style={errorStyle}>
              {t('project.item.error', '錯誤')}: {project.errorMessage}
            </Text>
          )}
        </div>
      </Space>
    </div>
  );

  if (disabled) {
    return (
      <Tooltip 
        title={project.errorMessage || t('project.item.unavailable', '此專案無法存取')}
        placement="right"
      >
        <div style={getItemStyle()}>
          {content}
        </div>
      </Tooltip>
    );
  }

  const getClassName = () => {
    const classes = [styles.projectItem];
    if (isActive) classes.push(styles.active);
    if (disabled) classes.push(styles.disabled);
    return classes.join(' ');
  };

  return (
    <Button
      style={getItemStyle()}
      onClick={onClick}
      type="text"
      className={getClassName()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {content}
    </Button>
  );
};