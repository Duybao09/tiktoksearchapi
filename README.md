# TikTok Search API (qua TikWM)

## Chạy

```
npm install
npm start
```

Mặc định chạy cổng 3000 (đổi bằng biến môi trường `PORT`).

## Dùng

Tìm kiếm (trả về list 10 video):

```
http://localhost:3000/tiktok?apikey=duybao095&q=meo
```

Lấy video số N trong list vừa tìm (phải search trước, cache theo IP, hết hạn sau 10 phút):

```
http://localhost:3000/tiktok?apikey=duybao095&select=1
```

Lật trang: thêm `&cursor=<next_cursor>` (giá trị `next_cursor` trả về ở lần tìm trước).
Lấy nhiều/ít video hơn: thêm `&count=20` (tối đa 20).

Đổi API key trong `server.js` (dòng `API_KEY`).

## Lưu ý

- Nguồn: `https://www.tikwm.com/api/feed/search` (không cần key TikWM).
- TikWM có chặn Cloudflare với IP datacenter — nếu chạy trên host free (Render/Koyeb...) mà trả lỗi
  "TikWM đang chặn Cloudflare" thì chạy trên VPS IP Việt Nam sẽ qua được.
- V2 (23/11): sửa mapping theo JSON thật — `data` là object `{ videos, cursor, hasMore }`,
  id video lấy từ `video_id`, `mp4_hd` rơi về `play` vì feed/search không trả `hdplay`.

## Deploy lên Cloudflare Workers (free 100.000 request/ngày)

Code Express chạy được trên Workers nhờ `src/index.js` + `wrangler.jsonc` (cờ `nodejs_compat`,
không cần sửa `server.js`).

**Cách 1 — bằng lệnh (nhanh nhất):**

```
npm install
npx wrangler login
npx wrangler deploy
```

Wrangler in ra link dạng `https://tiktok-search-api.<tên-bn>.workers.dev` — test luôn:

```
https://tiktok-search-api.<tên-bn>.workers.dev/tiktok?apikey=duybao095&q=meo
```

**Cách 2 — trên web dash.cloudflare.com:**

1. Đẩy code lên GitHub (repo mới, up hết file trong zip này, không up `node_modules`).
2. Vào dash.cloudflare.com → Workers & Pages → Create → Worker → Import a repository → chọn repo.
3. Cloudflare tự đọc `wrangler.jsonc` rồi build + deploy, xong nó cấp link `*.workers.dev` như trên.

**Lưu ý riêng khi chạy trên Workers:**

- Cache `select` nằm trong RAM của từng máy chạy (isolate) — Cloudflare không đảm bảo 2 lần gọi
  liên tiếp vào cùng 1 máy, nên thỉnh thoảng `select` có thể báo "Bạn chưa tìm video" dù vừa search.
  Gặp hoài thì bảo mình, mình chuyển cache sang KV cho chắc.
- TikWM có thể chặn IP của Cloudflare (vì tikwm cũng dùng Cloudflare) — deploy xong test link
  `?q=meo` trước, nếu nó trả lỗi Cloudflare thì chạy trên VPS mới được.
