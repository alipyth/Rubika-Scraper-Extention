document.getElementById("startBtn").addEventListener("click", async () => {
    let countInput = document.getElementById("newsCount").value;
    let count = parseInt(countInput);
    
    if (isNaN(count) || count <= 0) {
        alert("لطفا یک عدد معتبر وارد کنید.");
        return;
    }

    document.getElementById("status").innerText = "در حال تزریق کدها...";

    // پیدا کردن تب فعال (روبیکا)
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab.url.includes("web.rubika.ir")) {
        // تزریق کتابخانه JSZip و اسکریپت اصلی به صفحه
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["jszip.min.js", "content.js"]
        });

        // ارسال تعداد به content.js برای شروع
        chrome.tabs.sendMessage(tab.id, { action: "start", targetCount: count });
        document.getElementById("status").innerText = "استخراج شروع شد! پنجره را نبندید.";
    } else {
        document.getElementById("status").innerText = "لطفا ابتدا سایت روبیکا را باز کنید.";
        document.getElementById("status").style.color = "red";
    }
});
