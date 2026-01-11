const fs = require('fs');
const path = require('path');

// Colors for console output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENROUTER_API_KEY',
];

const OPTIONAL_ENV_VARS = [
  'NEXT_PUBLIC_SITE_URL',
  'VERCEL_URL'
];

function checkEnv() {
  console.log('🔍 Validating Environment Variables...');
  
  // Load environment variables from .env files
  try {
    require('dotenv').config({ path: '.env.local' });
    require('dotenv').config({ path: '.env' });
  } catch (e) {
    // dotenv might not be available or needed in some CI environments where vars are injected
    console.log(`${YELLOW}Note: dotenv not loaded (environment might be pre-injected)${RESET}`);
  }

  let hasError = false;
  const missing = [];

  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key);
      hasError = true;
    }
  }

  if (hasError) {
    console.error(`${RED}❌ Critical: Missing Required Environment Variables:${RESET}`);
    missing.forEach(k => console.error(`   - ${k}`));
    console.error(`\n${RED}Build/Startup cannot proceed without these variables.${RESET}`);
    process.exit(1);
  }

  console.log(`${GREEN}✅ Required variables present.${RESET}`);

  // Check optional vars
  OPTIONAL_ENV_VARS.forEach(key => {
    if (!process.env[key]) {
      console.log(`${YELLOW}⚠️  Note: Optional variable ${key} is missing.${RESET}`);
    }
  });
}

checkEnv();
