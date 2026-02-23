import { kv } from '@vercel/kv';

const KV_KEY = 'itachi_links';

// Initial sample data (used only when KV is empty)
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

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        // リンク一覧を取得
        let links = await kv.get(KV_KEY);
        if (!links) {
            // 初回は initialData を保存
            links = initialData;
            await kv.set(KV_KEY, links);
        }
        return res.status(200).json({ links });
    }

    if (req.method === 'POST') {
        // 全リンクを上書き保存
        const { links } = req.body;
        if (!Array.isArray(links)) {
            return res.status(400).json({ error: 'links must be an array' });
        }
        await kv.set(KV_KEY, links);
        return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
