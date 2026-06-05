const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const url    = require('url');

const PORT       = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'campmate-dev-secret';
const UNSPLASH_KEY = process.env.UNSPLASH_KEY || '';

const photoCache = {};

const REGION_PHOTO_KEYWORDS = {
  Kazbegi:   'Kazbegi Georgia mountains caucasus snow',
  Svaneti:   'Svaneti Georgia mountains medieval towers',
  Tusheti:   'Tusheti Georgia highland village caucasus',
  Borjomi:   'Borjomi Georgia pine forest national park',
  Racha:     'Racha Georgia alpine meadow valley',
  Kakheti:   'Kakheti Georgia vineyard landscape',
  Adjara:    'Adjara Georgia gorge waterfall forest',
  Imereti:   'Imereti Georgia canyon cave river',
  Samegrelo: 'Samegrelo Georgia canyon waterfall',
};
const TYPE_PHOTO_KEYWORDS = {
  camp: 'camping tent mountains nature',
  hike: 'hiking trail mountain path',
};

const DB = {
  users:    [],
  spots:    [],
  reviews:  [],
  posts:    [],
  comments: [],
  groups:   [],
  messages: [],
  favorites:[],
};
let _id = 1000;
const newId = () => String(++_id);

function seed() {
  DB.users.push({ id:'1', name:'Admin', email:'admin@campmate.ge', passwordHash: hashPw('admin123'), bio:'CampMate administrator.', region:'Tbilisi', level:'Expert', avatar:'', role:'admin', createdAt: now() });
  DB.users.push({ id:'2', name:'Nino Gelashvili', email:'nino@example.com', passwordHash: hashPw('pass123'), bio:'Avid hiker from Kutaisi. Love Svaneti trails!', region:'Imereti', level:'Intermediate', avatar:'', role:'user', createdAt: now() });
  DB.users.push({ id:'3', name:'Giorgi Beridze', email:'giorgi@example.com', passwordHash: hashPw('pass123'), bio:'Weekend camper. Kazbegi is my second home.', region:'Tbilisi', level:'Advanced', avatar:'', role:'user', createdAt: now() });
  DB.users.push({ id:'4', name:'Tamara Kvaratskhelia', email:'tamara@example.com', passwordHash: hashPw('pass123'), bio:'Trail runner and wild camper. Tusheti every summer.', region:'Kakheti', level:'Expert', avatar:'', role:'user', createdAt: now() });

  const spots = [
    { name:'Kazbegi Base Camp', type:'camp', region:'Kazbegi', lat:42.6630, lng:44.6360, difficulty:'Moderate', rating:4.8, ratingCount:124, facilities:['Water','Fire pits','Toilets','Parking'], desc:'The classic base camp beneath Mount Kazbek. Flat meadows, fresh glacial water, and jaw-dropping views of Gergeti Trinity Church.', safetyNotes:'Weather changes rapidly above 2000m. Check forecasts daily. Never approach the glacier without a guide.' },
    { name:'Juta Valley Campsite', type:'camp', region:'Kazbegi', lat:42.6210, lng:44.6790, difficulty:'Challenging', rating:4.9, ratingCount:87, facilities:['Water (stream)','Wild camping'], desc:'Remote high-alpine campsite in the Juta valley. Gateway to the Chaukhi massif rock pillars. Bring everything you need.', safetyNotes:'No phone signal. Inform someone of your plans. Purify all water.' },
    { name:'Ushguli Wild Camp', type:'camp', region:'Svaneti', lat:43.1180, lng:42.9260, difficulty:'Easy', rating:4.9, ratingCount:203, facilities:['Guesthouse option','Village shop','Wild camping'], desc:"Europe's highest permanently inhabited village. Camp on surrounding meadows with 360° views of the Greater Caucasus.", safetyNotes:'Only accessible via unpaved mountain road. 4x4 recommended. Road may close October–May.' },
    { name:'Mestia Campground', type:'camp', region:'Svaneti', lat:43.0530, lng:42.7200, difficulty:'Easy', rating:4.4, ratingCount:156, facilities:['Showers','Toilets','Wi-Fi','Café','Parking'], desc:'Organised campsite near central Mestia. Perfect base for Svaneti day hikes and the Mestia–Ushguli traverse.', safetyNotes:'Book ahead in July–August. Busy but well-managed.' },
    { name:'Borjomi Forest Camp', type:'camp', region:'Borjomi', lat:41.8390, lng:43.3810, difficulty:'Easy', rating:4.5, ratingCount:98, facilities:['Toilets','Fire pits','Ranger info','Parking'], desc:'Established campsite inside Borjomi-Kharagauli National Park. Pine forest, mineral springs 800m away.', safetyNotes:'Campfires in designated pits only. Store food securely — wildlife active at dawn and dusk.' },
    { name:'Tusheti Wild Camp – Omalo', type:'camp', region:'Tusheti', lat:42.3820, lng:45.3000, difficulty:'Expert', rating:5.0, ratingCount:44, facilities:['Wild camping','Guesthouse option'], desc:'Wild camping near ancient Omalo towers in the remote Tusheti highlands. Accessible only via the Abano Pass.', safetyNotes:'Abano Pass is unpaved, narrow and exposed. 4x4 only in dry conditions. No fuel available in Tusheti.' },
    { name:'Shovi Meadow Camp', type:'camp', region:'Racha', lat:42.7060, lng:43.2350, difficulty:'Easy', rating:4.7, ratingCount:52, facilities:['Water (river)','Basic facilities','Guesthouses nearby'], desc:"Beautiful alpine meadow in the hidden Racha valley. Crystal river, wildflowers, virtually no tourists.", safetyNotes:'Flash flood risk near river after heavy rain. Camp on higher ground.' },
    { name:'Machakhela Gorge Camp', type:'camp', region:'Adjara', lat:41.5640, lng:42.4100, difficulty:'Moderate', rating:4.6, ratingCount:71, facilities:['Ranger station','Water','Toilets'], desc:'National park campsite in subtropical Adjara. Bamboo forests, waterfalls, warm climate even in early spring.', safetyNotes:'Leeches present near water in spring. Rainy season April–June.' },
    { name:'Alazani River Flat Camp', type:'camp', region:'Kakheti', lat:41.8880, lng:46.0540, difficulty:'Easy', rating:4.3, ratingCount:89, facilities:['Fire pits','Picnic tables','River access','Parking'], desc:"Flat riverside camping in the Alazani valley. Family-friendly, near Georgia's famous wine country.", safetyNotes:'River levels can rise quickly after upstream rain. Do not camp on the bank.' },
    { name:'Paravani Lake Shore', type:'camp', region:'Borjomi', lat:41.2550, lng:43.8420, difficulty:'Easy', rating:4.6, ratingCount:63, facilities:['Wild camping','Toilet block'], desc:"Georgia's largest lake at 2073m. Wild camping on the shore. Flamingos visible in spring.", safetyNotes:'Exposed plateau — wind and cold arrive suddenly. Bring a 4-season sleeping bag.' },
    { name:'Zemo Svaneti Forest Camp', type:'camp', region:'Svaneti', lat:43.0200, lng:42.9800, difficulty:'Moderate', rating:4.5, ratingCount:31, facilities:['Water (spring)','Wild camping'], desc:'Forested camp below the Svaneti ridge. Quieter than Mestia, great for wildlife spotting.', safetyNotes:'Bear country. Hang food 4m high, 100m from camp.' },
    { name:'Kazbegi Mountain Lodge Camp', type:'camp', region:'Kazbegi', lat:42.6700, lng:44.6200, difficulty:'Moderate', rating:4.3, ratingCount:77, facilities:['Hot showers','Café','Gear store','Toilets','Wi-Fi'], desc:'Organised camp with mountain lodge facilities. Perfect for those attempting the Kazbek summit.', safetyNotes:'Summit attempts require permits and guides. Check with local mountain rescue.' },
    { name:'Gergeti Trinity Church Trail', type:'hike', region:'Kazbegi', lat:42.6563, lng:44.6327, difficulty:'Hard', rating:4.9, ratingCount:312, facilities:['Marked trail','Guide available'], desc:'The iconic Kazbegi hike to the 14th-century Gergeti church at 2170m. Rocky and steep but worth every step.', safetyNotes:'Start early to avoid afternoon heat and crowds. Descent is harder on knees than ascent.' },
    { name:'Mestia to Ushguli Traverse', type:'hike', region:'Svaneti', lat:43.0530, lng:42.7200, difficulty:'Hard', rating:4.9, ratingCount:278, facilities:['Guesthouses en route','Marked trail'], desc:"Georgia's most celebrated multi-day hike. 45km across 4 days through glacier crossings, Svan towers and ancient villages.", safetyNotes:'Glacier sections require care — crampons recommended until mid-July.' },
    { name:'Koruldi Lakes Trail', type:'hike', region:'Svaneti', lat:43.0780, lng:42.6810, difficulty:'Moderate', rating:4.7, ratingCount:145, facilities:['Marked trail'], desc:'High-altitude lakes from Mestia. 10km return to 2850m. Panoramic Caucasus views including Ushba and Tetnuldi.', safetyNotes:'Exposed above treeline. Turn back if storms develop.' },
    { name:'Truso Valley Trek', type:'hike', region:'Kazbegi', lat:42.6990, lng:44.4850, difficulty:'Moderate', rating:4.8, ratingCount:94, facilities:['Marked trail (partial)','Wild camping'], desc:'18km into the volcanic Truso valley. Mineral springs, ancient ruins and glacial landscapes. Free permit required.', safetyNotes:'River crossings can be dangerous in spring. Check water levels before setting out.' },
    { name:'Black Rock Lake Trail', type:'hike', region:'Kakheti', lat:41.9130, lng:46.0780, difficulty:'Challenging', rating:4.8, ratingCount:67, facilities:['Permit required','No facilities'], desc:'28km over 2 days to a remote alpine lake in the Lagodekhi reserve. Pristine wilderness. Permit required.', safetyNotes:'Self-sufficient hiking only. Carry 2 days of food and water purification.' },
    { name:'Borjomi to Bakuriani Trail', type:'hike', region:'Borjomi', lat:41.8390, lng:43.3810, difficulty:'Moderate', rating:4.4, ratingCount:112, facilities:['Marked trail','Seasonal'], desc:'16km one-way through beautiful mixed forest from Borjomi spa town to ski village Bakuriani.', safetyNotes:'Trail can be unclear in places in spring. Download offline map before setting off.' },
    { name:'Omalo to Shuakhevi Trek', type:'hike', region:'Tusheti', lat:42.3820, lng:45.3000, difficulty:'Expert', rating:4.9, ratingCount:38, facilities:['Guide recommended','Guesthouses (basic)'], desc:"Multi-day route through Tusheti's high villages and fortified towers. Remote — carry 3+ days of food.", safetyNotes:'No rescue services. A local guide is strongly recommended.' },
    { name:'Okatse Canyon Walkway', type:'hike', region:'Imereti', lat:42.2850, lng:42.7320, difficulty:'Easy', rating:4.6, ratingCount:198, facilities:['Entrance fee','Café','Parking','Toilets'], desc:'Suspended walkway above the dramatic Okatse canyon. 6km, accessible for most fitness levels.', safetyNotes:'Some height exposure — not suitable for severe vertigo.' },
    { name:'Lagodekhi Waterfall Trail', type:'hike', region:'Kakheti', lat:41.9270, lng:46.1020, difficulty:'Easy', rating:4.7, ratingCount:134, facilities:['Permit zone','Ranger station','Water'], desc:'8km return to three waterfalls inside the Lagodekhi protected areas. Free permit at the gate.', safetyNotes:'Trail slippery near waterfalls. Ticks active April–June.' },
    { name:'Chaukhi Massif Circuit', type:'hike', region:'Kazbegi', lat:42.6210, lng:44.6790, difficulty:'Expert', rating:4.9, ratingCount:56, facilities:['Wild camping','No marked trail'], desc:'Full circuit of the dramatic Chaukhi rock pillars from Juta village. 20km with serious off-trail navigation.', safetyNotes:'GPS and navigation skills essential. No path on upper sections.' },
    { name:'Prometheus Cave Area Walk', type:'hike', region:'Imereti', lat:42.3750, lng:42.5460, difficulty:'Easy', rating:4.3, ratingCount:89, facilities:['Cave tours','Café','Parking'], desc:'Easy walking routes around the Prometheus cave area near Kutaisi. Good for families and beginners.', safetyNotes:'Cave tour involves steps and low ceilings.' },
  ];

  spots.forEach(s => DB.spots.push({ id: newId(), ...s, createdBy:'1', status:'approved', createdAt: now() }));

  const posts = [
    { category:'tips', title:'Complete Kazbegi guide — campsites, trails, permits', body:"After 6 trips to Kazbegi I've compiled everything you need.\n\nWater sources: the stream east of base camp is reliable until September. Always purify.\n\nPermits: Truso valley requires a free permit from the ranger station in Stepantsminda village.\n\nBest time: July–August for camping, September for fewer crowds.\n\nGetting there: marshrutka from Didube station in Tbilisi, 3 hours." },
    { category:'report', title:'Mestia–Ushguli traverse June 2025 — trail conditions', body:"Just finished the traverse. Here's what you need to know:\n\nSnowpack still significant above 2400m on day 3. The Chalaadi glacier crossing needs crampons until at least mid-July.\n\nGuesthouses in Adishi and Iprali open from 15 June.\n\nDay 2 was the highlight — views from the pass above Zhamushi are extraordinary." },
    { category:'question', title:'Solo camping in Lagodekhi — permit process?', body:"I want to camp inside the reserve for two nights and can't find clear info on the permit.\n\n1. Can you get it at the gate or must it be arranged in advance?\n2. Is the Black Rock Lake trail safe for a solo hiker?\n3. Is wild camping permitted inside the reserve?\n\nAny recent experience much appreciated!" },
    { category:'gear', title:'Tent recommendations for Svaneti weather', body:"The Mestia–Ushguli traverse can get brutal storms even in summer. What tents have people used?\n\nI'm weighing up:\n- MSR Hubba Hubba NX (1.72kg) — light but weatherproof enough?\n- Hilleberg Nallo 2 (2.4kg) — bomber but heavy for solo\n\nAny experience with either in Svaneti conditions?" },
    { category:'safety', title:'Bear activity in Tusheti 2025', body:"Rangers confirmed increased bear activity on the Omalo approaches this season.\n\nRecommendations:\n- Bear canister or hang food 4m high, 100m from camp\n- Make noise through dense forest sections\n- Cook away from your tent\n- Never run if you encounter a bear\n\nNo incidents with humans so far but stay aware." },
    { category:'tips', title:'Best time to visit Tusheti', body:"Tusheti is only accessible June–October via Abano Pass.\n\nJune: lush and green, fewer visitors but road can be muddy.\nJuly–August: peak season, weather most reliable.\nSeptember: autumn colours, quiet, cooler — my favourite.\n\nAccess: shared 4x4 jeeps from Telavi. Book ahead in summer." },
    { category:'report', title:'Borjomi Kharagauli — 3-day route', body:"Did a 3-day self-guided route through the park last week. Trail network is excellent and well-marked.\n\nDay 1: Borjomi to Likani hut (6h)\nDay 2: Likani to Kharagauli village via the main ridge (8h) — highlight of the trip\nDay 3: Return to Borjomi via southern trail (5h)\n\nWater reliable at all huts." },
  ];

  posts.forEach((p, i) => {
    const authorId = ['3','4','2','3','2','4','2'][i] || '2';
    const author = DB.users.find(u => u.id === authorId);
    DB.posts.push({ id: newId(), ...p, authorId, authorName: author.name, likes:[], createdAt: now() });
  });

  const firstPost = DB.posts[0];
  DB.comments.push({ id: newId(), postId: firstPost.id, authorId:'4', authorName:'Tamara Kvaratskhelia', body:'Great guide! The ranger in Stepantsminda also issues permits for the border zone — worth checking if you plan above 3000m.', createdAt: now() });
  DB.comments.push({ id: newId(), postId: firstPost.id, authorId:'2', authorName:'Nino Gelashvili', body:'Confirmed the marshrutka tip. Buy the return ticket when you arrive in Stepantsminda.', createdAt: now() });

  const reviewData = [
    { uid:'2', un:'Nino Gelashvili', r:5, t:'Absolutely magical. The sunrise over Kazbek painted everything pink and gold.' },
    { uid:'3', un:'Giorgi Beridze', r:5, t:"Juta is remote but that's the point. Utter solitude and incredible scenery." },
    { uid:'4', un:'Tamara Kvaratskhelia', r:5, t:"Ushguli deserves all the hype. Medieval towers and 4000m peaks — unforgettable." },
    { uid:'2', un:'Nino Gelashvili', r:4, t:'Great facilities for Svaneti. Café serves decent food. Busy in August but understandable.' },
    { uid:'3', un:'Giorgi Beridze', r:4, t:'Clean and well-maintained. Mineral springs are exactly 10 minutes walk as advertised.' },
    { uid:'4', un:'Tamara Kvaratskhelia', r:5, t:'Tusheti changed my life. Three nights outside the Omalo towers — more stars than I have ever seen.' },
    { uid:'2', un:'Nino Gelashvili', r:5, t:"Shovi is Georgia's best-kept secret. Wildflowers, a perfect river, not a single tourist." },
    { uid:'3', un:'Giorgi Beridze', r:4, t:'The subtropical setting is so different from highland Georgia — almost felt like Southeast Asia.' },
  ];
  DB.spots.slice(0, 8).forEach((spot, i) => {
    DB.reviews.push({ id: newId(), spotId: spot.id, userId: reviewData[i].uid, userName: reviewData[i].un, rating: reviewData[i].r, text: reviewData[i].t, createdAt: now() });
  });

  DB.groups.push({ id: newId(), name:'Svaneti Summer Trek 2025', desc:'Full Mestia–Ushguli in late July. 4 days, guesthouses booked. Looking for 2 more experienced hikers.', destination:'Svaneti', date:'2025-07-24', isPublic: true, ownerId:'3', members:['3','2'], createdAt: now() });
  DB.groups.push({ id: newId(), name:'Tusheti First-Timers', desc:'First trip to Tusheti — guesthouses, 4 nights. Good fitness required but no prior Tusheti experience needed.', destination:'Tusheti', date:'2025-08-10', isPublic: true, ownerId:'4', members:['4'], createdAt: now() });
  DB.groups.push({ id: newId(), name:'Kazbegi Weekend Warriors', desc:'Monthly weekend trips to Kazbegi. All levels welcome — we mix beginners and experienced hikers.', destination:'Kazbegi', date:'2025-07-05', isPublic: true, ownerId:'2', members:['2','3','4'], createdAt: now() });

  console.log(`CampMate started — ${DB.spots.length} spots, ${DB.posts.length} posts, ${DB.users.length} users`);
}

