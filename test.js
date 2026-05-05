const axios = require('axios');

// Test URL
const testUrl = 'https://kenh14.vn/dau-ai-ngo-o-met-gala-lisa-blackpink-dung-mat-ban-trai-tin-don-chi-6-giay-tuong-tac-thoi-da-du-gay-chu-y-215260505102013763.chn';

async function test() {
    try {
        console.log('🔍 Testing scraper...\n');
        
        const response = await axios.post('http://localhost:3000/api/scrape', {
            url: testUrl
        });

        if (response.data.success) {
            console.log('✅ SUCCESS!\n');
            console.log('📌 Title:', response.data.title);
            console.log('📊 Characters:', response.data.charCount);
            console.log('📝 Words:', response.data.wordCount);
            console.log('\n📄 Content preview (first 200 chars):');
            console.log(response.data.content.substring(0, 200) + '...\n');
        } else {
            console.log('❌ Error:', response.data.error);
        }
    } catch (error) {
        console.log('❌ Connection failed:', error.message);
        console.log('\n💡 Make sure server is running: npm start');
    }
}

test();
