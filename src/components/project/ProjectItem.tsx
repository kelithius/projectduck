'use client';

import React, { useState } from 'react';
import { Space, Typography, Tooltip } from 'antd';
import { FolderOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { ProjectValidationResult } from '@/lib/types';
import { useTranslation } from 'react-i18next';
import styles from '@/styles/project-sidebar.module.css';
import { useDesignTokens, useThemedStyles } from '@/lib/design/useDesignTokens';

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
  const tokens = useDesignTokens();
  const themedStyles = useThemedStyles();
  const [isHovered, setIsHovered] = useState(false);

  const getStatusIcon = () => {
    const containerStyle = {
      width: '20px',
      height: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative' as const
    };

    const iconStyle = {
      fontSize: '16px',
      lineHeight: '1',
      position: 'absolute' as const,
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)'
    };

    if (!project.isValid) {
      return (
        <div style={containerStyle}>
          <ExclamationCircleOutlined style={{ ...iconStyle, color: tokens.colors.status.error }} />
        </div>
      );
    } else {
      // 無論選中與否都使用 FolderOutlined，只改變顏色
      const color = isActive 
        ? (isDark ? tokens.colors.text.primary : tokens.semantic.antd.primary)  // 選中時的顏色
        : (isDark ? tokens.colors.text.secondary : tokens.semantic.antd.primary); // 未選中時的顏色
      return (
        <div style={containerStyle}>
          <FolderOutlined style={{ ...iconStyle, color }} />
        </div>
      );
    }
  };

  const getItemStyle = (): React.CSSProperties => {
    const backgroundColor = themedStyles.projectItemBg(isActive, isHovered && !disabled);

    return {
      backgroundColor
    };
  };

  const titleStyle = {
    fontSize: '14px',
    fontWeight: isActive ? 600 : 500,
    color: disabled && !isActive
      ? tokens.colors.text.disabled
      : isActive 
        ? (isDark ? tokens.colors.text.primary : tokens.semantic.antd.primary)
        : tokens.colors.text.primary,
    margin: 0,
    lineHeight: '20px'
  };



  const errorStyle = {
    fontSize: '11px',
    color: tokens.colors.status.error,
    margin: '2px 0 0 0',
    lineHeight: '14px'
  };

  const content = (
    <div style={{ width: '100%' }}>
      <Space align="start" size={12} style={{ width: '100%' }}>
        <div style={{ 
          marginTop: '2px',
          flexShrink: 0
        }}>
          {getStatusIcon()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div>
            <Text style={titleStyle}>
              {project.name}
            </Text>
          </div>
          {!project.isValid && project.errorMessage && (
            <div>
              <Text style={errorStyle}>
                {t('project.item.error')}: {project.errorMessage}
              </Text>
            </div>
          )}
        </div>
      </Space>
    </div>
  );

  const getClassName = () => {
    const classes = [styles.projectItem];
    if (isActive) classes.push(styles.active);
    if (disabled) classes.push(styles.disabled);
    return classes.join(' ');
  };

  if (disabled) {
    return (
      <Tooltip 
        title={project.errorMessage || t('project.item.unavailable')}
        placement="right"
      >
        <div 
          style={{
            ...getItemStyle(),
            cursor: 'not-allowed',
            userSelect: 'none'
          }}
          className={getClassName()}
        >
          {content}
        </div>
      </Tooltip>
    );
  }

  return (
    <div
      style={{
        ...getItemStyle(),
        cursor: disabled ? 'not-allowed' : isActive ? 'default' : 'pointer',
        userSelect: 'none'
      }}
      onClick={disabled ? undefined : onClick}
      className={getClassName()}
      onMouseEnter={() => !disabled && !isActive && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {content}
    </div>
  );
};