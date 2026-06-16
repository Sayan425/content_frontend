async function test() {
    const url = 'https://www.pexels.com/video/sunlight-radiates-through-forest-canopy-36798460/';
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' } });
    const html = await res.text();
    console.log(html.substring(0, 500));
    const match = html.match(/https:\/\/[^"']+\.mp4[^"']*/g);
    console.log("Matches:", match ? match.slice(0, 3) : null);
}
test();
