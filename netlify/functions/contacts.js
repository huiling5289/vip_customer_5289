const { createClient } = require('@supabase/supabase-js');

exports.handler = async () => {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: '後端尚未設定 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' }),
        };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    try {
        // Supabase 單次查詢預設最多只會回傳 1000 筆，資料量一旦超過就會被悄悄截斷。
        // 這裡用 .range() 分批抓取，直到抓不到新資料為止，確保幾千筆、幾萬筆都能完整取回。
        const PAGE_SIZE = 1000;
        let allRows = [];
        let from = 0;

        while (true) {
            const to = from + PAGE_SIZE - 1;
            const { data, error } = await supabase
                .from('contacts')
                .select('data')
                .order('id', { ascending: true })
                .range(from, to);

            if (error) {
                throw error;
            }

            if (!data || data.length === 0) {
                break;
            }

            allRows = allRows.concat(data);

            if (data.length < PAGE_SIZE) {
                break; // 這一批不滿 1000 筆，代表已經是最後一批
            }

            from += PAGE_SIZE;
        }

        // 資料庫每一列存的是 { data: {...這一筆聯絡人的完整欄位...} }，這裡把它攤平成陣列
        const contacts = allRows.map(row => row.data);

        return {
            statusCode: 200,
            body: JSON.stringify(contacts),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: '讀取資料失敗，請確認資料庫設定是否正確' }),
        };
    }
};
