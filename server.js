// tiktok-search-api.js — API search video TikTok qua TikWM
// Cơ cấu giống các API TikTok trước đây: check apikey -> /tiktok?q= -> /tiktok?select=
// Nguồn: https://www.tikwm.com/api/feed/search (không cần key TikWM)
const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// ====== API KEY CỦA BẠN ======
const API_KEY = "duybao095"; // đổi key tại đây

// ====== NGUỒN TIKWM ======
const TIKWM_SEARCH = "https://www.tikwm.com/api/feed/search";

// ====== CACHE: { user: { videos, time } } ======
const CACHE = {};
const CACHE_TTL = 10 * 60 * 1000; // 10 phút

// ====== MIDDLEWARE CHECK KEY ======
function checkKey(req, res, next) {
  const key = req.query.apikey;
  if (!key) return res.json({ error: "Thiếu apikey" });
  if (key !== API_KEY) return res.json({ error: "API key không hợp lệ" });
  next();
}

// ====== GỌI TIKWM SEARCH ======
async function searchTikwm(keywords, count, cursor) {
  const response = await axios.get(TIKWM_SEARCH, {
    params: { keywords, count, cursor },
    timeout: 20000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Referer: "https://www.tikwm.com/",
      Accept: "application/json, text/plain, */*",
    },
    validateStatus: () => true, // tự xử lý status, không throw
  });

  const body = response.data;

  // TikWM bị Cloudflare chặn sẽ trả về trang HTML thay vì JSON
  if (
    typeof body === "string" ||
    String(response.headers["content-type"] || "").includes("text/html")
  ) {
    throw new Error("TikWM đang chặn Cloudflare, thử lại sau");
  }

  if (!body || body.code !== 0) {
    throw new Error((body && body.msg) || "TikWM trả lỗi");
  }

  // data có thể là array trực tiếp hoặc object { videos: [...] }
  const list = Array.isArray(body.data) ? body.data : body.data?.videos || [];

  return {
    videos: list,
    next_cursor: body.cursor ?? body.data?.cursor ?? null,
    has_more: body.hasMore ?? body.data?.hasMore ?? false,
  };
}

// ====== CHUẨN HOÁ VIDEO (giữ đúng dạng các API TikTok trước đây) ======
// TikWM feed/search trả thật (đã kiểm chứng 23/11):
// data = { videos: [...], cursor, hasMore }; video có video_id (KHÔNG có id),
// play + wmplay (KHÔNG có hdplay) — nên id lấy video_id, mp4_hd rơi về play.
function toListItem(v, i) {
  return {
    number: i + 1,
    id: v.video_id || v.id,
    title: v.title || "Không tiêu đề",
    author: v.author?.nickname || "",
    views: v.play_count || 0,
    likes: v.digg_count || 0,
    duration: v.duration || 0,
    cover: v.cover || "",
  };
}

function toDetail(v) {
  return {
    id: v.video_id || v.id,
    title: v.title || "Không tiêu đề",
    author: v.author?.nickname || "",
    author_id: v.author?.unique_id || "",
    author_avatar: v.author?.avatar || "",
    region: v.region || "",
    views: v.play_count || 0,
    likes: v.digg_count || 0,
    comments: v.comment_count || 0,
    shares: v.share_count || 0,
    duration: v.duration || 0,
    create_time: v.create_time || 0,
    mp4: v.play || "",
    mp4_hd: v.hdplay || v.play || "",
    mp4_wm: v.wmplay || "",
    thumbnail: v.cover || "",
  };
}

// ====== ROUTE CHÍNH ======
app.get("/tiktok", checkKey, async (req, res) => {
  const q = (req.query.q || "").trim();
  const select = req.query.select;
  const user = req.query.user || req.ip;
  const count = Math.min(Math.max(parseInt(req.query.count) || 10, 1), 20);
  const cursor = req.query.cursor || "0";

  try {
    // ===== CHỌN SỐ (lấy từ cache lần tìm trước) =====
    if (select) {
      const cached = CACHE[user];
      if (!cached || Date.now() - cached.time > CACHE_TTL) {
        delete CACHE[user];
        return res.json({ error: "Bạn chưa tìm video" });
      }

      const index = parseInt(select) - 1;
      const video = cached.videos[index];
      if (!video) return res.json({ error: "Số không hợp lệ" });

      return res.json(toDetail(video));
    }

    // ===== TÌM KIẾM =====
    if (!q) return res.json({ error: "Thiếu từ khóa q" });

    const { videos, next_cursor, has_more } = await searchTikwm(q, count, cursor);

    if (!videos.length) return res.json({ error: "Không có dữ liệu" });

    CACHE[user] = { videos, time: Date.now() };

    res.json({
      result: videos.map(toListItem),
      next_cursor,
      has_more,
      note: "Dùng &select=1 để lấy video",
    });
  } catch (err) {
    res.json({ error: err.message || "Lỗi hệ thống" });
  }
});

// ====== HEALTH CHECK ======
app.get("/", (req, res) => res.json({ status: "ok" }));

if (require.main === module) {
  app.listen(PORT, () => {
    console.log("API chạy cổng " + PORT);
  });
}

module.exports = { app, searchTikwm, toListItem, toDetail };
