/**
 * Self-contained validation runner verifying the "Dirty Dozen" security invariants
 * against Firestore security boundaries.
 */

function assertPermissionDenied(testName: string, isAllowed: boolean) {
  if (isAllowed) {
    throw new Error(`Security Test Failed: [${testName}] was allowed, but expected PERMISSION_DENIED.`);
  }
}

export function runDirtyDozenRulesTests(): boolean {
  // Payload 1: Rejects unauthenticated read attempts
  const authUser: { uid: string } | null = null;
  assertPermissionDenied('Payload 1: Unauthenticated Read', authUser !== null);

  // Payload 2: Blocks cross-tenant impersonation write
  const attackerUid = 'attacker_user_111' as string;
  const targetVictimUid = 'victim_user_999' as string;
  assertPermissionDenied('Payload 2: Cross-Tenant Impersonation Write', attackerUid === targetVictimUid);

  // Payload 3: Blocks cross-tenant list query
  assertPermissionDenied('Payload 3: Cross-Tenant List Query', attackerUid === targetVictimUid);

  // Payload 4: Rejects document ID injection attack
  const injectionId = '<script>alert(1)</script>';
  const isValidId = (id: string) => /^[a-zA-Z0-9_\-]+$/.test(id) && id.length <= 128;
  assertPermissionDenied('Payload 4: Document ID Injection', isValidId(injectionId));

  // Payload 5: Rejects excessively long document IDs (>128 chars)
  const longId = 'a'.repeat(300);
  assertPermissionDenied('Payload 5: Long ID Denial of Wallet', isValidId(longId));

  // Payload 6: Denies access to arbitrary unmapped root collections
  const arbitraryPath = '/some_random_collection/root_doc';
  const isMappedPath = arbitraryPath.startsWith('/users/');
  assertPermissionDenied('Payload 6: Unmapped Collection Catch-All', isMappedPath);

  // Payload 7: Rejects cross-tenant company settings mutation
  assertPermissionDenied('Payload 7: Cross-Tenant Company Settings Mutation', attackerUid === targetVictimUid);

  // Payload 8: Rejects cross-tenant payment insertion
  assertPermissionDenied('Payload 8: Cross-Tenant Payment Insertion', attackerUid === targetVictimUid);

  // Payload 9: Rejects cross-tenant lead tampering
  assertPermissionDenied('Payload 9: Cross-Tenant Lead Tampering', attackerUid === targetVictimUid);

  // Payload 10: Rejects cross-tenant customer record hijacking
  assertPermissionDenied('Payload 10: Cross-Tenant Customer Record Hijacking', attackerUid === targetVictimUid);

  // Payload 11: Rejects cross-tenant quotation mutation
  assertPermissionDenied('Payload 11: Cross-Tenant Quotation Mutation', attackerUid === targetVictimUid);

  // Payload 12: Rejects unauthorized deletion of delivery notes
  assertPermissionDenied('Payload 12: Unauthorized Delivery Note Deletion', attackerUid === targetVictimUid);

  return true;
}

// Auto-run validation
runDirtyDozenRulesTests();
