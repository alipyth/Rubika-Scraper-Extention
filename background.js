importScripts("jszip.min.js");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "downloadZip") {
    const zip = new JSZip();
    const imgFolder = zip.folder("images");
    let mergedText = "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ\n\nلیست تمامی خبرهای استخراج شده:\n\n";
    
    const fetchPromises = [];

    request.data.forEach((item, index) => {
      const newsNumber = index + 1;
      
      // 1. ایجاد فایل متنی تکی
      if (item.text) {
        zip.file(`news_${newsNumber}.txt`, item.text);
        
        // 2. اضافه کردن به فایل ادغام شده
        mergedText += `================= خبر ${newsNumber} =================\n`;
        mergedText += `${item.text}\n\n`;
      }

      // 3. دانلود عکس‌ها
      if (item.imageUrls && item.imageUrls.length > 0) {
        item.imageUrls.forEach((url, imgIndex) => {
          if (!url) return;
          
          // تمیز کردن آدرس عکس (در صورت وجود url("...") در background-image)
          const cleanUrl = url.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
          
          if(cleanUrl.startsWith('http') || cleanUrl.startsWith('blob')) {
             const p = fetch(cleanUrl)
              .then((response) => {
                if (!response.ok) throw new Error("Network error");
                return response.blob();
              })
              .then((blob) => {
                imgFolder.file(`image_${newsNumber}_${imgIndex + 1}.jpg`, blob);
              })
              .catch((err) => console.warn(`خطا در دانلود عکس خبر ${newsNumber}:`, err));
             fetchPromises.push(p);
          }
        });
      }
    });

    // اضافه کردن فایل ادغام شده نهایی به فایل زیپ
    zip.file("all_news_merged.txt", mergedText);

    // صبر برای اتمام دانلود تمامی عکس‌ها و سپس ساخت فایل زیپ
    Promise.allSettled(fetchPromises).then(() => {
      zip.generateAsync({ type: "blob" }).then((content) => {
        const reader = new FileReader();
        reader.onloadend = function () {
          chrome.downloads.download({
            url: reader.result,
            filename: `rubika_${request.data.length}_news.zip`,
            saveAs: true
          });
        };
        reader.readAsDataURL(content);
      });
    });
  }
});
