import { screenshotService } from '../services/screenshot';
import { storage } from '../storage';
import fs from 'fs/promises';
import path from 'path';

// Test configuration
const TEST_URL = 'https://www.liveworksheets.com/worksheets/en/English_as_a_Second_Language_(ESL)/Simple_present/Simple_present_tense_positive_negative_question_forms_az1509vq';
const TEST_TIMEOUT = 120000; // 2 minutes

async function runTests() {
  console.log('🚀 Starting screenshot service tests...');
  
  try {
    // Test 1: Check if browser can initialize
    console.log('\n📋 Test 1: Browser initialization');
    const browser = await screenshotService.initBrowser();
    if (browser) {
      console.log('✅ Browser initialized successfully');
    } else {
      throw new Error('❌ Failed to initialize browser');
    }

    // Test 2: Check queue status
    console.log('\n📋 Test 2: Queue status');
    const queueStatus = await screenshotService.getQueueStatus();
    console.log('✅ Queue status:', queueStatus);

    // Test 3: Test screenshot creation and processing
    console.log('\n📋 Test 3: Screenshot creation and processing');
    const testUserId = 'test-user-' + Date.now();
    
    // Create a screenshot request
    const screenshot = await storage.createScreenshot({
      url: TEST_URL,
      userId: testUserId
    });
    console.log('✅ Screenshot request created:', screenshot.id);

    // Add to queue
    await screenshotService.addToQueue(screenshot.id);
    console.log('✅ Screenshot added to processing queue');

    // Wait for processing to complete
    console.log('⏳ Waiting for screenshot processing...');
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max
    
    while (attempts < maxAttempts) {
      const updatedScreenshot = await storage.getScreenshot(screenshot.id);
      
      if (updatedScreenshot?.status === 'completed') {
        console.log('✅ Screenshot completed successfully!');
        
        // Check if files exist
        const screenshotsDir = path.join(process.cwd(), 'screenshots');
        const imagePath = path.join(screenshotsDir, `${screenshot.id}.png`);
        const thumbnailPath = path.join(screenshotsDir, `${screenshot.id}_thumb.png`);
        
        try {
          const imageStats = await fs.stat(imagePath);
          const thumbnailStats = await fs.stat(thumbnailPath);
          
          console.log(`✅ Screenshot file created: ${imagePath} (${imageStats.size} bytes)`);
          console.log(`✅ Thumbnail file created: ${thumbnailPath} (${thumbnailStats.size} bytes)`);
          
          // Verify file sizes are reasonable
          if (imageStats.size > 10000) { // At least 10KB
            console.log('✅ Screenshot file size looks good');
          } else {
            console.log('⚠️ Screenshot file seems too small');
          }
          
          if (thumbnailStats.size > 1000) { // At least 1KB
            console.log('✅ Thumbnail file size looks good');
          } else {
            console.log('⚠️ Thumbnail file seems too small');
          }
          
        } catch (fileError) {
          console.log('❌ Screenshot files not found:', fileError);
        }
        break;
        
      } else if (updatedScreenshot?.status === 'failed') {
        console.log('❌ Screenshot failed:', updatedScreenshot.errorMessage);
        break;
        
      } else {
        console.log(`⏳ Still processing... (${updatedScreenshot?.status || 'pending'})`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        attempts++;
      }
    }
    
    if (attempts >= maxAttempts) {
      console.log('❌ Screenshot processing timed out');
    }

    // Test 4: Test multiple concurrent screenshots (stress test)
    console.log('\n📋 Test 4: Multiple concurrent screenshots');
    const concurrentTests: Promise<string>[] = [];
    const concurrentCount = 3;
    
    for (let i = 0; i < concurrentCount; i++) {
      const testPromise = (async () => {
        const concurrentScreenshot = await storage.createScreenshot({
          url: TEST_URL,
          userId: `concurrent-user-${i}-${Date.now()}`
        });
        await screenshotService.addToQueue(concurrentScreenshot.id);
        return concurrentScreenshot.id;
      })();
      concurrentTests.push(testPromise);
    }
    
    const concurrentIds = await Promise.all(concurrentTests);
    console.log(`✅ Created ${concurrentCount} concurrent screenshot requests`);
    
    // Check queue status with concurrent requests
    const busyQueueStatus = await screenshotService.getQueueStatus();
    console.log('✅ Busy queue status:', busyQueueStatus);

    // Test 5: Test statistics
    console.log('\n📋 Test 5: Statistics');
    const stats = await storage.getStats();
    console.log('✅ Current statistics:', stats);

    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await screenshotService.cleanup();
    console.log('✅ Cleanup completed');
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests };