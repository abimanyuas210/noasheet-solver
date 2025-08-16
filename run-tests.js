import { spawn } from 'child_process';
import path from 'path';

console.log('🧪 Running Screenshot Service Tests...\n');

const testFile = path.join(process.cwd(), 'server/tests/screenshot.test.ts');

const testProcess = spawn('tsx', [testFile], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'test' }
});

testProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ All tests passed!');
  } else {
    console.log(`\n❌ Tests failed with exit code ${code}`);
    process.exit(code);
  }
});

testProcess.on('error', (error) => {
  console.error('❌ Error running tests:', error);
  process.exit(1);
});