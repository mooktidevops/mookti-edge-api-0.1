#!/usr/bin/env node

import fs from 'fs/promises';

async function updateReport() {
  // Read GPT-5 results
  const gpt5Data = JSON.parse(await fs.readFile('gpt5-test-results.json', 'utf8'));
  
  // Read current report
  let report = await fs.readFile('student-oriented-v2-comprehensive-report.md', 'utf8');
  
  // Process each question
  for (let i = 0; i < gpt5Data.results.length; i++) {
    const result = gpt5Data.results[i];
    const qNum = i + 1;
    
    // Determine icons
    const intentIcon = result.intentScore === 1 ? '✅' : result.intentScore === 0.5 ? '⚡' : '❌';
    const depthIcon = result.depthScore === 1 ? '✅' : '❌';
    const overallIcon = result.overallScore === 1 ? '✅' : result.overallScore === 0.5 ? '⚡' : '❌';
    
    // Format intent text
    let intentText = result.result.primaryIntent;
    if (result.intentScore === 0.5) {
      // Find which secondary intent matched
      const secondary = result.result.secondaryIntents.find(s => s === result.expected.intent);
      if (secondary) {
        intentText = `${result.result.primaryIntent} (secondary: ${secondary})`;
      }
    }
    
    // Create the GPT-5 row
    const gpt5Row = `| GPT-5 | ${intentIcon} ${intentText} | ${depthIcon} ${result.result.depth} | ${overallIcon} |`;
    
    // Find the question section
    const qPattern = new RegExp(`### Q${qNum}:.*?\\n.*?\\n.*?\\n\\| Model.*?\\n\\|.*?\\n((?:\\|.*?\\n)*?)(?=\\n### Q|\\n## |$)`, 's');
    
    report = report.replace(qPattern, (match) => {
      // Check if GPT-5 row already exists
      if (match.includes('| GPT-5 |') && !match.includes('| GPT-5 | 🚫')) {
        return match; // Already updated
      }
      
      // Find where to insert GPT-5 row (after GPT-5-mini, before Claude)
      const lines = match.split('\n');
      let insertIndex = -1;
      
      for (let j = 0; j < lines.length; j++) {
        if (lines[j].includes('| GPT-5-mini |')) {
          insertIndex = j + 1;
          break;
        }
      }
      
      if (insertIndex === -1) {
        // If GPT-5-mini not found, insert before Claude 3.5 Haiku
        for (let j = 0; j < lines.length; j++) {
          if (lines[j].includes('| Claude 3.5 Haiku |')) {
            insertIndex = j;
            break;
          }
        }
      }
      
      // Remove any existing GPT-5 error row
      lines.forEach((line, idx) => {
        if (line.includes('| GPT-5 | 🚫')) {
          lines.splice(idx, 1);
        }
      });
      
      if (insertIndex > -1) {
        lines.splice(insertIndex, 0, gpt5Row);
      }
      
      return lines.join('\n');
    });
  }
  
  // Handle Q26 which had a timeout
  const q26Pattern = /### Q26:.*?\n.*?\n.*?\n\| Model.*?\n\|.*?\n((?:\|.*?\n)*?)(?=\n### Q|$)/s;
  report = report.replace(q26Pattern, (match) => {
    if (!match.includes('| GPT-5 |') || match.includes('| GPT-5 | 🚫')) {
      const gpt5Row = '| GPT-5 | 🚫 TIMEOUT | 🚫 TIMEOUT | 🚫 |';
      const lines = match.split('\n');
      let insertIndex = -1;
      
      for (let j = 0; j < lines.length; j++) {
        if (lines[j].includes('| GPT-5-mini |')) {
          insertIndex = j + 1;
          break;
        }
      }
      
      // Remove any existing GPT-5 row
      lines.forEach((line, idx) => {
        if (line.includes('| GPT-5 |')) {
          lines.splice(idx, 1);
        }
      });
      
      if (insertIndex > -1) {
        lines.splice(insertIndex, 0, gpt5Row);
      }
      
      return lines.join('\n');
    }
    return match;
  });
  
  // Save updated report
  await fs.writeFile('student-oriented-v2-comprehensive-report.md', report);
  
  console.log('Report updated successfully with all GPT-5 results!');
  console.log(`Updated ${gpt5Data.results.length} questions with GPT-5 data.`);
}

updateReport().catch(console.error);