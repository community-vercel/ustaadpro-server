import { 
    getCategories, 
    getServicesForCategory, 
    resolveCategory, 
    buildCategoryMenu, 
    buildServicesMenu, 
    buildOptionsMenu 
} from './services/whatsappService.js';
import Service from './models/Service.js';
import Category from './models/Category.js';
import Booking from './models/botBooking.js';
import pool from './config/db.js';

async function runTests() {
    console.log('🧪 Starting WhatsApp Bot DB Services Test Suite...\n');

    try {
        // ── Test 1: Categories from DB ──
        console.log('▶ Test 1: getCategories()');
        const categories = await getCategories();
        console.log('Categories fetched from DB:', categories);
        if (!categories || categories.length === 0) throw new Error('Failed to get categories');
        console.log('✅ Test 1 Passed! Categories count:', categories.length);

        // ── Test 2: Resolve Category ──
        console.log('\n▶ Test 2: resolveCategory()');
        const resolvedByNum = resolveCategory(categories, '2');
        console.log('Resolved option "2":', resolvedByNum);
        const resolvedByText = resolveCategory(categories, 'electrician');
        console.log('Resolved text "electrician":', resolvedByText);
        if (!resolvedByNum || !resolvedByText) throw new Error('Failed to resolve category');
        console.log('✅ Test 2 Passed!');

        // ── Test 3: Category Menu ──
        console.log('\n▶ Test 3: buildCategoryMenu()');
        const categoryMenu = buildCategoryMenu(categories);
        console.log('Category Menu:\n' + categoryMenu);
        console.log('✅ Test 3 Passed!');

        // ── Test 4: Services for Category ──
        console.log('\n▶ Test 4: getServicesForCategory("AC Services")');
        const acServices = await getServicesForCategory('AC Services');
        console.log('AC Services keys:', Object.keys(acServices));
        console.log('AC Service 1:', acServices['1']);
        if (!acServices['1']) throw new Error('No AC services returned');
        console.log('✅ Test 4 Passed!');

        // ── Test 5: Services Menu ──
        console.log('\n▶ Test 5: buildServicesMenu()');
        const servicesMenu = buildServicesMenu(acServices);
        console.log('Services Menu:\n' + servicesMenu);
        console.log('✅ Test 5 Passed!');

        // ── Test 6: Options Menu ──
        console.log('\n▶ Test 6: buildOptionsMenu()');
        const optionsMenu = buildOptionsMenu(acServices['1']);
        console.log('Options Menu:\n' + optionsMenu);
        console.log('✅ Test 6 Passed!');

        // ── Test 7: Simulated 8-step Booking Flow ──
        console.log('\n▶ Test 7: Simulating full booking flow from DB data');
        const testUserId = '923001234567@c.us';
        
        // Step 1: Greeting -> get categories
        const cats = await getCategories();
        const selectedCat = resolveCategory(cats, '1'); // Select AC Services
        
        // Step 2: Get services for selected category
        const svcs = await getServicesForCategory(selectedCat);
        const selectedSvc = svcs['1']; // Select first service
        
        // Step 3: Select option
        const selectedOption = selectedSvc.options['1']; // Select first option
        
        // Step 4-8: Collect Order Details
        const orderDetails = {
            mainCategory: selectedCat,
            serviceType: selectedSvc.name,
            subService: selectedOption,
            date: '25 August 2026',
            time: '10:00 AM',
            customerPhone: '03001234567',
            address: 'House 123, Street 4, Sector F-8, Islamabad',
            addressType: 'text',
            hasImage: 'No Picture',
            imageData: null,
            imageMime: null
        };
        
        console.log('Order Details to save:', orderDetails);
        const createdBooking = await Booking.create(testUserId, orderDetails);
        const bookingId = createdBooking.id;
        console.log('Created Booking in DB with ID:', bookingId);
        
        const bookingRecord = await Booking.findById(bookingId);
        console.log('Fetched Booking Record:', {
            id: bookingRecord.id,
            user_id: bookingRecord.user_id,
            main_category: bookingRecord.main_category,
            service_type: bookingRecord.service_type,
            sub_service: bookingRecord.sub_service,
            status: bookingRecord.status
        });
        
        if (!bookingRecord || bookingRecord.main_category !== selectedCat) {
            throw new Error('Booking verification failed');
        }
        console.log('✅ Test 7 Passed! End-to-end booking flow created successfully in DB.');

        // Clean up test booking
        await Booking.delete(bookingId);
        console.log('Cleaned up test booking.');

        console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! Database services integration is verified.');
    } catch (err) {
        console.error('❌ Test failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

runTests();
