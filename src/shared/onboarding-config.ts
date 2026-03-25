/**
 * Shared Onboarding Configuration
 *
 * This module provides a single source of truth for onboarding configuration
 * used by both the APP and test scripts.
 */

import sharedConfig from './config.json';

// Types
export interface CredentialField {
  label: string;
  placeholder: string;
  type: 'text' | 'password';
  required: boolean;
}

export interface AgentApp {
  name: string;
  description: string;
}

export interface Role {
  name: string;
  description: string;
  useCases: string[];
}

export interface BaseSkill {
  name: string;
  description: string;
  credentials: Record<string, CredentialField>;
}

export interface UseCase {
  name: string;
  description: string;
}

export interface SharedConfig {
  version: string;
  agentApps: Record<string, AgentApp>;
  roles: Record<string, Role>;
  baseSkills: Record<string, BaseSkill>;
  useCases: Record<string, UseCase>;
  testDefaults: {
    agentApps: string[];
    role: string;
    baseSkills: string[];
    useCase: string;
    infoSources: string;
    reportRules: string;
  };
}

// Export the config
export const config: SharedConfig = sharedConfig as SharedConfig;

// Helper functions
export function getAgentApps() {
  return Object.entries(config.agentApps).map(([key, app]) => ({
    key,
    ...app,
  }));
}

export function getRoles() {
  return Object.entries(config.roles).map(([key, role]) => ({
    key,
    ...role,
  }));
}

export function getBaseSkills() {
  return Object.entries(config.baseSkills).map(([key, skill]) => ({
    key,
    ...skill,
  }));
}

export function getUseCases() {
  return Object.entries(config.useCases).map(([key, useCase]) => ({
    key,
    ...useCase,
  }));
}

export function getRoleUseCases(roleKey: string): string[] {
  return config.roles[roleKey]?.useCases || [];
}

export function getSkillCredentials(skillKey: string): Record<string, CredentialField> {
  return config.baseSkills[skillKey]?.credentials || {};
}

export function getDefaultConfig() {
  return config.testDefaults;
}

export default config;
