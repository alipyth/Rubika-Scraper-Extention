// دریافت پیام از popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "start") {
        startScraping(request.targetCount);
    }
});

// تابع پاکسازی متن (حفظ علائم نگارشی، حذف اموجی و هشتگ)
function cleanText(text) {
    if (!text) return "";
    let cleaned = text.replace(/[\u{1F600}-\u{1F6FF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
    cleaned = cleaned.replace(/#\S+/g, '');
    return cleaned.replace(/\s+/g, ' ').trim();
}

async function startScraping(targetCount) {
    console.log(`شروع استخراج ${targetCount} خبر...`);
    let collectedData = new Map();
    let zip = new JSZip();
    let textFolder = zip.folder("texts");
    let imgFolder = zip.folder("images");
    
    // سلکتور کاربر برای پیدا کردن باکس اسکرول
    let scrollableDiv = document.querySelector("tab-conversation div.bubbles > div > div > div:nth-child(2)") || document.querySelector(".bubbles"); 
    
    if (!scrollableDiv) {
        alert("باکس اسکرول پیدا نشد! مطمئن شوید داخل کانال هستید.");
        return;
    }

    let currentCount = 0;
    let stuckCounter = 0; // برای جلوگیری از گیر کردن در حلقه بی‌نهایت

    while (currentCount < targetCount) {
        // پیدا کردن همه پیام‌های روی صفحه
        let messages = document.querySelectorAll(".message-wrapper, .message");
        let addedInThisCycle = 0;
        
        for (let i = messages.length - 1; i >= 0; i--) { // بررسی از پایین به بالا
            let msg = messages[i];
            let textElement = msg.querySelector("strong") || msg.querySelector(".message-text") || msg.querySelector(".text-content") || msg.querySelector("span[dir='auto']"); 
            let imgElement = msg.querySelector("img");
            
            let rawText = textElement ? textElement.innerText : "";
            let cleanedText = cleanText(rawText);
            
            if (cleanedText && !collectedData.has(cleanedText)) {
                let id = currentCount + 1;
                collectedData.set(cleanedText, true);
                addedInThisCycle++;
                
                textFolder.file(`news_${id}.txt`, cleanedText);
                
                if (imgElement && (imgElement.src.startsWith("blob:") || imgElement.src.startsWith("http"))) {
                    try {
                        let response = await fetch(imgElement.src);
                        let blob = await response.blob();
                        imgFolder.file(`image_${id}.jpg`, blob);
                    } catch (e) {
                        console.log("خطا در دانلود عکس: ", e);
                    }
                }
                
                currentCount++;
                if (currentCount >= targetCount) break;
            }
        }

        console.log(`استخراج شد: ${currentCount} از ${targetCount}`);

        if (currentCount >= targetCount) break;

        // اگر هیچ پیام جدیدی در این چرخه پیدا نشد، شمارشگر گیر کردن را اضافه کن
        if (addedInThisCycle === 0) {
            stuckCounter++;
        } else {
            stuckCounter = 0;
        }

        // اگر 5 بار تلاش کرد و پیام جدیدی لود نشد (احتمالاً به اول کانال رسیدیم)، توقف کن
        if (stuckCounter > 5) {
            console.log("پیام جدیدی یافت نشد یا به ابتدای کانال رسیدیم.");
            break;
        }

        // --- عملیات اسکرول معکوس (به سمت قدیمی‌ترین پیام‌ها در بالا) ---
        if (messages.length > 0) {
            // اسکرول روی اولین پیام (قدیمی‌ترین پیام موجود در صفحه) تا پیام‌های قبلی لود شوند
            messages[0].scrollIntoView({ behavior: "smooth", block: "start" });
        }
        // اطمینان از اسکرول باکس به بالاترین نقطه
        scrollableDiv.scrollTop = 0;
        
        // صبر کردن برای لود شدن پیام‌های قدیمی (3 ثانیه برای روبیکا مناسب است)
        await new Promise(r => setTimeout(r, 3000));
    }

    console.log("در حال ساخت فایل Zip...");
    zip.generateAsync({ type: "blob" }).then(function (content) {
        let link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `rubika_${currentCount}_news.zip`;
        link.click();
        alert(`عملیات تمام شد. ${currentCount} خبر استخراج شد.`);
    });
}
