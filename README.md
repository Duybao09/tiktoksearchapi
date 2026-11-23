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
