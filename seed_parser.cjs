const fs = require('fs');
const path = require('path');

const ocrText = `
1 Electrician Single Phase Breaker Replacement 800 Starting price https://clopal.com/products/clopal-0-5-amp-safety-circuit-breaker-single-pole?srsltid=AfmBOoofystk2eew8oSL-yPirkSh5Z1e9ttoGy7Cx2vumiiQY9hjHBJ3
Electrician Single Phase Distribution Box Installation 2000 Starting price https://www.wosomelec.com/mcb-metal-distribution-box/single-phase-plug-in-mcb-metal-distribution-box 
2 Electrician Fan Installation 600 Per ceiling fan https://www.spinchill.com/how-to-install-a-ceiling-fan/ 
3 Electrician Ceilling Fan Repairing 500 Per fan https://performanceac.com/electrical-services/ceiling-fan-repair-services/ 
4 Electrician Ceiling Fan Installation 700 Per fan https://styloelectric.pk/product/2x2-cieling-fan/ 
5 Electrician Switch Board Repair 700 Per switch board https://www.youtube.com/watch?v=b1f-wxCEen0
6 Electrician Switch Installation 500 Per switch https://eshop.se.com/in/blog/post/how-to-wire-switches-in-series.html?srsltid=AfmBOorA0y67goM8P-iL7IhayMzggLZDLBTIFs5zsA74W2aWSrEweNJ4
Electrician Change Over Switch Installation 1100 Vary After Inspuction https://www.hardieelectrical.co.uk/photo/changeover-switch-installation-back-generator 
7 Electrician Socket Replacement 500 Per socket https://www.google.com/imgres?q=Socket%20Replacement&imgurl=https%3A%2F%2Fpowerhouseexpress.com.pk%2Fcdn%2Fshop%2Ffiles%2FDSC_5144a.webp%3Fv%3D1744477671&imgrefurl=https%3A%2F%2Fpowerhouseexpress.com.pk%2Fproducts%2Fe-series-e15-socket%3Fsrsltid%3DAfmBOoqMZHqinHOwRLxRoSjYXQdBtHV_EHP6lXKU65AFCB3kLnh8PLwR&docid=i-cdSspBjj7T0M&tbnid=Q86kCvQ28WLjkM&vet=1
8 Electrician House Wiring 2500 Starting price https://smartshop.lk-ea.com/blog-articles/post/house-electrical-wiring-guide.html?srsltid=AfmBOoqyjTat_bBlxj-6Rmeapd9NY1yQ3sFizYw8cfXKzDJuGkLEuUjt 
9 Electrician Rewiring 4000 Starting price https://www.serviceprofessor.com/electrical/whole-home-rewiring/ 
11 Electrician Light Installation 400 Per light fixture https://www.thespruce.com/how-to-install-recessed-lighting-5192848
12 Electrician LED Light Installation 500 Per LED light https://www.youtube.com/watch?v=USvLN6EDLk4
13 Electrician Chandelier Installation 1500 Per chandelier https://www.linkedin.com/pulse/understand-pre-installation-issues-pendant-hanging-chandelier-zheng-ktcwc 
14 Electrician Outdoor Light Installation 800 Per outdoor light https://www.google.com/imgres?q=Outdoor%20Light%20Installation&imgurl=https%3A%2F%2Fwww.bhg.com%2Fthmb%2FRrK7YHGpveEfdrxTy462I8e_K7g%3D%2F6000x4000%2Ffilters%3Ano_upscale()%2FBHG-how-to-install-a-porch-light-6750514-hero_30439-7605dc891e1743ddae8b535ce0207daf.jpg&imgrefurl=https%3A%2F%2Fwww.bhg.com%2Fhow-to-install-a-porch-light-6750514&docid=F3LOOVN-Y0PodM&tbni
15 Electrician Door Bell Installation 600 Per door bell https://www.youtube.com/watch?v=CFGjgnmSO58
16 Electrician Exhaust Fan Installation 700 Per exhaust fan https://www.crompton.co.in/blogs/fans-guide/how-to-install-an-exhaust-fan-in-your-home 
17 Electrician DB Board Installation 2500 Per DB board https://besgroup.com/services/electrical/electrical-installation-project/distribution-board-upgrades/ 
18 Electrician DB Board Repair 1000 Per DB board https://www.justdial.com/india/Distribution-Board-Repair-Services 
19 Electrician Earthing Installation 3000 Per installation https://axis-india.com/standard-bs-7430-iec-62305/ 
20 Electrician Electrical Safety Inspection 1500 Per visit https://williamsonelectric.com/electrical-safety-inspections/ 
21 Electrician Short Circuit Repair 1000 Starting price https://www.thespruce.com/what-causes-short-circuits-4118973
22 Electrician Power Failure Troubleshooting 1200 Per visit https://www.aesintl.com/how-to-repair-power-supplies-your-options-explained/ 
23 Electrician Inverter Installation 2500 Per inverter https://www.xindun-power.com/news/dc-to-ac-solar-power-inverter-installation-for-home.html 
24 Electrician UPS Installation 2500 Per UPS https://www.kamkaj.pk/blogs/things-to-keep-in-mind-when-installing-a-ups-in-karachi 
25 Electrician Generator Wiring 4000 Per generator https://www.staticelectrics.com.au/electricians-blog/connect-generator-to-house/ 
26 Electrician TV Wall Mount Installation 1500 Vary After Inspuction https://supplytoronto.ca/product/tv-mount-installation/?srsltid=AfmBOooNfBXeCcaYREo5Y0RXUEMS50POk6tGs_9WojwtMyVzJIn_N0zU
27 Electrician LCD/LED TV Repair 2500 Starting price https://www.google.com/imgres?q=LCD%2FLED%20TV%20Repair&imgurl=https%3A%2F%2Fsadaatelectronics.pk%2Fwp-content%2Fuploads%2F2025%2F06%2FLED-TV-Repair.webp&imgrefurl=https%3A%2F%2Fsadaatelectronics.pk%2Fislamabad%2Fled-tv-repair%2F&docid=OVWEcvzxAUZBkM&tbnid=owlStfLsyQLLUM&vet=12ahUKEwjmyqGKktCVAxWFZqQEHUP2JkQQnPAOegQIfRAA..i&w=1300&h=950&hcb=2&ved=2ahU
Electrician Automatic Washing Machine Repairing 700 Visit and inspuction Charges https://www.justdial.com/Thiruvananthapuram/Automatic-Washing-Machine-Repair-Services-Godrej/nct-12100320
28 Home Services Sofa Cleaning - 5 Seater 1300 Per sofa set https://nestfumigationservices.com/sofa-cleaning-karachi/ 
29 Home Services Sofa Cleaning - 6 Seater 1599 Per sofa set https://supersavvy.in/sofa-cleaning-in-rohini-sector-6-delhi-india 
30 Home Services Sofa Cleaning - 7 Seater 1890 Per sofa set https://vocal.media/fyi/why-sofa-cleaning-service-is-a-must-for-each-home-in-pakistan
31 Home Services Sofa Cleaning - 10 Seater 2690 Per sofa set https://mightytwin.com/sofa-cleaning/ 
32 Home Services Sofa Cleaning - Per Seat 250 Per seat (min 4) https://thecapitaltankers.com/services/sofa-cleaning-rawalpindi/ 
33 Home Services Dewan Cleaning 1099 Per dewan https://mahircompany.com/sofa-cleaning-services-dha-phase-5-karachi 
34 Home Services Sofa Cum Bed Cleaning 1350 Per sofa bed https://www.google.com/imgres?q=Sofa%20Cum%20Bed%20Cleaning&imgurl=https%3A%2F%2Fwww.coirfitmattress.com%2Fwp-content%2Fuploads%2F2021%2F01%2F71kFQoSnRfL._SL1500_-1024x1024.jpg&imgrefurl=https%3A%2F%2Fwww.coirfitmattress.com%2Fblog%2Fhow-to-keep-coirfit-sofa-cum-bed-clean%2F&docid=EbIg2ZXqt04SzM&tbnid=WdI8kEISsqqU-M&vet=12ahUKEwi97MLllNCVAxUlUKQEHd-SKfgQnPA
35 Home Services Water Tank Cleaning 2000 Per tank https://watersolutions.pk/best-water-tank-cleaning-services-in-karachi-a-complete-guide/ 
36 Home Services Full Home Deep Cleaning 8000 Starting price https://www.thespruce.com/deep-cleaning-house-7152794
37 Home Services Gardener Visit 1500 Per visit https://www.checkatrade.com/blog/gardener-near-me/ 
Home Services Blind Cleaning 800 Per Blind https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTodMzosheFH7kr4w3cY7_lTmE_HN_GRm7K2MCylSDYTiCkYP0JaVe4KVWy&s=10
38 Home Services Carpet Cleaning 25 Per sq. ft. https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR6he08TcaboG_UfMPHMDXojlfi6BT3YutycLhuKRALQw&s=10 
Home Services Curtain Cleaning 1000 Per Curtain https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQW33h2sDVTJvUKbc_EHB5xkhyWGCNnAJATbh6k2tn66afuXxCRzhNEQCQ&s=10
39 Plumber Plumbing Repair Visit 700 Per visit https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR0CmktSAYF45gnWKaZIUkbGo00hfjEGwxMZv71kmY2PA&s=10
40 Plumber Geyser Water Heater Repair 1000 Starting price https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRnnmkrBeOrkBg8EAKq5YkJ8MRLBoR48AkfTnSeN5gq2w&s=10
41 Plumber Motor Installation 1200 Per motor https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSPBlBgdru883X2LKSKuEMXMVtMElXPwRry_2RuogX2UQ&s=10
42 Plumber Pipe Fitting 150 Per running foot https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTGUCufEqckOKfuTchPEN-bvL9SAClQKnk7uh3198dEWPIxUCBUI2bqTX4&s=10
43 Plumber Drainage Cleaning 1500 Per visit https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRy5CkZqdZfI65oq0aJZhKyX3jnvYmceOoboDlFBHnNxxbR_mjF-cg-aHw&s=10
44 Plumber Sanitary Fitting 800 Per fitting https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS-LKHQRwZuZ2S5eiJfEroVKrVfZh8McHpbliA3mAlS7kSgJk5f00KPN4HN&s=10
45 Plumber Leakage Repair 800 Starting price https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR2RzAvKs-i5okn991gak8lclDtPI4GrZpdFW7_wmzSfXudbXihM0lZXRc&s=10
46 Painter Interior Wall Painting 500 Visit and inspuction Charges https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS57x5xzMtLEZjRCQIIPPOq2TXpYm3hJrr_Ye2ws8u55Q&s=10
47 Painter Exterior Wall Painting 500 Visit and inspuction Charges https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSKTO9be5F5wjiaPrnOwqtNV0lSMsUBXlqSAMy_VrUO4FnPBBsC2WK0iAo&s=10
48 Painter Texture Painting 75 Per sq. ft. https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTX2MJLnrB86REo8FGdzvIxYcXsgeONU-hWqzHtPafcs_8TYmY6OcDoT0u-&s=10
49 Painter Wood Polishing 110 Per sq. ft. https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSTIb8R1UKRFAQtsP0IiDFc8C6apoSmDzS9j-Pjol1Gdpc6dsz5zMphRIix&s=10
50 Painter Wall Putty Works 22 Per sq. ft. https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTb4GWgI0nHC51CjHGNPNRiOvzmfbuvW9PHa7GHckQpTEVznX1tBR6WYpZh&s=10
51 Painter Waterproofing 70 Per sq. ft. https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT-1PIrYbcX8xxNoxaj0UWtDoYwRdBJWKUgGUiRh3ccnkTBjWnwCVCdTFuW&s=10 
Painter Gray structure Paint 500 Visit and inspuction Charges https://cdn.mrmahir.com/uploads/21534635-fe5a-4315-8c83-9d97a4ed0fbe.png 
52 Carpenter Furniture Repair 1000 Starting price https://images.ctfassets.net/5kq8dse7hipf/7FhCe1WYFMZMo0SA9FR3Qi/595b0bedfdaa8dc30408ec280fc9d62f/Furniture-repair-cost.jpg 
53 Carpenter Door Installation 2000 Per door https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSHX3H16SzIN2qh_gT6zvj8l8yUKS7SdlQYSOItM_cCFSdh_3Opm10Z4zQ&s=10
54 Carpenter Window Installation 1800 Per window https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTQycww0hFJ-nSrKxkkJTnb_8ESbPH-Q4d742oK8djHJhmf33PZXLf7sXk&s=10
55 Carpenter Cabinet Making 500 Per sq. ft. https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRsq_7f7BWPMJo5dlUTGG-6FBf5u10VxPfqR2RswclLmA&s=10
56 Carpenter Wardrobe Making 700 Per sq. ft. https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRssDmOF6gBIo3ZT3L5ETUUlHOM_9w--oCoQrBh_YJ4IDwc_u4G1lsdB7mo&s=10
57 Carpenter Lock Installation 600 Per lock https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTvzp4tbXiVWCVRbrgjZRnWXOmP_V1aEJcHnLtiuMNz_A&s=10
64 Welder Gate Repair 1500 Starting price https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcScrOQ8nmtO3ycvjALTvcIoc9sQ3I91vpwC02mvQq5mnlN0gzidTlSjlHI&s=10
65 Welder Window Grill Making 450 Per sq. ft. https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSzlSr775plNRk8zhDGnWlSQnWxv90iHCmW4AIq4X38opWYN5FiHHrwPwZV&s=10
67 Welder Stair Welding 2500 Starting price https://i.pinimg.com/736x/33/c7/cb/33c7cb4c2e6e48fca61fef6cea9ee2e3.jpg 
68 Welder Iron Fence Installation 500 Per running foot https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQOajK_QOPHwfRdpsvXtbbziFayAGSpssfaFBquekcURg&s=10
69 Fabricator Steel Fabrication 450 Per kg https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTOlFHqnU-YTJo-LNTJxmAPKmlNS2RdSGoXmkzfV5rALolBZ27EeeFsoaez&s=10
70 Fabricator Aluminium Window 900 Per sq. ft. https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTz9yWUS-wk4IcVvCgIxoYDXTmKwj2v0apPFrKy7wi7fA&s=10
71 Fabricator Steel Gate 650 Per sq. ft. https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ9hTkaL3H4FzdyIPtBBjYuXx_vv6W93Y04WWnPkv06nM1VE34tAqG8u6V1&s=10
72 Fabricator Glass Work 450 Per sq. ft. https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQd1_svwwHYMDYrreH9U_xEwmrxHHjrwt8Ufr7THtGQZw&s=10
73 Fabricator Ceiling Works 150 Per sq. ft. https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRSIU670xlfk0Jt8eg3aB9-MbEKnU_MYKx9Nu5pa7u0Hg&s=10
74 CCTV Home CCTV Installation 1200 Per camera https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSyW4HuwBp1GBmCe_Ai2yQS9pe7wDPqaiUJ3mTxAOKQ1cLJa8kwVR3Mh-sx&s=10
75 CCTV Wireless CCTV Setup 1500 Per setup https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTClW3mqa5JLg1sQ6s6EFQ3ba434N7AfZYydqsxxcN_bw&s=10
76 CCTV CCTV Maintenance 1000 Per visit https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTtenrYQMRPe3aj2Pn5IVpsZtUasyvZ_ZGJ6iWRS-d6Jg&s=10
77 HVAC AC Installation 3000 Per AC https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSBEz012fO0fV0vzAuopTF0lA25au4BRki3FkHLUBPuDw&s=10
78 HVAC AC Gas Pressure Check 800 Per AC https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ00pTizU02YuJKdf9ASZm-EGEqamJjoK7AUHmmo_BU5A&s=10
79 HVAC AC Dismounting 2000 Per AC https://s3.ap-south-1.amazonaws.com/cdn.sajilosewa.com/uploads/service/686bb1e10b6acba32fc9253a.webp
80 HVAC AC Gas Refill 4500 Per AC https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS1hloiY6mQdYK8YdgfHWDfR4c_a6WPGLmLNs7NSY_2lQ&s=10
81 HVAC AC General Service 2000 Per AC https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQSaHlMrfftBXNl1lh5aNTVjDGgTTYAiBbH99yQtukOhA&s=10
82 Office Maintenance Facility Walkthrough 2500 Per visit https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRCFr0hUyfJLfqiHua7okyXxX2CVCpPq_yCkgWW0BtrsA&s=10
83 Office Maintenance Basic Electrical Inspection 1500 Per visit https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTsJk1YQDWRXUPkgsrY7f6pV0sVMEHEPa5PnXp3okzvmw&s=10
84 Office Maintenance Plumbing Inspection 1500 Per visit https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTOKFkzsvRalG5WqeO9yJtPBHoI6V1msd4ce3z0sPU5Cg&s=10
85 Office Maintenance HVAC Inspection 2000 Per visit https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSVUsG9th9iJ6be0umQUdaf3begbpAn8Z7cy009B5GsIA&s=10
`;

