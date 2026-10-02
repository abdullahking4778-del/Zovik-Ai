async function runE2E() {
  console.log('=== STARTING ZOVIK AI E2E COMPANION & VIP VERIFICATION ===');
  
  // 1. Authenticate Admin
  const loginRes = await fetch('http://localhost:3000/api/admin/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: '#Abdullah786099#' })
  });
  const { token } = await loginRes.json();
  console.log('[PASS] Admin Authenticated with token');

  // 2. Verify Liam Hudson is completely gone
  const publicRes = await fetch('http://localhost:3000/api/characters');
  const publicData = await publicRes.json();
  const liam = publicData.characters.find(c => c.id === 'liam-hudson' || (c.name && c.name.toLowerCase().includes('liam')));
  if (liam) throw new Error('Liam Hudson found in public characters!');
  console.log('[PASS] Liam Hudson permanently absent from public app');

  const adminCharsRes = await fetch('http://localhost:3000/api/admin/characters', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const adminCharsData = await adminCharsRes.json();
  const adminLiam = adminCharsData.characters.find(c => c.id === 'liam-hudson' || (c.name && c.name.toLowerCase().includes('liam')));
  if (adminLiam) throw new Error('Liam Hudson found in admin characters!');
  console.log('[PASS] Liam Hudson permanently absent from Admin Center');

  // 3. Test Creating a VIP Companion with External Video URL
  const testCompanion = {
    name: 'Zara Nexus Test',
    age: 23,
    gender: 'female',
    category: 'Trending',
    badge: 'VIP',
    tagline: 'Futuristic AI Model',
    desc: 'An alluring cyberpunk model testing VIP lock and intro video streaming.',
    image: '/characters/zovik_01.jpg',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    accessTier: 'vip',
    isVipOnly: true,
    tags: ['Cyber', 'VIP', 'Hot', 'Future']
  };

  const createRes = await fetch('http://localhost:3000/api/admin/characters', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify(testCompanion)
  });
  const createData = await createRes.json();
  if (!createData.success || !createData.character) {
    throw new Error('Failed to create companion: ' + JSON.stringify(createData));
  }
  console.log('[PASS] Companion created:', createData.character.name, 'ID:', createData.character.id, 'AccessTier:', createData.character.accessTier);
  const createdId = createData.character.id;

  // 4. Verify new companion is visible in public /api/characters
  const verifyRes = await fetch('http://localhost:3000/api/characters');
  const verifyData = await verifyRes.json();
  const foundInPublic = verifyData.characters.find(c => c.id === createdId);
  if (!foundInPublic || foundInPublic.accessTier !== 'vip') {
    throw new Error('Created companion not visible or missing VIP accessTier in public!');
  }
  console.log('[PASS] New companion is LIVE on /app with VIP lock & videoUrl:', foundInPublic.videoUrl);

  // 5. Test Editing Companion (e.g. Change Tier to Free, Update Video URL)
  const editRes = await fetch('http://localhost:3000/api/admin/characters', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      id: createdId,
      name: 'Zara Nexus Ultra',
      accessTier: 'free',
      isVipOnly: false,
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
    })
  });
  const editData = await editRes.json();
  if (!editData.success || !editData.character) {
    throw new Error('Failed to edit companion: ' + JSON.stringify(editData));
  }
  console.log('[PASS] Companion edited:', editData.character.name, 'New Tier:', editData.character.accessTier, 'New Video:', editData.character.videoUrl);

  // Verify edit in public API
  const verifyEditRes = await fetch('http://localhost:3000/api/characters');
  const verifyEditData = await verifyEditRes.json();
  const foundEdited = verifyEditData.characters.find(c => c.id === createdId);
  if (!foundEdited || foundEdited.name !== 'Zara Nexus Ultra' || foundEdited.accessTier !== 'free') {
    throw new Error('Edited companion changes not reflected!');
  }
  console.log('[PASS] Edited companion instantly live in public app');

  // 6. Test Permanent Deletion
  const deleteRes = await fetch('http://localhost:3000/api/admin/characters?id=' + encodeURIComponent(createdId), {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const deleteData = await deleteRes.json();
  console.log('[PASS] Companion deleted:', deleteData.success);

  // Verify it is gone from both public and admin
  const postDeletePublic = await (await fetch('http://localhost:3000/api/characters')).json();
  if (postDeletePublic.characters.find(c => c.id === createdId)) {
    throw new Error('Deleted companion still in public!');
  }
  const postDeleteAdmin = await (await fetch('http://localhost:3000/api/admin/characters', {
    headers: { 'Authorization': 'Bearer ' + token }
  })).json();
  if (postDeleteAdmin.characters.find(c => c.id === createdId)) {
    throw new Error('Deleted companion still in admin!');
  }
  console.log('[PASS] Deleted companion permanently erased from both /app and /admin (Zero resurrection)!');

  console.log('=== ALL E2E VERIFICATIONS PASSED 100% SUCCESSFULLY! ===');
}

runE2E().catch(err => {
  console.error('[FAIL]', err);
  process.exit(1);
});
