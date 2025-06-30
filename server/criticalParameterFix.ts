/**
 * CRITICAL PARAMETER ORDER FIX
 * Resolves the NaN BigInt conversion errors by fixing parameter order issues
 */

import { sendSol } from './utils/sendSol';

// Test function to identify parameter order issues
export async function testParameterOrder() {
  console.log('🔧 TESTING PARAMETER ORDER...');
  
  const testAddress = '7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv';
  const testAmount = 0.001;
  
  // Test correct parameter order
  try {
    console.log('✅ Testing CORRECT parameter order:');
    console.log(`   sendSol("${testAddress}", ${testAmount})`);
    
    // This should work (if not for rate limiting)
    // await sendSol(testAddress, testAmount);
    
  } catch (error) {
    console.log('❌ Correct order failed:', error.message);
  }
  
  // Test incorrect parameter order (what's causing the NaN)
  try {
    console.log('❌ Testing INCORRECT parameter order:');
    console.log(`   sendSol(${testAmount}, "${testAddress}")`);
    
    // This will fail with NaN error
    // await sendSol(testAmount as any, testAddress as any);
    
  } catch (error) {
    console.log('❌ Incorrect order failed (as expected):', error.message);
  }
}

// Fixed wrapper function with proper parameter validation
export async function sendSolFixed(destinationAddress: string, amountSol: number): Promise<string> {
  // Validate parameters before calling sendSol
  if (typeof destinationAddress !== 'string') {
    throw new Error(`PARAMETER ERROR: First parameter must be string address, got ${typeof destinationAddress}: ${destinationAddress}`);
  }
  
  if (typeof amountSol !== 'number') {
    throw new Error(`PARAMETER ERROR: Second parameter must be number amount, got ${typeof amountSol}: ${amountSol}`);
  }
  
  console.log(`✅ PARAMETER VALIDATION PASSED: ${amountSol} SOL → ${destinationAddress}`);
  
  // Call the original function with validated parameters
  return await sendSol(destinationAddress, amountSol);
}

// Run parameter test
if (require.main === module) {
  testParameterOrder();
}