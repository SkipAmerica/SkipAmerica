#!/usr/bin/env node
/**
 * Script to detect duplicate types, components, and other code patterns
 * Run this in CI to prevent regressions
 */

const fs = require('fs')
const path = require('path')
const glob = require('glob')

// Configuration
const SRC_DIR = './src'
const PATTERNS_TO_CHECK = [
  // Interface definitions
  {
    name: 'Duplicate Interfaces',
    pattern: /interface\s+(\w+Props?)\s*{/g,
    allowedDuplicates: ['BaseProps', 'ChildrenProps'] // Generic ones are OK
  },
  // Type definitions
  {
    name: 'Duplicate Types',
    pattern: /type\s+(\w+)\s*=/g,
    allowedDuplicates: ['ID', 'Callback']
  },
  // Component definitions
  {
    name: 'Duplicate Components',
    pattern: /(?:export\s+)?(?:const|function)\s+([A-Z]\w+)(?:\s*=|\()/g,
    allowedDuplicates: ['Button', 'Input'] // shadcn components are OK
  }
]

function findDuplicates() {
  const results = []
  
  // Get all TypeScript/TSX files
  const files = glob.sync(`${SRC_DIR}/**/*.{ts,tsx}`, {
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.d.ts',
      '**/integrations/supabase/types.ts' // Generated file
    ]
  })
  
  PATTERNS_TO_CHECK.forEach(({ name, pattern, allowedDuplicates }) => {
    const found = new Map()
    
    files.forEach(filePath => {
      const content = fs.readFileSync(filePath, 'utf8')
      let match
      
      // Reset regex
      pattern.lastIndex = 0
      
      while ((match = pattern.exec(content)) !== null) {
        const identifier = match[1]
        
        if (allowedDuplicates?.includes(identifier)) {
          continue
        }
        
        if (!found.has(identifier)) {
          found.set(identifier, [])
        }
        
        found.get(identifier).push({
          file: filePath,
          line: content.substring(0, match.index).split('\n').length
        })
      }
    })
    
    // Report duplicates
    const duplicates = Array.from(found.entries())
      .filter(([_, locations]) => locations.length > 1)
    
    if (duplicates.length > 0) {
      results.push({
        category: name,
        duplicates: duplicates.map(([identifier, locations]) => ({
          identifier,
          locations
        }))
      })
    }
  })
  
  return results
}

function checkFolderDiscipline() {
  const violations = []
  
  // Check that shared types are only in shared/types
  const typeFiles = glob.sync(`${SRC_DIR}/**/types.ts`, {
    ignore: [`${SRC_DIR}/shared/types/**`]
  })
  
  if (typeFiles.length > 0) {
    violations.push({
      rule: 'Types should be in shared/types only',
      violations: typeFiles
    })
  }
  
  // Check that hooks are properly placed
  const hookFiles = glob.sync(`${SRC_DIR}/**/use*.ts`, {
    ignore: [
      `${SRC_DIR}/shared/hooks/**`,
      `${SRC_DIR}/features/**/hooks/**`,
      `${SRC_DIR}/hooks/**` // Legacy, will be moved
    ]
  })
  
  if (hookFiles.length > 0) {
    violations.push({
      rule: 'Hooks should be in shared/hooks or feature/hooks',
      violations: hookFiles
    })
  }
  
  return violations
}

function main() {
  console.log('🔍 Checking for code duplicates and violations...\n')
  
  const duplicates = findDuplicates()
  const violations = checkFolderDiscipline()
  
  let hasErrors = false
  
  // Report duplicates
  if (duplicates.length > 0) {
    hasErrors = true
    console.log('❌ Found duplicate code:')
    
    duplicates.forEach(({ category, duplicates }) => {
      console.log(`\n📁 ${category}:`)
      
      duplicates.forEach(({ identifier, locations }) => {
        console.log(`  🔄 "${identifier}" found in:`)
        locations.forEach(({ file, line }) => {
          console.log(`    - ${file}:${line}`)
        })
      })
    })
  }
  
  // Report violations
  if (violations.length > 0) {
    hasErrors = true
    console.log('\n❌ Found folder discipline violations:')
    
    violations.forEach(({ rule, violations }) => {
      console.log(`\n📂 ${rule}:`)
      violations.forEach(file => {
        console.log(`  - ${file}`)
      })
    })
  }
  
  if (!hasErrors) {
    console.log('✅ No duplicates or violations found!')
  }
  
  // Exit with error code if issues found (for CI)
  process.exit(hasErrors ? 1 : 0)
}

if (require.main === module) {
  main()
}

module.exports = { findDuplicates, checkFolderDiscipline }