const lines = ocrText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
const parsedServices = [];

const categoryMap = {
  'Electrician': 'electrician',
  'Home Services': 'home-cleaning', 
  'Plumber': 'plumbers',
  'Painter': 'painters',
  'Carpenter': 'carpenter',
  'Welder': 'welder-fabricator',
  'Fabricator': 'welder-fabricator',
  'CCTV': 'cctv',
  'HVAC': 'ac-services',
  'Office Maintenance': 'subscriptions'
};

const subcategoryCache = new Set();
const subcategoriesToInsert = [];

function generateId(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const urlRegex = new RegExp("(https?://.*)$");
const priceUnitRegex = new RegExp("(.*)\\s+(\\d+)\\s+(.*)$");

for (const line of lines) {
  let category = '';
  let foundCatKey = '';
  const cleanLine = line.replace(/^\d+\s+/, ''); 
  for (const key of Object.keys(categoryMap)) {
    if (cleanLine.startsWith(key)) {
      category = categoryMap[key];
      foundCatKey = key;
      break;
    }
  }

  if (!category) {
    console.warn('Could not map category for line:', line);
    continue;
  }

  const afterCat = cleanLine.substring(foundCatKey.length).trim();
  const urlMatch = afterCat.match(urlRegex);
  if (!urlMatch) {
     console.warn('Could not find URL for line:', line);
     continue;
  }
  const url = urlMatch[1].trim();
  const withoutUrl = afterCat.substring(0, afterCat.length - url.length).trim();

  const priceUnitMatch = withoutUrl.match(priceUnitRegex);
  if (!priceUnitMatch) {
     console.warn('Could not find price and unit for line:', line);
     continue;
  }
  const title = priceUnitMatch[1].trim();
  const price = parseInt(priceUnitMatch[2].trim(), 10);
  const unit = priceUnitMatch[3].trim();

  const serviceId = generateId(title);
  
  let subcategoryTitle = foundCatKey + ' Services';
  if (title.toLowerCase().includes('installation')) {
     subcategoryTitle = foundCatKey + ' Installation';
  } else if (title.toLowerCase().includes('repair')) {
     subcategoryTitle = foundCatKey + ' Repair';
  }
  let subcategoryId = generateId(subcategoryTitle);

  if (!subcategoryCache.has(subcategoryId)) {
    subcategoryCache.add(subcategoryId);
    subcategoriesToInsert.push({
      id: subcategoryId,
      categoryId: category,
      title: subcategoryTitle,
      description: subcategoryTitle + ' and related work'
    });
  }

  parsedServices.push({
    id: serviceId,
    categoryId: category,
    subcategoryId: subcategoryId,
    imageFile: url,
    publicFile: url,
    title: title,
    description: 'Professional ' + title.toLowerCase() + ' service.',
    detailDescription: 'Includes ' + title.toLowerCase() + ' with standard pricing: Rs ' + price + ' per ' + unit.toLowerCase() + '.',
    price: price,
    originalPrice: Math.round(price * 1.2),
    duration: '45-90 min',
    rating: 4.8,
    reviews: Math.floor(Math.random() * 500) + 10,
    badge: 'New',
    serviceType: 'Standard Service',
    includes: [
      title,
      'Site inspection',
      'Standard tools usage'
    ],
    details: [
      'Technician visits the site',
      'Inspects the requirements',
      'Provides service'
    ],
    excludes: [
      'Major spare parts',
      'Extra civil work'
    ]
  });
}

const seedFilePath = path.join(__dirname, 'serviceSeed.js');
let seedCode = fs.readFileSync(seedFilePath, 'utf8');

// Image logic manually patched

// 3. Inject new categories
const newCategories = [
  { id: 'painters', title: 'Painters', subtitle: 'Wall painting, polishing and texture works', icon: 'format-paint', tint: '#D97706' },
  { id: 'carpenter', title: 'Carpenter', subtitle: 'Furniture, doors, locks and cabinets', icon: 'hammer', tint: '#92400E' },
  { id: 'welder-fabricator', title: 'Welder & Fabricator', subtitle: 'Gate, grill, glass and ceiling works', icon: 'anvil', tint: '#4B5563' },
  { id: 'cctv', title: 'CCTV Services', subtitle: 'Installation and maintenance of cameras', icon: 'cctv', tint: '#1E3A8A' }
];

let catIndex = seedCode.indexOf('const categories = [');
if (catIndex > -1) {
  let catEnd = seedCode.indexOf('];', catIndex);
  let existingCats = seedCode.substring(catIndex + 20, catEnd);
  for (const cat of newCategories) {
    existingCats += ',\n  {\n' + 
    '    id: "' + cat.id + '",\n' +
    '    title: "' + cat.title + '",\n' +
    '    subtitle: "' + cat.subtitle + '",\n' +
    '    icon: "' + cat.icon + '",\n' +
    '    tint: "' + cat.tint + '"\n' +
    '  }';
  }
  seedCode = seedCode.substring(0, catIndex) + 'const categories = [' + existingCats + '\n];' + seedCode.substring(catEnd + 2);
}

// 4. Inject subcategories
let subcatIndex = seedCode.indexOf('const subcategories = [');
if (subcatIndex > -1) {
  let subcatEnd = seedCode.indexOf('];', subcatIndex);
  let existingSubcats = seedCode.substring(subcatIndex + 23, subcatEnd);
  for (const subcat of subcategoriesToInsert) {
    existingSubcats += ',\n  {\n' +
    '    id: "' + subcat.id + '",\n' +
    '    categoryId: "' + subcat.categoryId + '",\n' +
    '    title: "' + subcat.title + '",\n' +
    '    description: "' + subcat.description + '"\n' +
    '  }';
  }
  seedCode = seedCode.substring(0, subcatIndex) + 'const subcategories = [' + existingSubcats + '\n];' + seedCode.substring(subcatEnd + 2);
}

// 5. Inject services
let svcIndex = seedCode.indexOf('const services = [');
if (svcIndex > -1) {
  let svcEnd = seedCode.indexOf('];', svcIndex);
  let existingSvcs = seedCode.substring(svcIndex + 18, svcEnd);
  if (!existingSvcs.includes('Single Phase Breaker Replacement')) {
    for (const svc of parsedServices) {
      existingSvcs += ',\n  {\n' +
      '      id: "' + svc.id + '",\n' +
      '      categoryId: "' + svc.categoryId + '",\n' +
      '      subcategoryId: "' + svc.subcategoryId + '",\n' +
      '      imageFile: "' + svc.imageFile + '",\n' +
      '      publicFile: "' + svc.publicFile + '",\n' +
      '      title: "' + svc.title + '",\n' +
      '      description: "' + svc.description + '",\n' +
      '      detailDescription: "' + svc.detailDescription + '",\n' +
      '      price: ' + svc.price + ',\n' +
      '      originalPrice: ' + svc.originalPrice + ',\n' +
      '      duration: "' + svc.duration + '",\n' +
      '      rating: ' + svc.rating + ',\n' +
      '      reviews: ' + svc.reviews + ',\n' +
      '      badge: "' + svc.badge + '",\n' +
      '      serviceType: "' + svc.serviceType + '",\n' +
      '      includes: ' + JSON.stringify(svc.includes) + ',\n' +
      '      details: ' + JSON.stringify(svc.details) + ',\n' +
      '      excludes: ' + JSON.stringify(svc.excludes) + '\n' +
      '    }';
    }
    seedCode = seedCode.substring(0, svcIndex) + 'const services = [' + existingSvcs + '\n];' + seedCode.substring(svcEnd + 2);
  }
}

fs.writeFileSync(seedFilePath, seedCode, 'utf8');
console.log('Successfully patched serviceSeed.js');
