importScripts("jszip.min.js");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "downloadZip") {
    const zip = new JSZip();
    let mergedText = "لیست تمامی خبرهای استخراج شده:\n\n";

    request.data.forEach((item, index) => {
      const newsNumber = index + 1;
      
      if (item.text) {
        // ۱. ساخت فایل متنی تکی برای هر خبر
        zip.file(`news_${newsNumber}.txt`, item.text);
        
        // ۲. اضافه کردن متن به فایل ادغام شده
        mergedText += `================= خبر ${newsNumber} =================\n`;
        mergedText += `${item.text}\n\n`;
      }
    });

    // اضافه کردن فایل ادغام شده نهایی به فایل زیپ
    zip.file("all_news_merged.txt", mergedText);

    // تولید فایل زیپ و دانلود آن
    zip.generateAsync({ type: "blob" }).then((content) => {
      const reader = new FileReader();
      reader.onloadend = function () {
        chrome.downloads.download({
          url: reader.result,
          filename: `rubika_texts_${request.data.length}_news.zip`,
          saveAs: true
        });
      };
      reader.readAsDataURL(content);
    });
  }
});
