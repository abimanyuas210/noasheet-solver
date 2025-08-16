import { screenshotService } from './server/services/optimized-screenshot.ts';
import fs from 'fs/promises';
import path from 'path';

const TEST_URL = 'https://www.google.com';
const OUTPUT_PATH = './test-screenshots/google-mobile.png';

async function runTest() {
  console.log('🧪 Testing Optimized Screenshot Service...\n');
  
  try {
    console.log(`📸 Taking screenshot of: ${TEST_URL}`);
    console.log(`💾 Output path: ${OUTPUT_PATH}`);
    
    // Get initial status
    const initialStatus = await screenshotService.getStatus();
    console.log('📊 Initial status:', initialStatus);
    
    const startTime = Date.now();
    
    // Take screenshot
    const success = await screenshotService.takeScreenshot(TEST_URL, OUTPUT_PATH);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (success) {
      console.log(`✅ Screenshot completed successfully in ${duration}ms`);
      
      // Check if file exists and get its size
      try {
        const stats = await fs.stat(OUTPUT_PATH);
        console.log(`📄 File size: ${stats.size} bytes`);
        console.log(`📅 Created: ${stats.birthtime.toLocaleString()}`);
        
        // Check if it's a valid PNG file by reading first few bytes
        const buffer = await fs.readFile(OUTPUT_PATH);
        const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
        
        if (isPNG) {
          console.log('✅ File is a valid PNG image');
        } else {
          console.log('⚠️ File may not be a valid PNG image');
        }
        
        // Test multiple concurrent requests
        console.log('\n🚀 Testing concurrent requests...');
        const concurrentTests = [
          screenshotService.takeScreenshot('https://www.google.com', './test-screenshots/concurrent-1.png'),
          screenshotService.takeScreenshot('https://www.github.com', './test-screenshots/concurrent-2.png'),
          screenshotService.takeScreenshot('https://www.stackoverflow.com', './test-screenshots/concurrent-3.png')
        ];
        
        const concurrentStart = Date.now();
        const results = await Promise.allSettled(concurrentTests);
        const concurrentEnd = Date.now();
        const concurrentDuration = concurrentEnd - concurrentStart;
        
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        console.log(`📊 Concurrent test: ${successCount}/3 successful in ${concurrentDuration}ms`);
        
        // Get final status
        const finalStatus = await screenshotService.getStatus();
        console.log('📊 Final status:', finalStatus);
        
      } catch (error) {
        console.error('❌ Error checking file:', error);
        return false;
      }
      
    } else {
      console.log('❌ Screenshot failed');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await screenshotService.cleanup();
  }
  
  console.log('\n🎉 All tests passed!');
  return true;
}

// Performance test
async function performanceTest() {
  console.log('\n⚡ Running performance test...');
  
  const urls = [
    'https://www.google.com',
    'https://www.github.com',
    'https://www.stackoverflow.com',
    'https://www.wikipedia.org',
    'https://www.reddit.com'
  ];
  
  const startTime = Date.now();
  
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const outputPath = `./test-screenshots/perf-test-${i + 1}.png`;
    
    try {
      const success = await screenshotService.takeScreenshot(url, outputPath);
      if (success) {
        console.log(`✅ ${i + 1}/${urls.length} completed: ${url}`);
      } else {
        console.log(`❌ ${i + 1}/${urls.length} failed: ${url}`);
      }
    } catch (error) {
      console.log(`❌ ${i + 1}/${urls.length} error: ${url}`, error.message);
    }
  }
  
  const endTime = Date.now();
  const totalDuration = endTime - startTime;
  const avgDuration = totalDuration / urls.length;
  
  console.log(`📊 Performance test completed:`);
  console.log(`   Total time: ${totalDuration}ms`);
  console.log(`   Average per screenshot: ${avgDuration.toFixed(0)}ms`);
}

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      const basicTestPassed = await runTest();
      
      if (basicTestPassed) {
        await performanceTest();
      }
      
      process.exit(0);
    } catch (error) {
      console.error('Fatal test error:', error);
      process.exit(1);
    }
  })();
}

export { runTest, performanceTest };