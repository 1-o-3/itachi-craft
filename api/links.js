const { sql } = require('@vercel/postgres');

const initialData = [
    {
        id: 1,
        title: "Duck Race Game",
        url: "../duck-race/index.html",
        category: "game",
        desc: "アヒルたちの白熱したレース！誰が一番早いか予想してコインを増やそう。レトロなCRT風エフェクトが特徴です。",
        image: "https://images.unsplash.com/photo-1541675154750-0444c7d51e8e?auto=format&fit=crop&w=400&q=80",
        updatedAt: new Date().toISOString()
    },
    {
        id: 2,
        title: "Retro Pomodoro",
        url: "../PomoTimer/index.html",
        category: "tool",
        desc: "シンプルかつ高機能なポモドーロタイマー。集中時間をカスタマイズして効率的に作業を進めましょう。",
        image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80",
        updatedAt: new Date().toISOString()
    },
    {
        id: 3,
        title: "Itachi Art Collection",
        url: "https://twitter.com/hashtag/いたちくらふと",
        category: "art",
        desc: "SNSで公開しているいたちキャラクターのアートワーク集です。最新の投稿はこちらからチェック！",
        image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=400&q=80",
        updatedAt: new Date().toISOString()
    },
    {
        id: 4,
        title: "Creative Tools v1",
        url: "#",
        category: "tool",
        desc: "開発を便利にする小道具たちの詰め合わせ。現在制作中の最新バージョンです。",
        image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=80",
        updatedAt: new Date().toISOString()
    }
];

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // テーブルがなければ作成
        await sql`
            CREATE TABLE IF NOT EXISTS itachi_links (
                id BIGINT PRIMARY KEY,
                title TEXT NOT NULL,
                url TEXT NOT NULL,
                category TEXT,
                description TEXT,
                image TEXT,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;

        if (req.method === 'GET') {
            const result = await sql`SELECT * FROM itachi_links ORDER BY id DESC;`;
            let links = result.rows.map(row => ({
                id: Number(row.id),
                title: row.title,
                url: row.url,
                category: row.category,
                desc: row.description,
                image: row.image,
                updatedAt: row.updated_at
            }));

            // データが空の場合は初期データを投入
            if (links.length === 0) {
                for (const item of initialData) {
                    await sql`
                        INSERT INTO itachi_links (id, title, url, category, description, image, updated_at)
                        VALUES (${item.id}, ${item.title}, ${item.url}, ${item.category}, ${item.desc}, ${item.image}, ${item.updatedAt});
                    `;
                }
                // 投入後のデータを再取得
                const freshResult = await sql`SELECT * FROM itachi_links ORDER BY id DESC;`;
                links = freshResult.rows.map(row => ({
                    id: Number(row.id),
                    title: row.title,
                    url: row.url,
                    category: row.category,
                    desc: row.description,
                    image: row.image,
                    updatedAt: row.updated_at
                }));
            }

            return res.status(200).json({ links });
        }

        if (req.method === 'POST') {
            const { links } = req.body;
            if (!Array.isArray(links)) {
                return res.status(400).json({ error: 'links must be an array' });
            }

            // シンプルに全削除して再投入（順序と整合性を維持）
            await sql`DELETE FROM itachi_links;`;
            for (const link of links) {
                await sql`
                    INSERT INTO itachi_links (id, title, url, category, description, image, updated_at)
                    VALUES (${link.id}, ${link.title}, ${link.url}, ${link.category}, ${link.desc}, ${link.image}, ${link.updatedAt || new Date().toISOString()});
                `;
            }
            return res.status(200).json({ ok: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Database Error:', error);
        return res.status(500).json({ error: error.message });
    }
};