function now() { return new Date().toISOString(); }
function hashPw(pw) { return crypto.createHmac('sha256', JWT_SECRET).update(pw).digest('hex'); }
function b64u(str) { return Buffer.from(str).toString('base64url'); }

function signToken(payload) {
  const h = b64u(JSON.stringify({ alg:'HS256', typ:'JWT' }));
  const b = b64u(JSON.stringify({ ...payload, iat: Date.now() }));
  const s = crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${b}`).digest('base64url');
  return `${h}.${b}.${s}`;
}

function verifyToken(token) {
  try {
    const [h, b, s] = token.split('.');
    if (crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${b}`).digest('base64url') !== s) return null;
    return JSON.parse(Buffer.from(b, 'base64url').toString());
  } catch { return null; }
}

function inGeorgia(lat, lng) {
  return lat >= 41.0 && lat <= 44.0 && lng >= 40.0 && lng <= 47.0;
}

function readBody(req) {
  return new Promise((res, rej) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => { try { res(JSON.parse(data || '{}')); } catch { res({}); } });
    req.on('error', rej);
  });
}

function send(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  });
  res.end(JSON.stringify(data));
}

function auth(req) {
  const h = req.headers['authorization'] || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : null;
  return t ? verifyToken(t) : null;
}

async function route(req, res) {
  const parsed   = url.parse(req.url, true);
  const pathname = parsed.pathname.replace(/\/$/, '') || '/';
  const method   = req.method.toUpperCase();
  const q        = parsed.query;

  if (method === 'OPTIONS') { send(res, 204, {}); return; }

  if (method === 'GET' && !pathname.startsWith('/api')) {
    serveStatic(req, res, pathname); return;
  }

  if (pathname === '/api/auth/register' && method === 'POST') {
    const body = await readBody(req);
    const { name, email, password, region='Tbilisi', level='Beginner' } = body;
    if (!name || !email || !password) return send(res, 400, { error: 'name, email and password are required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return send(res, 400, { error: 'Invalid email address' });
    if (password.length < 6) return send(res, 400, { error: 'Password must be at least 6 characters' });
    if (DB.users.find(u => u.email === email)) return send(res, 409, { error: 'Email already registered' });
    const user = { id: newId(), name: name.trim(), email, passwordHash: hashPw(password), bio:'', region, level, avatar:'', role:'user', createdAt: now() };
    DB.users.push(user);
    const { passwordHash, ...safe } = user;
    return send(res, 201, { token: signToken({ id: user.id, role: user.role }), user: safe });
  }

  if (pathname === '/api/auth/login' && method === 'POST') {
    const { email, password } = await readBody(req);
    const user = DB.users.find(u => u.email === email);
    if (!user || user.passwordHash !== hashPw(password)) return send(res, 401, { error: 'Invalid email or password' });
    const { passwordHash, ...safe } = user;
    return send(res, 200, { token: signToken({ id: user.id, role: user.role }), user: safe });
  }

  if (pathname === '/api/auth/me' && method === 'GET') {
    const a = auth(req);
    if (!a) return send(res, 401, { error: 'Unauthorized' });
    const user = DB.users.find(u => u.id === a.id);
    if (!user) return send(res, 404, { error: 'User not found' });
    const { passwordHash, ...safe } = user;
    return send(res, 200, { user: safe });
  }

  if (pathname === '/api/users' && method === 'GET') {
    const a = auth(req);
    if (!a) return send(res, 401, { error: 'Unauthorized' });
    return send(res, 200, { users: DB.users.filter(u => u.id !== a.id).map(({ passwordHash, ...u }) => u) });
  }

  if (pathname === '/api/users/profile' && method === 'PUT') {
    const a = auth(req);
    if (!a) return send(res, 401, { error: 'Unauthorized' });
    const body = await readBody(req);
    const user = DB.users.find(u => u.id === a.id);
    if (!user) return send(res, 404, { error: 'Not found' });
    const validRegions = ['Tbilisi','Kazbegi','Svaneti','Tusheti','Borjomi','Racha','Kakheti','Adjara','Imereti','Samegrelo'];
    const validLevels  = ['Beginner','Intermediate','Advanced','Expert'];
    if (body.name)   user.name   = body.name.trim().slice(0, 80);
    if (body.bio)    user.bio    = body.bio.slice(0, 400);
    if (body.region && validRegions.includes(body.region)) user.region = body.region;
    if (body.level  && validLevels.includes(body.level))   user.level  = body.level;
    const { passwordHash, ...safe } = user;
    return send(res, 200, { user: safe });
  }

  if (pathname === '/api/spots' && method === 'GET') {
    let spots = DB.spots.filter(s => s.status !== 'pending');
    if (q.type)       spots = spots.filter(s => s.type === q.type);
    if (q.region)     spots = spots.filter(s => s.region.toLowerCase() === q.region.toLowerCase());
    if (q.difficulty) spots = spots.filter(s => s.difficulty.toLowerCase() === q.difficulty.toLowerCase());
    if (q.search) {
      const t = q.search.toLowerCase();
      spots = spots.filter(s => s.name.toLowerCase().includes(t) || s.region.toLowerCase().includes(t) || s.desc.toLowerCase().includes(t));
    }
    return send(res, 200, { spots });
  }

  const spotId = pathname.match(/^\/api\/spots\/([^/]+)$/);
  if (spotId && method === 'GET') {
    const spot = DB.spots.find(s => s.id === spotId[1]);
    if (!spot) return send(res, 404, { error: 'Not found' });
    const reviews = DB.reviews.filter(r => r.spotId === spot.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return send(res, 200, { spot, reviews });
  }

  if (pathname === '/api/spots' && method === 'POST') {
    const a = auth(req);
    if (!a) return send(res, 401, { error: 'Unauthorized' });
    const body = await readBody(req);
    const { name, type, region, lat, lng, desc='', difficulty='Moderate', facilities=[] } = body;
    if (!name || !type || !region || lat === undefined || lng === undefined)
      return send(res, 400, { error: 'name, type, region, lat and lng are required' });
    const fLat = parseFloat(lat), fLng = parseFloat(lng);
    if (!inGeorgia(fLat, fLng))
      return send(res, 400, { error: 'Location must be within Georgia (lat 41–44, lng 40–47)' });
    if (!['camp','hike'].includes(type))
      return send(res, 400, { error: 'type must be camp or hike' });
    const status = a.role === 'admin' ? 'approved' : 'pending';
    const spot = { id: newId(), name: name.trim(), type, region, lat: fLat, lng: fLng, desc, difficulty, facilities, rating: 0, ratingCount: 0, createdBy: a.id, status, createdAt: now() };
    DB.spots.push(spot);
    return send(res, 201, { spot });
  }

  if (spotId && method === 'DELETE') {
    const a = auth(req);
    if (!a || a.role !== 'admin') return send(res, 403, { error: 'Admin only' });
    const idx = DB.spots.findIndex(s => s.id === spotId[1]);
    if (idx < 0) return send(res, 404, { error: 'Not found' });
    DB.spots.splice(idx, 1);
    return send(res, 200, { deleted: true });
  }

  const approveMatch = pathname.match(/^\/api\/spots\/([^/]+)\/approve$/);
  if (approveMatch && method === 'POST') {
    const a = auth(req);
    if (!a || a.role !== 'admin') return send(res, 403, { error: 'Admin only' });
    const spot = DB.spots.find(s => s.id === approveMatch[1]);
    if (!spot) return send(res, 404, { error: 'Not found' });
    spot.status = 'approved';
    return send(res, 200, { spot });
  }

  const reviewSpot = pathname.match(/^\/api\/spots\/([^/]+)\/reviews$/);
  if (reviewSpot && method === 'POST') {
    const a = auth(req);
    if (!a) return send(res, 401, { error: 'Unauthorized' });
    const { rating, text } = await readBody(req);
    if (!rating || !text) return send(res, 400, { error: 'rating and text are required' });
    const spot = DB.spots.find(s => s.id === reviewSpot[1]);
    if (!spot) return send(res, 404, { error: 'Spot not found' });
    if (DB.reviews.find(r => r.spotId === spot.id && r.userId === a.id))
      return send(res, 409, { error: 'You have already reviewed this spot' });
    const user   = DB.users.find(u => u.id === a.id);
    const review = { id: newId(), spotId: spot.id, userId: a.id, userName: user.name, rating: Math.min(5, Math.max(1, parseInt(rating))), text: text.slice(0, 600), createdAt: now() };
    DB.reviews.push(review);
    const all = DB.reviews.filter(r => r.spotId === spot.id);
    spot.ratingCount = all.length;
    spot.rating = parseFloat((all.reduce((s, r) => s + r.rating, 0) / all.length).toFixed(1));
    return send(res, 201, { review });
  }

  if (pathname === '/api/favorites' && method === 'GET') {
    const a = auth(req);
    if (!a) return send(res, 401, { error: 'Unauthorized' });
    const ids   = DB.favorites.filter(f => f.userId === a.id).map(f => f.spotId);
    const spots = DB.spots.filter(s => ids.includes(s.id));
    return send(res, 200, { spots });
  }

  if (pathname === '/api/favorites' && method === 'POST') {
    const a = auth(req);
    if (!a) return send(res, 401, { error: 'Unauthorized' });
    const { spotId } = await readBody(req);
    if (!spotId) return send(res, 400, { error: 'spotId required' });
    const idx = DB.favorites.findIndex(f => f.userId === a.id && f.spotId === spotId);
    if (idx >= 0) { DB.favorites.splice(idx, 1); return send(res, 200, { saved: false }); }
    DB.favorites.push({ userId: a.id, spotId });
    return send(res, 200, { saved: true });
  }

  const VALID_CATS = ['tips','report','question','gear','planning','safety'];

  if (pathname === '/api/posts' && method === 'GET') {
    let posts = [...DB.posts];
    if (q.category && q.category !== 'all') posts = posts.filter(p => p.category === q.category);
    if (q.search) { const t = q.search.toLowerCase(); posts = posts.filter(p => p.title.toLowerCase().includes(t) || p.body.toLowerCase().includes(t)); }
    if (q.sort === 'popular')   posts.sort((a, b) => b.likes.length - a.likes.length);
    else if (q.sort === 'commented') {
      posts = posts.map(p => ({ ...p, _cc: DB.comments.filter(c => c.postId === p.id).length })).sort((a, b) => b._cc - a._cc);
    } else posts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return send(res, 200, { posts });
  }

  if (pathname === '/api/posts' && method === 'POST') {
    const a = auth(req);
    if (!a) return send(res, 401, { error: 'Unauthorized' });
    const { category, title, body } = await readBody(req);
    if (!category || !title || !body) return send(res, 400, { error: 'category, title and body are required' });
    if (!VALID_CATS.includes(category)) return send(res, 400, { error: `category must be one of: ${VALID_CATS.join(', ')}` });
    const user = DB.users.find(u => u.id === a.id);
    const post = { id: newId(), category, title: title.trim().slice(0, 200), body: body.slice(0, 5000), authorId: a.id, authorName: user.name, likes:[], createdAt: now() };
    DB.posts.push(post);
    return send(res, 201, { post });
  }

  const postMatch = pathname.match(/^\/api\/posts\/([^/]+)$/);
  if (postMatch && method === 'GET') {
    const post = DB.posts.find(p => p.id === postMatch[1]);
    if (!post) return send(res, 404, { error: 'Not found' });
    const comments = DB.comments.filter(c => c.postId === post.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return send(res, 200, { post, comments });
  }

  if (postMatch && method === 'DELETE') {
    const a = auth(req);
    if (!a) return send(res, 401, { error: 'Unauthorized' });
    const idx = DB.posts.findIndex(p => p.id === postMatch[1]);
    if (idx < 0) return send(res, 404, { error: 'Not found' });
    if (DB.posts[idx].authorId !== a.id && a.role !== 'admin') return send(res, 403, { error: 'Forbidden' });
    const postId = DB.posts[idx].id;
    DB.posts.splice(idx, 1);
    DB.comments = DB.comments.filter(c => c.postId !== postId);
    return send(res, 200, { deleted: true });
  }

  const likeMatch = pathname.match(/^\/api\/posts\/([^/]+)\/like$/);
  if (likeMatch && method === 'POST') {
    const a = auth(req);
    if (!a) return send(res, 401, { error: 'Unauthorized' });
    const post = DB.posts.find(p => p.id === likeMatch[1]);
    if (!post) return send(res, 404, { error: 'Not found' });
    const idx = post.likes.indexOf(a.id);
    if (idx >= 0) post.likes.splice(idx, 1); else post.likes.push(a.id);
    return send(res, 200, { likes: post.likes.length, liked: idx < 0 });
  }

  const commentMatch = pathname.match(/^\/api\/posts\/([^/]+)\/comments$/);
  if (commentMatch && method === 'POST') {
    const a = auth(req);
    if (!a) return send(res, 401, { error: 'Unauthorized' });
    const { body } = await readBody(req);
    if (!body || !body.trim()) return send(res, 400, { error: 'body is required' });
    const post = DB.posts.find(p => p.id === commentMatch[1]);
    if (!post) return send(res, 404, { error: 'Post not found' });
    const user    = DB.users.find(u => u.id === a.id);
    const comment = { id: newId(), postId: post.id, authorId: a.id, authorName: user.name, body: body.slice(0, 1000), createdAt: now() };
    DB.comments.push(comment);
    return send(res, 201, { comment });
  }

  if (pathname === '/api/groups' && method === 'GET') {
    return send(res, 200, { groups: DB.groups.filter(g => g.isPublic) });
  }

  if (pathname === '/api/groups' && method === 'POST') {
    const a = auth(req);
    if (!a) return send(res, 401, { error: 'Unauthorized' });
    const { name, desc, destination, date, isPublic=true } = await readBody(req);
    if (!name || !destination || !date) return send(res, 400, { error: 'name, destination and date are required' });
    const group = { id: newId(), name: name.trim().slice(0, 120), desc: (desc||'').slice(0, 400), destination, date, isPublic: Boolean(isPublic), ownerId: a.id, members:[a.id], createdAt: now() };
    DB.groups.push(group);
    return send(res, 201, { group });
  }

  const groupJoin = pathname.match(/^\/api\/groups\/([^/]+)\/join$/);
  if (groupJoin && method === 'POST') {
    const a = auth(req);
    if (!a) return send(res, 401, { error: 'Unauthorized' });
    const group = DB.groups.find(g => g.id === groupJoin[1]);
    if (!group) return send(res, 404, { error: 'Not found' });
    if (!group.members.includes(a.id)) group.members.push(a.id);
    return send(res, 200, { group });
  }

  const groupLeave = pathname.match(/^\/api\/groups\/([^/]+)\/leave$/);
  if (groupLeave && method === 'POST') {
    const a = auth(req);
    if (!a) return send(res, 401, { error: 'Unauthorized' });
    const group = DB.groups.find(g => g.id === groupLeave[1]);
    if (!group) return send(res, 404, { error: 'Not found' });
    group.members = group.members.filter(m => m !== a.id);
    return send(res, 200, { group });
  }

  if (pathname === '/api/messages' && method === 'GET') {
    const a = auth(req);
    if (!a) return send(res, 401, { error: 'Unauthorized' });
    let msgs = DB.messages.filter(m => m.toId === a.id || m.fromId === a.id);
    if (q.with) msgs = msgs.filter(m => m.fromId === q.with || m.toId === q.with);
    msgs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    msgs.filter(m => m.toId === a.id).forEach(m => { m.read = true; });
    return send(res, 200, { messages: msgs });
  }

  if (pathname === '/api/messages' && method === 'POST') {
    const a = auth(req);
    if (!a) return send(res, 401, { error: 'Unauthorized' });
    const { toId, body } = await readBody(req);
    if (!toId || !body) return send(res, 400, { error: 'toId and body are required' });
    if (!DB.users.find(u => u.id === toId)) return send(res, 404, { error: 'Recipient not found' });
    const msg = { id: newId(), fromId: a.id, toId, body: body.slice(0, 2000), read: false, createdAt: now() };
    DB.messages.push(msg);
    return send(res, 201, { message: msg });
  }

  if (pathname === '/api/messages/unread' && method === 'GET') {
    const a = auth(req);
    if (!a) return send(res, 401, { error: 'Unauthorized' });
    return send(res, 200, { count: DB.messages.filter(m => m.toId === a.id && !m.read).length });
  }

  if (pathname === '/api/admin/stats' && method === 'GET') {
    const a = auth(req);
    if (!a || a.role !== 'admin') return send(res, 403, { error: 'Admin only' });
    return send(res, 200, { users: DB.users.length, spots: DB.spots.filter(s => s.status === 'approved').length, pending: DB.spots.filter(s => s.status === 'pending').length, posts: DB.posts.length, reviews: DB.reviews.length, groups: DB.groups.length, messages: DB.messages.length });
  }

  if (pathname === '/api/admin/users' && method === 'GET') {
    const a = auth(req);
    if (!a || a.role !== 'admin') return send(res, 403, { error: 'Admin only' });
    return send(res, 200, { users: DB.users.map(({ passwordHash, ...u }) => u) });
  }

  const adminUser = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (adminUser && method === 'DELETE') {
    const a = auth(req);
    if (!a || a.role !== 'admin') return send(res, 403, { error: 'Admin only' });
    if (adminUser[1] === '1') return send(res, 400, { error: 'Cannot delete the primary admin account' });
    const idx = DB.users.findIndex(u => u.id === adminUser[1]);
    if (idx < 0) return send(res, 404, { error: 'Not found' });
    DB.users.splice(idx, 1);
    return send(res, 200, { deleted: true });
  }

  if (pathname === '/api/admin/spots/pending' && method === 'GET') {
    const a = auth(req);
    if (!a || a.role !== 'admin') return send(res, 403, { error: 'Admin only' });
    return send(res, 200, { spots: DB.spots.filter(s => s.status === 'pending') });
  }

  if (pathname === '/api/admin/posts' && method === 'GET') {
    const a = auth(req);
    if (!a || a.role !== 'admin') return send(res, 403, { error: 'Admin only' });
    return send(res, 200, { posts: DB.posts });
  }

  if (pathname === '/api/photo' && method === 'GET') {
    const { spotId, region, type } = q;
    if (!spotId) return send(res, 400, { error: 'spotId required' });
    if (photoCache[spotId]) return send(res, 200, { url: photoCache[spotId] });
    if (!UNSPLASH_KEY) return send(res, 200, { url: null });
    try {
      const keyword = (REGION_PHOTO_KEYWORDS[region] || 'georgia mountains nature') + ' ' + (TYPE_PHOTO_KEYWORDS[type] || '');
      const photoUrl = await new Promise((resolve) => {
        const https = require('https');
        const target = new URL(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(keyword)}&orientation=landscape&content_filter=high`);
        https.get({ hostname: target.hostname, path: target.pathname + target.search, headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }, (r) => {
          let data = '';
          r.on('data', c => data += c);
          r.on('end', () => { try { resolve(JSON.parse(data)?.urls?.regular || null); } catch { resolve(null); } });
        }).on('error', () => resolve(null));
      });
      if (photoUrl) photoCache[spotId] = photoUrl;
      return send(res, 200, { url: photoUrl });
    } catch { return send(res, 200, { url: null }); }
  }

  send(res, 404, { error: 'Not found' });
}

function serveStatic(req, res, pathname) {
  const filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
  const mime = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.ico':'image/x-icon' };
  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(__dirname, 'public', 'index.html'), (e2, d2) => {
        if (e2) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(d2);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': mime[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

seed();
const server = http.createServer(async (req, res) => {
  try { await route(req, res); }
  catch (e) { console.error(e.message); send(res, 500, { error: 'Internal server error' }); }
});

server.listen(PORT, () => {
  console.log(`\n🏕️  CampMate running at http://localhost:${PORT}`);
  console.log(`   admin@campmate.ge / admin123`);
  console.log(`   nino@example.com  / pass123\n`);
});
