import type { NextConfig } from "next";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

// Check for required projects.json configuration
const projectsConfigPath = join(process.cwd(), 'projects.json');

if (!existsSync(projectsConfigPath)) {
  console.error('\x1b[31m[ERROR]\x1b[0m projects.json configuration file not found');
  console.log('');
  console.log('ProjectDuck requires a projects.json configuration file to run.');
  console.log('');
  console.log('Please create a projects.json file in the project root with the following format:');
  console.log('');
  console.log(JSON.stringify({
    "version": "1.0",
    "projects": [
      {
        "name": "My Documents",
        "path": "./example"
      }
    ]
  }, null, 2));
  console.log('');
  console.log('Example command:');
  console.log('echo \'{"version":"1.0","projects":[{"name":"My Docs","path":"./example"}]}\' > projects.json');
  console.log('');
  process.exit(1);
}

// Validate JSON syntax and basic structure
try {
  const configContent = readFileSync(projectsConfigPath, 'utf-8');
  const config = JSON.parse(configContent);
  
  if (!config.version || !Array.isArray(config.projects)) {
    console.error('\x1b[31m[ERROR]\x1b[0m Invalid projects.json format');
    console.log('projects.json must contain "version" and "projects" array');
    process.exit(1);
  }
  
  if (config.projects.length === 0) {
    console.error('\x1b[31m[ERROR]\x1b[0m No projects defined in configuration');
    console.log('At least one project must be configured');
    process.exit(1);
  }
  
  console.log(`\x1b[32m[INFO]\x1b[0m Found valid projects.json with ${config.projects.length} project(s)`);
} catch (error) {
  console.error('\x1b[31m[ERROR]\x1b[0m Invalid JSON syntax in projects.json');
  console.log('Please check your JSON format and try again.');
  process.exit(1);
}

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
};

export default nextConfig;
