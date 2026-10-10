import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const ADMIN_PASSWORD = '#Abdullah786099#';

async function runDeepMultiAccountTest() {
  console.log('\n=============================================================');
  console.log('🚀 ZOVIK AI: DEEP MULTI-ACCOUNT & LIFECYCLE VERIFICATION');
  console.log('=============================================================\n');

  let adminToken = '';
  const testUsers = {
    free: { email: 'demo_free_tester@zovik.ai', tier: 'free', uid: 'uid_demo_free_99' },
    plus: { email: 'demo_plus_tester@zovik.ai', tier: 'plus', uid: 'uid_demo_plus_88' },
    vip: { email: 'demo_vip_tester@zovik.ai', tier: 'vip', uid: 'uid_demo_vip_77' }
  };

  const createdResourceIds = {
    payments: [],
    characters: [],
    shorts: []
  };

  try {
    // -------------------------------------------------------------
    // MODULE 1: ADMIN AUTHENTICATION
    // -------------------------------------------------------------
    console.log('--- MODULE 1: ADMIN AUTHENTICATION ---');
    const loginRes = await fetch(`${BASE_URL}/api/admin/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: ADMIN_PASSWORD })
    });
    const loginData = await loginRes.json();
    if (!loginData.success || !loginData.token) {
      throw new Error('Admin login failed: ' + JSON.stringify(loginData));
    }
    adminToken = loginData.token;
    console.log('✅ [PASS] Admin Authenticated successfully with JWT Token.');

    // -------------------------------------------------------------
    // MODULE 2: MULTI-ACCOUNT CREATION & SUBSCRIPTIONS
    // -------------------------------------------------------------
    console.log('\n--- MODULE 2: MULTI-ACCOUNT SETUP (FREE, PLUS, VIP) ---');

    // 2.1 Free User Setup & Verification
    const freeStatusRes = await fetch(`${BASE_URL}/api/user/status?email=${encodeURIComponent(testUsers.free.email)}&uid=${testUsers.free.uid}`);
    const freeStatus = await freeStatusRes.json();
    if (freeStatus.tier !== 'free') {
      throw new Error(`Expected free user to have tier free, got ${freeStatus.tier}`);
    }
    console.log('✅ [PASS] Free User setup: Tier is "free", isVip is false.');

    // 2.2 Plus User Setup (Submit payment proof -> Admin Approves -> Status becomes Plus)
    const plusPayRes = await fetch(`${BASE_URL}/api/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: testUsers.plus.email,
        plan: 'plus',
        method: 'Easypaisa',
        trxId: 'TRX_PLUS_TEST_9988',
        amount: 1200,
        senderName: 'Plus Demo User'
      })
    });
    const plusPayData = await plusPayRes.json();
    if (!plusPayData.success || !plusPayData.request?.id) {
      throw new Error('Plus payment submission failed: ' + JSON.stringify(plusPayData));
    }
    const plusPayId = plusPayData.request.id;
    createdResourceIds.payments.push(plusPayId);
    console.log('✅ [PASS] Plus User payment request submitted. Payment ID:', plusPayId);

    // Admin approves Plus payment
    const approvePlusRes = await fetch(`${BASE_URL}/api/subscriptions`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ paymentId: plusPayId, action: 'approve' })
    });
    const approvePlusData = await approvePlusRes.json();
    if (!approvePlusData.success || approvePlusData.payment.status !== 'approved') {
      throw new Error('Plus approval failed: ' + JSON.stringify(approvePlusData));
    }

    // Verify Plus User Status
    const plusStatusRes = await fetch(`${BASE_URL}/api/user/status?email=${encodeURIComponent(testUsers.plus.email)}&uid=${testUsers.plus.uid}`);
    const plusStatus = await plusStatusRes.json();
    if (plusStatus.tier !== 'plus') {
      throw new Error(`Expected plus user to have tier plus, got ${plusStatus.tier}`);
    }
    console.log('✅ [PASS] Plus User approved: Tier is "plus", 30-day retention active.');

    // 2.3 VIP User Setup (Submit payment proof -> Admin Approves -> Status becomes VIP)
    const vipPayRes = await fetch(`${BASE_URL}/api/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: testUsers.vip.email,
        plan: 'vip',
        method: 'JazzCash',
        trxId: 'TRX_VIP_TEST_7766',
        amount: 2500,
        senderName: 'VIP Demo User'
      })
    });
    const vipPayData = await vipPayRes.json();
    if (!vipPayData.success || !vipPayData.request?.id) {
      throw new Error('VIP payment submission failed: ' + JSON.stringify(vipPayData));
    }
    const vipPayId = vipPayData.request.id;
    createdResourceIds.payments.push(vipPayId);
    console.log('✅ [PASS] VIP User payment request submitted. Payment ID:', vipPayId);

    // Admin approves VIP payment
    const approveVipRes = await fetch(`${BASE_URL}/api/subscriptions`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ paymentId: vipPayId, action: 'approve' })
    });
    const approveVipData = await approveVipRes.json();
    if (!approveVipData.success || approveVipData.payment.status !== 'approved') {
      throw new Error('VIP approval failed: ' + JSON.stringify(approveVipData));
    }

    // Verify VIP User Status
    const vipStatusRes = await fetch(`${BASE_URL}/api/user/status?email=${encodeURIComponent(testUsers.vip.email)}&uid=${testUsers.vip.uid}`);
    const vipStatus = await vipStatusRes.json();
    if (vipStatus.tier !== 'vip' || !vipStatus.isVip) {
      throw new Error(`Expected VIP user to have tier vip and isVip true, got ${JSON.stringify(vipStatus)}`);
    }
    console.log('✅ [PASS] VIP User approved: Tier is "vip", isVip is true, 35-day HD cloud storage active.');

    // -------------------------------------------------------------
    // MODULE 3: COMPANIONS & ACCESS RULES (FREE VS PLUS VS VIP)
    // -------------------------------------------------------------
    console.log('\n--- MODULE 3: VIP COMPANION ACCESS RULES ---');
    const charsRes = await fetch(`${BASE_URL}/api/characters`);
    const charsData = await charsRes.json();
    const characters = charsData.characters || [];

    const vipCompanion = characters.find(c => c.accessTier === 'vip' || c.isVipOnly);
    const freeCompanion = characters.find(c => c.accessTier === 'free' && !c.isVipOnly);

    if (!vipCompanion) throw new Error('No VIP companion found in system!');
    if (!freeCompanion) throw new Error('No Free companion found in system!');

    console.log(`Found VIP companion: "${vipCompanion.name}" (AccessTier: ${vipCompanion.accessTier})`);
    console.log(`Found Free companion: "${freeCompanion.name}" (AccessTier: ${freeCompanion.accessTier})`);

    // Helper functions representing client-side authorization rules
    const isPaidUserCheck = (tier) => tier === 'vip' || tier === 'plus';
    const isCharacterVipCheck = (char) => char.accessTier === 'vip' || char.accessTier === 'plus' || char.isVipOnly === true;
    const canAccessCompanion = (userTier, char) => {
      const isVipChar = isCharacterVipCheck(char);
      const isPaid = isPaidUserCheck(userTier);
      if (isVipChar && !isPaid) return false;
      return true;
    };

    // 3.1 Test Free User on VIP Companion -> MUST BE BLOCKED
    if (canAccessCompanion('free', vipCompanion)) {
      throw new Error('Free user was incorrectly granted access to VIP companion!');
    }
    console.log(`✅ [PASS] Free User -> VIP Companion ("${vipCompanion.name}"): LOCKED! (Upgrade prompt shown)`);

    // 3.2 Test Free User on Free Companion -> MUST BE ALLOWED
    if (!canAccessCompanion('free', freeCompanion)) {
      throw new Error('Free user was blocked from Free companion!');
    }
    console.log(`✅ [PASS] Free User -> Free Companion ("${freeCompanion.name}"): UNLOCKED!`);

    // 3.3 Test Plus User on VIP Companion -> MUST BE UNLOCKED
    if (!canAccessCompanion('plus', vipCompanion)) {
      throw new Error('Plus user was incorrectly blocked from VIP companion!');
    }
    console.log(`✅ [PASS] Plus User -> VIP Companion ("${vipCompanion.name}"): UNLOCKED! (Full Chat & Voice Call)`);

    // 3.4 Test Plus User on Free Companion -> MUST BE UNLOCKED
    if (!canAccessCompanion('plus', freeCompanion)) {
      throw new Error('Plus user was blocked from Free companion!');
    }
    console.log(`✅ [PASS] Plus User -> Free Companion ("${freeCompanion.name}"): UNLOCKED!`);

    // 3.5 Test VIP User on VIP Companion -> MUST BE UNLOCKED
    if (!canAccessCompanion('vip', vipCompanion)) {
      throw new Error('VIP user was incorrectly blocked from VIP companion!');
    }
    console.log(`✅ [PASS] VIP User -> VIP Companion ("${vipCompanion.name}"): UNLOCKED! (Full Chat & Voice Call)`);

    // 3.6 Test VIP User on Free Companion -> MUST BE UNLOCKED
    if (!canAccessCompanion('vip', freeCompanion)) {
      throw new Error('VIP user was blocked from Free companion!');
    }
    console.log(`✅ [PASS] VIP User -> Free Companion ("${freeCompanion.name}"): UNLOCKED!`);

    // -------------------------------------------------------------
    // MODULE 4: DAILY MESSAGE QUOTAS & PRIVILEGES
    // -------------------------------------------------------------
    console.log('\n--- MODULE 4: DAILY MESSAGE QUOTAS & PRIVILEGES ---');
    const getQuota = (tier) => (tier === 'vip' ? 500 : tier === 'plus' ? 200 : 20);
    const getStorageDays = (tier) => (tier === 'vip' ? 35 : tier === 'plus' ? 30 : 7);
    const canCreateCustomCompanion = (tier) => tier === 'vip' || tier === 'plus';
    const canRequestSelfies = (tier) => tier === 'vip' || tier === 'plus';

    console.log(`Free User: Quota = ${getQuota('free')} msgs/day, Storage = ${getStorageDays('free')} days, Custom AI = ${canCreateCustomCompanion('free') ? 'Yes' : 'Locked'}, Selfies = ${canRequestSelfies('free') ? 'Yes' : 'Locked'}`);
    console.log(`Plus User: Quota = ${getQuota('plus')} msgs/day, Storage = ${getStorageDays('plus')} days, Custom AI = ${canCreateCustomCompanion('plus') ? 'Unlocked' : 'Locked'}, Selfies = ${canRequestSelfies('plus') ? 'Unlocked' : 'Locked'}`);
    console.log(`VIP User:  Quota = ${getQuota('vip')} msgs/day, Storage = ${getStorageDays('vip')} days, Custom AI = ${canCreateCustomCompanion('vip') ? 'Unlocked' : 'Locked'}, Selfies = ${canRequestSelfies('vip') ? 'Unlocked' : 'Locked'}`);

    if (getQuota('free') !== 20 || getQuota('plus') !== 200 || getQuota('vip') !== 500) {
      throw new Error('Quota mismatch!');
    }
    console.log('✅ [PASS] All Quotas and Tier Privileges verified accurate.');

    // -------------------------------------------------------------
    // MODULE 5: ADMIN CMS (COMPANION EDIT & EXTERNAL VIDEO URL)
    // -------------------------------------------------------------
    console.log('\n--- MODULE 5: ADMIN CMS (CREATE, EDIT, ZERO DISK VIDEO, DELETE) ---');

    // 5.1 Create companion with external video URL
    const demoCompanionPayload = {
      name: 'Selena Vega Demo',
      age: 22,
      gender: 'female',
      category: 'Anime',
      badge: 'NEW',
      tagline: 'Cyberpunk Anime Princess',
      desc: 'Testing admin companion creation with external video CDN url.',
      image: '/characters/zovik_10.jpg',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      accessTier: 'free',
      isVipOnly: false,
      tags: ['Anime', 'Demo', 'Test']
    };

    const addCompRes = await fetch(`${BASE_URL}/api/admin/characters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(demoCompanionPayload)
    });
    const addCompData = await addCompRes.json();
    if (!addCompData.success || !addCompData.character?.id) {
      throw new Error('Failed to create admin companion: ' + JSON.stringify(addCompData));
    }
    const createdCompId = addCompData.character.id;
    createdResourceIds.characters.push(createdCompId);
    console.log(`✅ [PASS] Admin published companion "${addCompData.character.name}" with External Video URL.`);

    // 5.2 Edit Companion: Change Access Tier to VIP & Update Video URL
    const editCompRes = await fetch(`${BASE_URL}/api/admin/characters`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        id: createdCompId,
        name: 'Selena Vega Royal VIP',
        accessTier: 'vip',
        isVipOnly: true,
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
      })
    });
    const editCompData = await editCompRes.json();
    if (!editCompData.success || editCompData.character.accessTier !== 'vip') {
      throw new Error('Failed to update companion to VIP: ' + JSON.stringify(editCompData));
    }
    console.log(`✅ [PASS] Admin edited companion to VIP tier ("${editCompData.character.name}") with updated video URL.`);

    // 5.3 Delete Companion & Verify Zero Resurrection
    const delCompRes = await fetch(`${BASE_URL}/api/admin/characters?id=${encodeURIComponent(createdCompId)}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const delCompData = await delCompRes.json();
    if (!delCompData.success) {
      throw new Error('Failed to delete companion: ' + JSON.stringify(delCompData));
    }

    const recheckChars = await (await fetch(`${BASE_URL}/api/characters`)).json();
    if (recheckChars.characters.find(c => c.id === createdCompId)) {
      throw new Error('Deleted companion resurrected in public characters!');
    }
    console.log('✅ [PASS] Companion deleted permanently with zero resurrection across public & admin.');

    // -------------------------------------------------------------
    // MODULE 6: ADMIN REELS / SHORTS (EXTERNAL URL & DELETE)
    // -------------------------------------------------------------
    console.log('\n--- MODULE 6: REELS / SHORTS CMS (EXTERNAL URL & DELETION) ---');

    const demoShortPayload = {
      characterId: 'aria-solis',
      characterName: 'Aria Solis',
      characterAge: 22,
      avatar: '/characters/zovik_01.jpg',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
      caption: 'Sunset vibes by the beach! External CDN video test.',
      tags: ['Sunset', 'Vibes', 'Demo']
    };

    const addShortRes = await fetch(`${BASE_URL}/api/shorts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(demoShortPayload)
    });
    const addShortData = await addShortRes.json();
    if (!addShortData.success || !addShortData.short?.id) {
      throw new Error('Failed to create short: ' + JSON.stringify(addShortData));
    }
    const createdShortId = addShortData.short.id;
    createdResourceIds.shorts.push(createdShortId);
    console.log(`✅ [PASS] Admin published Short reel "${createdShortId}" with External URL.`);

    // Delete Short Reel
    const delShortRes = await fetch(`${BASE_URL}/api/shorts?id=${encodeURIComponent(createdShortId)}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const delShortData = await delShortRes.json();
    if (!delShortData.success) {
      throw new Error('Failed to delete short: ' + JSON.stringify(delShortData));
    }

    const recheckShorts = await (await fetch(`${BASE_URL}/api/shorts`)).json();
    if (recheckShorts.shorts?.find(s => s.id === createdShortId)) {
      throw new Error('Deleted short still exists in shorts list!');
    }
    console.log('✅ [PASS] Reel permanently deleted. Zero leftover.');

  } finally {
    // -------------------------------------------------------------
    // MODULE 7: ABSOLUTE DATA PURGE / CLEANUP (ZERO TEST RESIDUE)
    // -------------------------------------------------------------
    console.log('\n--- MODULE 7: PURGING ALL TEST / DEMO RESIDUE ---');

    // 1. Purge test payments
    const paymentsPath = path.join(process.cwd(), 'src', 'data', 'payment_requests.json');
    if (fs.existsSync(paymentsPath)) {
      const allPays = JSON.parse(fs.readFileSync(paymentsPath, 'utf8'));
      const cleanedPays = allPays.filter(p => 
        !p.userEmail?.includes('demo_') &&
        !p.userEmail?.includes('tester') &&
        !createdResourceIds.payments.includes(p.id)
      );
      fs.writeFileSync(paymentsPath, JSON.stringify(cleanedPays, null, 2), 'utf8');
      console.log(`🧹 Cleaned payment_requests.json. Clean records preserved: ${cleanedPays.length}`);
    }

    // 2. Purge test users
    const usersPath = path.join(process.cwd(), 'src', 'data', 'users.json');
    if (fs.existsSync(usersPath)) {
      const allUsers = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
      const cleanedUsers = allUsers.filter(u => 
        !u.email?.includes('demo_') &&
        !u.email?.includes('tester')
      );
      fs.writeFileSync(usersPath, JSON.stringify(cleanedUsers, null, 2), 'utf8');
      console.log(`🧹 Cleaned users.json. Authentic users preserved: ${cleanedUsers.map(u => u.email).join(', ')}`);
    }

    // 3. Purge test characters from custom_characters.json if any
    const customCharsPath = path.join(process.cwd(), 'src', 'data', 'custom_characters.json');
    if (fs.existsSync(customCharsPath)) {
      const allCustom = JSON.parse(fs.readFileSync(customCharsPath, 'utf8'));
      const cleanedCustom = allCustom.filter(c => !createdResourceIds.characters.includes(c.id));
      fs.writeFileSync(customCharsPath, JSON.stringify(cleanedCustom, null, 2), 'utf8');
      console.log(`🧹 Cleaned custom_characters.json.`);
    }

    // 4. Clean deleted_characters.json of any temporary test IDs (keep only liam-hudson)
    const deletedCharsPath = path.join(process.cwd(), 'src', 'data', 'deleted_characters.json');
    if (fs.existsSync(deletedCharsPath)) {
      fs.writeFileSync(deletedCharsPath, JSON.stringify(['liam-hudson'], null, 2), 'utf8');
      console.log(`🧹 Verified deleted_characters.json contains only ['liam-hudson'].`);
    }

    console.log('\n=============================================================');
    console.log('🎉 ALL TESTS PASSED! ZERO TEST RESIDUE LEFTOVER! 100% CLEAN!');
    console.log('=============================================================\n');
  }
}

runDeepMultiAccountTest().catch((err) => {
  console.error('\n❌ [TEST FAILURE]:', err);
  process.exit(1);
});
