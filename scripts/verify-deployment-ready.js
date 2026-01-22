#!/usr/bin/env node

/**
 * Half Trip - Deployment Readiness Check
 *
 * This script verifies that the project is ready for production deployment.
 * Run this before deploying to catch common issues early.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🚀 Half Trip - Deployment Readiness Check\n');

let hasErrors = false;
let hasWarnings = false;

// Check 1: Environment variables
console.log('📋 Checking environment configuration...');
const envExamplePath = path.join(rootDir, '.env.example');
const envPath = path.join(rootDir, '.env');

if (!fs.existsSync(envExamplePath)) {
  console.error('  ❌ .env.example not found');
  hasErrors = true;
} else {
  console.log('  ✅ .env.example exists');

  // Parse required variables
  const envExample = fs.readFileSync(envExamplePath, 'utf-8');
  const requiredVars = envExample
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#'))
    .map((line) => line.split('=')[0]);

  console.log(`  ℹ️  Required environment variables: ${requiredVars.length}`);
  requiredVars.forEach((varName) => {
    console.log(`     - ${varName}`);
  });
}

if (fs.existsSync(envPath)) {
  console.log('  ⚠️  .env file exists (should not be committed)');
  hasWarnings = true;
}

// Check 2: Build configuration
console.log('\n🔧 Checking build configuration...');
const packageJsonPath = path.join(rootDir, 'package.json');
const nextConfigPath = path.join(rootDir, 'next.config.ts');

if (!fs.existsSync(packageJsonPath)) {
  console.error('  ❌ package.json not found');
  hasErrors = true;
} else {
  console.log('  ✅ package.json exists');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  // Check scripts
  const requiredScripts = ['dev', 'build', 'start', 'lint'];
  requiredScripts.forEach((script) => {
    if (packageJson.scripts[script]) {
      console.log(`  ✅ Script "${script}" defined`);
    } else {
      console.error(`  ❌ Script "${script}" missing`);
      hasErrors = true;
    }
  });
}

if (!fs.existsSync(nextConfigPath)) {
  console.error('  ❌ next.config.ts not found');
  hasErrors = true;
} else {
  console.log('  ✅ next.config.ts exists');
}

// Check 3: Database migrations
console.log('\n🗄️  Checking database migrations...');
const migrationsDir = path.join(rootDir, 'supabase', 'migrations');

if (!fs.existsSync(migrationsDir)) {
  console.error('  ❌ supabase/migrations directory not found');
  hasErrors = true;
} else {
  const migrations = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (migrations.length === 0) {
    console.error('  ❌ No migration files found');
    hasErrors = true;
  } else {
    console.log(`  ✅ Found ${migrations.length} migration files`);
    migrations.forEach((file, index) => {
      console.log(`     ${index + 1}. ${file}`);
    });
  }
}

// Check 4: Required directories
console.log('\n📁 Checking directory structure...');
const requiredDirs = ['src/app', 'src/components', 'src/lib', 'src/hooks', 'public'];

requiredDirs.forEach((dir) => {
  const dirPath = path.join(rootDir, dir);
  if (fs.existsSync(dirPath)) {
    console.log(`  ✅ ${dir} exists`);
  } else {
    console.error(`  ❌ ${dir} missing`);
    hasErrors = true;
  }
});

// Check 5: PWA assets
console.log('\n📱 Checking PWA assets...');
const pwaAssets = ['public/icon.svg', 'public/favicon.ico', 'public/apple-touch-icon.png'];

pwaAssets.forEach((asset) => {
  const assetPath = path.join(rootDir, asset);
  if (fs.existsSync(assetPath)) {
    console.log(`  ✅ ${asset} exists`);
  } else {
    console.error(`  ❌ ${asset} missing`);
    hasErrors = true;
  }
});

// Check 6: Git configuration
console.log('\n🔐 Checking Git configuration...');
const gitignorePath = path.join(rootDir, '.gitignore');

if (!fs.existsSync(gitignorePath)) {
  console.error('  ❌ .gitignore not found');
  hasErrors = true;
} else {
  console.log('  ✅ .gitignore exists');
  const gitignore = fs.readFileSync(gitignorePath, 'utf-8');

  const requiredIgnores = ['.env', 'node_modules', '.next', '.vercel'];
  requiredIgnores.forEach((pattern) => {
    if (gitignore.includes(pattern)) {
      console.log(`  ✅ ${pattern} in .gitignore`);
    } else {
      console.error(`  ❌ ${pattern} missing from .gitignore`);
      hasErrors = true;
    }
  });
}

// Check 7: TypeScript configuration
console.log('\n📘 Checking TypeScript configuration...');
const tsconfigPath = path.join(rootDir, 'tsconfig.json');

if (!fs.existsSync(tsconfigPath)) {
  console.error('  ❌ tsconfig.json not found');
  hasErrors = true;
} else {
  console.log('  ✅ tsconfig.json exists');
}

// Check 8: Documentation
console.log('\n📚 Checking documentation...');
const docs = ['README.md', 'DEPLOYMENT.md'];

docs.forEach((doc) => {
  const docPath = path.join(rootDir, doc);
  if (fs.existsSync(docPath)) {
    console.log(`  ✅ ${doc} exists`);
  } else {
    console.warn(`  ⚠️  ${doc} missing (recommended)`);
    hasWarnings = true;
  }
});

// Final summary
console.log('\n' + '='.repeat(60));
console.log('📊 Summary\n');

if (hasErrors) {
  console.error('❌ FAILED - Please fix the errors above before deploying\n');
  process.exit(1);
} else if (hasWarnings) {
  console.warn('⚠️  PASSED WITH WARNINGS - Review warnings before deploying\n');
  console.log('Next steps:');
  console.log('  1. Run: pnpm build');
  console.log('  2. Run: pnpm lint');
  console.log('  3. Run: pnpm test');
  console.log('  4. Review DEPLOYMENT.md for deployment steps\n');
  process.exit(0);
} else {
  console.log('✅ ALL CHECKS PASSED - Ready for deployment!\n');
  console.log('Next steps:');
  console.log('  1. Run: pnpm build');
  console.log('  2. Run: pnpm lint');
  console.log('  3. Run: pnpm test');
  console.log('  4. Review DEPLOYMENT.md for deployment steps\n');
  process.exit(0);
}
