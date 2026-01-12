// Global variables
let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let stream = null;
let isProcessing = false;
let currentMode = 'ocr'; // 'ocr' or 'qr'

// DOM elements
const startCameraBtn = document.getElementById('startCamera');
const captureBtn = document.getElementById('capture');
const stopCameraBtn = document.getElementById('stopCamera');
const ocrModeBtn = document.getElementById('ocrMode');
const qrModeBtn = document.getElementById('qrMode');
const ocrInfoDiv = document.getElementById('ocrInfo');
const qrInfoDiv = document.getElementById('qrInfo');
const statusDiv = document.getElementById('status');
const batchResultDiv = document.getElementById('batchResult');
const rawTextArea = document.getElementById('rawText');
const rawTextTitle = document.getElementById('rawTextTitle');
const qrUrlInput = document.getElementById('qrUrlInput');
const processQRBtn = document.getElementById('processQR');
const clearQRBtn = document.getElementById('clearQR');

// Initialize Tesseract worker
let worker = null;

// Mode switching functions
function switchToMode(mode) {
    if (currentMode === mode) return;

    currentMode = mode;

    // Update button states
    ocrModeBtn.classList.toggle('active', mode === 'ocr');
    qrModeBtn.classList.toggle('active', mode === 'qr');

    // Update UI visibility
    ocrInfoDiv.style.display = mode === 'ocr' ? 'block' : 'none';
    qrInfoDiv.style.display = mode === 'qr' ? 'block' : 'none';
    document.getElementById('ocrControls').style.display = mode === 'ocr' ? 'block' : 'none';
    document.getElementById('qrControls').style.display = mode === 'qr' ? 'block' : 'none';
    rawTextTitle.textContent = mode === 'ocr' ? '原始識別文字：' : '網址內容：';

    // Stop any ongoing scanning
    stopScanning();

    // Update status
    if (stream) {
        statusDiv.textContent = mode === 'ocr'
            ? 'OCR模式已啟動，請將貨物對準畫面並點擊拍攝按鈕'
            : 'QR碼模式已啟動，請將二維碼對準畫面，系統將自動掃描';
        statusDiv.className = 'status success';
    } else {
        statusDiv.textContent = mode === 'ocr'
            ? '請先啟動攝像頭'
            : '請先啟動攝像頭以開始QR碼掃描';
        statusDiv.className = 'status';
    }
}

function stopScanning() {
    // No QR scanner to stop in the new implementation
    isProcessing = false;
    captureBtn.disabled = currentMode === 'ocr' && stream;
}

// QR Code processing functions
async function processQRUrl() {
    const url = qrUrlInput.value.trim();
    if (!url) {
        statusDiv.textContent = '請輸入QR碼網址';
        statusDiv.className = 'status error';
        return;
    }

    if (isProcessing) return;

    isProcessing = true;
    processQRBtn.disabled = true;
    statusDiv.textContent = '正在訪問網址並提取批次號...';
    statusDiv.className = 'status processing';

    try {
        console.log('开始处理URL:', url);
        // Fetch URL and extract batch server-side (optimized)
        const response = await fetch('/api/extract_batch_from_url?url=' + encodeURIComponent(url));
        console.log('API响应状态:', response.status);

        if (!response.ok) {
            throw new Error('無法訪問網址：' + response.status);
        }

        const data = await response.json();
        console.log('API返回数据:', data);
        await processQROptimizedResult(data);

    } catch (error) {
        console.error('Error processing QR URL:', error);
        statusDiv.textContent = '處理失敗：' + error.message;
        statusDiv.className = 'status error';
        batchResultDiv.innerHTML = '<div style="color: #dc3545;">處理失敗，請檢查：<br>• URL格式是否正確<br>• 網路連線是否正常<br>• 目標網站是否可訪問</div>';
        rawTextArea.value = `錯誤詳情：\n${error.message}\n\n請檢查：\n1. URL是否正確\n2. 網路連線是否正常\n3. 目標網站是否允許訪問`;
    } finally {
        isProcessing = false;
        processQRBtn.disabled = false;
    }
}

function clearQRInput() {
    qrUrlInput.value = '';
    batchResultDiv.innerHTML = '';
    rawTextArea.value = '';
    statusDiv.textContent = '已清除輸入，請重新掃描QR碼';
    statusDiv.className = 'status';
}

async function processQROptimizedResult(data) {
    if (isProcessing) return;

    isProcessing = true;
    statusDiv.textContent = '處理QR碼結果...';
    statusDiv.className = 'status processing';

    try {
        if (data.batch_found) {
            const batchNumber = data.batch_number;
            const productInfo = data.product_info;

            if (productInfo && productInfo.found) {
                batchResultDiv.innerHTML = `
                    <div style="margin-bottom: 10px;">
                        <strong>批次號：</strong>${batchNumber}
                    </div>
                    <div style="color: #28a745; margin-bottom: 10px;">
                        <strong>產品名稱：</strong>${productInfo.name}
                    </div>
                    <div style="color: #007bff; margin-bottom: 10px;">
                        <strong>唯一編號：</strong>${productInfo.unique_code}
                    </div>
                    <div style="color: #6c757d;">
                        <strong>產品代碼：</strong>${productInfo.product_code}
                    </div>
                `;
            } else {
                batchResultDiv.innerHTML = `
                    <div>
                        <strong>批次號：</strong>${batchNumber}
                    </div>
                    <div style="color: #ffc107; margin-top: 5px;">
                        此批次號尚未在產品資料庫中註冊
                    </div>
                `;
            }

            batchResultDiv.style.color = '#155724';
            statusDiv.textContent = '批次號識別成功！';
            statusDiv.className = 'status success';

            // Display content preview in raw text area
            rawTextArea.value = `--- 網址內容預覽 ---\n\n${data.content_preview}\n\n--- 提取的批次號 ---\n\n${batchNumber}`;

        } else {
            batchResultDiv.innerHTML = '<div>網址內容中未找到有效的批次號</div>';
            batchResultDiv.style.color = '#721c24';
            statusDiv.textContent = '處理完成，但未找到有效的批次號';
            statusDiv.className = 'status error';
            rawTextArea.value = `--- 網址內容預覽 ---\n\n${data.content_preview}\n\n--- 處理結果 ---\n\n未找到有效的批次號`;
        }

    } catch (error) {
        console.error('Error processing optimized QR result:', error);
        statusDiv.textContent = '處理QR碼時發生錯誤：' + error.message;
        statusDiv.className = 'status error';
        batchResultDiv.textContent = '';
        rawTextArea.value = '';
    } finally {
        isProcessing = false;
    }
}


async function processQRResult(qrData) {
    if (isProcessing) return;

    isProcessing = true;
    statusDiv.textContent = '處理QR碼內容...';
    statusDiv.className = 'status processing';

    try {
        // Extract batch number from QR data
        const batchResult = extractBatchFromQRContent(qrData);

        if (batchResult.found) {
            // Search for product information
            const productInfo = await searchProductByBatch(batchResult.batch);

            if (productInfo.found) {
                batchResultDiv.innerHTML = `
                    <div style="margin-bottom: 10px;">
                        <strong>批次號：</strong>${batchResult.batch}
                    </div>
                    <div style="color: #28a745; margin-bottom: 10px;">
                        <strong>產品名稱：</strong>${productInfo.name}
                    </div>
                    <div style="color: #007bff; margin-bottom: 10px;">
                        <strong>唯一編號：</strong>${productInfo.unique_code}
                    </div>
                    <div style="color: #6c757d;">
                        <strong>產品代碼：</strong>${productInfo.product_code}
                    </div>
                `;
            } else {
                batchResultDiv.innerHTML = `
                    <div>
                        <strong>批次號：</strong>${batchResult.batch}
                    </div>
                    <div style="color: #ffc107; margin-top: 5px;">
                        此批次號尚未在產品資料庫中註冊
                    </div>
                `;
            }

            batchResultDiv.style.color = '#155724';
            statusDiv.textContent = '批次號識別成功！';
            statusDiv.className = 'status success';

            // Display QR content in raw text area
            rawTextArea.value = `--- QR碼內容 ---\n\n${qrData}\n\n--- 提取的批次號 ---\n\n${batchResult.batch}`;

        } else {
            batchResultDiv.innerHTML = '<div>QR碼內容中未找到有效的批次號</div>';
            batchResultDiv.style.color = '#721c24';
            statusDiv.textContent = 'QR碼掃描完成，但未找到有效的批次號';
            statusDiv.className = 'status error';
            rawTextArea.value = `--- QR碼內容 ---\n\n${qrData}\n\n--- 處理結果 ---\n\n未找到有效的批次號`;
        }

    } catch (error) {
        console.error('Error processing QR result:', error);
        statusDiv.textContent = '處理QR碼時發生錯誤：' + error.message;
        statusDiv.className = 'status error';
        batchResultDiv.textContent = '';
        rawTextArea.value = '';
    } finally {
        isProcessing = false;
    }
}

function extractBatchFromQRContent(content) {
    // For URL content, we look for batch numbers in the HTML/text content
    const cleanContent = content.toUpperCase();

    console.log('Processing URL content for batch number, length:', cleanContent.length);

    // Try different patterns to extract batch number from web content
    // Pattern 1: Direct 10-character batch number starting with 5
    const directMatches = cleanContent.match(/\b5[A-Z0-9]{9}\b/g);
    if (directMatches && directMatches.length > 0) {
        // Return the first valid match
        for (const match of directMatches) {
            if (match.length === 10 && match.startsWith('5')) {
                console.log('Found batch via direct match:', match);
                return { found: true, batch: match };
            }
        }
    }

    // Pattern 2: Look for batch numbers in HTML attributes or text content
    // Common patterns in web pages
    const htmlPatterns = [
        /batch["\s]*:?\s*["']?([5][A-Z0-9]{9})["']?/gi,
        /批次["\s]*:?\s*["']?([5][A-Z0-9]{9})["']?/gi,
        /batch[_-]number["\s]*:?\s*["']?([5][A-Z0-9]{9})["']?/gi,
        /data-batch=["']([5][A-Z0-9]{9})["']/gi,
        /id=["']batch["']\s*value=["']([5][A-Z0-9]{9})["']/gi,
    ];

    for (const pattern of htmlPatterns) {
        const match = cleanContent.match(pattern);
        if (match && match[1]) {
            console.log('Found batch via HTML pattern:', match[1]);
            return { found: true, batch: match[1] };
        }
    }

    // Pattern 3: Look for batch numbers in structured data (JSON-LD, microdata)
    const jsonLdMatches = cleanContent.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis);
    if (jsonLdMatches) {
        for (const jsonLd of jsonLdMatches) {
            try {
                const jsonContent = jsonLd.replace(/<script[^>]*>|<\/script>/gi, '');
                const data = JSON.parse(jsonContent);
                const batch = findBatchInObject(data);
                if (batch) {
                    console.log('Found batch in JSON-LD:', batch);
                    return { found: true, batch: batch };
                }
            } catch (e) {
                // Continue with other patterns
            }
        }
    }

    // Pattern 4: Look for meta tags with batch information
    const metaMatches = cleanContent.match(/<meta[^>]*name=["']batch["'][^>]*content=["']([5][A-Z0-9]{9})["'][^>]*>/gi);
    if (metaMatches) {
        for (const meta of metaMatches) {
            const contentMatch = meta.match(/content=["']([5][A-Z0-9]{9})["']/i);
            if (contentMatch && contentMatch[1]) {
                console.log('Found batch in meta tag:', contentMatch[1]);
                return { found: true, batch: contentMatch[1] };
            }
        }
    }

    // Pattern 5: Look for batch numbers in text content, preferring those near keywords
    const keywordPatterns = [
        /(?:生產批次|批次號|batch\s*number|serial\s*number)[\s:]*([5][A-Z0-9]{9})\b/gi,
        /(?:product\s*batch|batch\s*id|batch\s*code)[\s:]*([5][A-Z0-9]{9})\b/gi,
    ];

    for (const pattern of keywordPatterns) {
        const match = cleanContent.match(pattern);
        if (match && match[1]) {
            console.log('Found batch near keyword:', match[1]);
            return { found: true, batch: match[1] };
        }
    }

    console.log('No valid batch number found in URL content');
    return { found: false, batch: null };
}

// Helper function to recursively search for batch numbers in objects
function findBatchInObject(obj) {
    if (typeof obj === 'string') {
        const match = obj.match(/\b5[A-Z0-9]{9}\b/);
        return match ? match[0] : null;
    }

    if (typeof obj === 'object' && obj !== null) {
        const possibleKeys = ['batch', 'batchNumber', 'batch_number', 'serialNumber', 'serial_number', '批次', '生产批次'];

        for (const key of possibleKeys) {
            if (obj[key]) {
                const result = findBatchInObject(obj[key]);
                if (result) return result;
            }
        }

        // Search all properties
        for (const key in obj) {
            const result = findBatchInObject(obj[key]);
            if (result) return result;
        }
    }

    return null;
}


async function initTesseract() {
    try {
        statusDiv.textContent = '載入OCR引擎中...';
        worker = await Tesseract.createWorker();

        // Load both English and Chinese for better recognition
        await worker.loadLanguage('eng+chi_sim');
        await worker.initialize('eng+chi_sim');

        // Set better OCR configurations
        await worker.setParameters({
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ', // Limit to batch number characters
            tessedit_pageseg_mode: '6', // Uniform block of text
            tessedit_ocr_engine_mode: '2', // Use both Tesseract and Cube
        });

        statusDiv.textContent = 'OCR引擎載入完成，請啟動攝像頭';
    } catch (error) {
        console.error('Tesseract initialization failed:', error);
        statusDiv.textContent = 'OCR引擎載入失敗：' + error.message;
        statusDiv.className = 'status error';
    }
}

// Camera functions
async function startCamera() {
    try {
        statusDiv.textContent = '啟動攝像頭中...';
        statusDiv.className = 'status';

        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'environment' // Use back camera if available
            }
        });

        video.srcObject = stream;
        video.style.display = 'block';

        startCameraBtn.disabled = true;
        captureBtn.disabled = false;
        stopCameraBtn.disabled = false;

        statusDiv.textContent = currentMode === 'ocr'
            ? '攝像頭已啟動，請將貨物對準畫面並點擊拍攝按鈕'
            : '攝像頭已啟動，請將二維碼對準畫面，系統將自動掃描';
        statusDiv.className = 'status success';

    } catch (error) {
        console.error('Camera access failed:', error);
        statusDiv.textContent = '無法存取攝像頭：' + error.message;
        statusDiv.className = 'status error';
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        stream = null;
    }

    // Stop QR scanning if active
    stopScanning();

    video.style.display = 'none';
    startCameraBtn.disabled = false;
    captureBtn.disabled = true;
    stopCameraBtn.disabled = true;

    statusDiv.textContent = '攝像頭已停止';
    statusDiv.className = 'status';
}

function captureAndProcess() {
    if (isProcessing) return;

    isProcessing = true;
    captureBtn.disabled = true;

    statusDiv.textContent = '處理中...請稍候';
    statusDiv.className = 'status processing';

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Process the image
    processImage();
}

// Image preprocessing for better OCR accuracy
function preprocessImage() {
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Convert to grayscale and increase contrast
    for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);

        // Increase contrast
        let contrast = Math.max(0, Math.min(255, (gray - 128) * 1.5 + 128));

        // Apply slight sharpening
        contrast = Math.max(0, Math.min(255, contrast));

        data[i] = contrast;     // Red
        data[i + 1] = contrast; // Green
        data[i + 2] = contrast; // Blue
        // Alpha channel stays the same
    }

    // Put the processed image back
    ctx.putImageData(imageData, 0, 0);

    return canvas.toDataURL('image/png');
}

// OCR processing with Tesseract.js
async function processImage() {
    try {
        // Preprocess the image for better OCR accuracy
        const processedImageData = preprocessImage();

        // Run OCR with processed image
        const { data: { text, confidence, words } } = await worker.recognize(processedImageData);

        // Process the results with confidence scores
        const results = processOCRResults(text, confidence, words);

        // Display results
        displayResults(results);

        statusDiv.textContent = results.found ? '批次號提取成功！' : '未找到批次號，請檢查網址內容';
        statusDiv.className = results.found ? 'status success' : 'status error';

    } catch (error) {
        console.error('OCR processing failed:', error);
        statusDiv.textContent = '處理失敗：' + error.message;
        statusDiv.className = 'status error';
        batchResultDiv.textContent = '';
        rawTextArea.value = '';
    } finally {
        isProcessing = false;
        captureBtn.disabled = false;
    }
}



function processOCRResults(text, confidence, words) {
    // Split text into lines and clean them
    const lines = text.split('\n')
        .map(line => line.trim().toUpperCase())
        .filter(line => line.length > 0);

    let foundBatch = null;
    let bestConfidence = 0;
    let rawText = '--- 原始識別文字 ---\n\n';

    // Process each line with confidence scores
    lines.forEach((line, index) => {
        // Find corresponding word confidence if available
        let lineConfidence = 50; // Default confidence
        if (words && words[index]) {
            lineConfidence = words[index].confidence * 100;
        }

        rawText += `行 ${index + 1}: ${line}\n`;

        // Enhanced batch code detection - 5開頭的10個字符批次號
        // 優先匹配：5開頭的10個字符批次號
        const batchMatch = line.match(/\b5[A-Z0-9]{9}\b/);
        if (batchMatch) {
            const candidate = batchMatch[0];
            // 確保是精確的10個字符且以5開頭
            if (candidate.length === 10 && candidate.startsWith('5') && lineConfidence > bestConfidence) {
                foundBatch = candidate;
                bestConfidence = lineConfidence;
            }
        }

        // 備用模式：查找包含5開頭序列的模式（如果精確匹配失敗）
        if (!foundBatch) {
            const backupPatterns = [
                /5\s+\d{3}\s+\d{3}\s+\d{3}/,  // 5 123 456 789 格式（數字）
                /5[\s\-]+[A-Z0-9]{3}[\s\-]+[A-Z0-9]{3}[\s\-]+[A-Z0-9]{3}/,  // 5-ABC-DEF-GHI 格式
            ];

            for (const pattern of backupPatterns) {
                const match = line.match(pattern);
                if (match) {
                    const candidate = match[0].replace(/[\s\-]/g, ''); // Remove spaces and hyphens
                    // 清理並驗證候選結果
                    const cleanCandidate = candidate.replace(/\s+/g, '');
                    if (cleanCandidate.length === 10 && cleanCandidate.startsWith('5') &&
                        cleanCandidate.slice(1).isalnum() &&
                        lineConfidence > bestConfidence) {
                        foundBatch = cleanCandidate;
                        bestConfidence = lineConfidence;
                        break;
                    }
                }
            }
        }
    });

    // Also check for batch patterns in the entire text
    if (!foundBatch) {
        const fullText = text.toUpperCase().replace(/\s+/g, ' ');

        // 優先查找5開頭的10個字符批次號
        const globalPatterns = [
            /\b5[A-Z0-9]{9}\b/g,  // 精確匹配10個字符
            /5\s+\d{3}\s+\d{3}\s+\d{3}/g,  // 5 123 456 789 格式（數字）
            /5[\s\-]+[A-Z0-9]{3}[\s\-]+[A-Z0-9]{3}[\s\-]+[A-Z0-9]{3}/g,  // 5-ABC-DEF-GHI 格式
        ];

        for (const pattern of globalPatterns) {
            const matches = fullText.match(pattern);
            if (matches) {
                for (const match of matches) {
                    let candidate = match.replace(/[\s\-]/g, ''); // Remove spaces and hyphens
                    candidate = candidate.replace(/\s+/g, ''); // Remove extra spaces

                    // 驗證候選結果
                    if (candidate.length === 10 && candidate.startsWith('5') &&
                        candidate.slice(1).isalnum() &&
                        confidence > 30) { // Minimum confidence threshold
                        foundBatch = candidate;
                        break;
                    }
                }
            }
            if (foundBatch) break;
        }
    }

    return {
        found: foundBatch !== null,
        batch: foundBatch,
        confidence: bestConfidence,
        rawText: rawText
    };
}

async function displayResults(results) {
    if (results.found) {
        // Search for product information
        const productInfo = await searchProductByBatch(results.batch);

        if (productInfo.found) {
            batchResultDiv.innerHTML = `
                <div style="margin-bottom: 10px;">
                    <strong>批次號：</strong>${results.batch}
                </div>
                <div style="color: #28a745; margin-bottom: 10px;">
                    <strong>產品名稱：</strong>${productInfo.name}
                </div>
                <div style="color: #007bff; margin-bottom: 10px;">
                    <strong>唯一編號：</strong>${productInfo.unique_code}
                </div>
                <div style="color: #6c757d;">
                    <strong>產品代碼：</strong>${productInfo.product_code}
                </div>
            `;
        } else {
            batchResultDiv.innerHTML = `
                <div>
                    <strong>批次號：</strong>${results.batch}
                </div>
                <div style="color: #ffc107; margin-top: 5px;">
                    此批次號尚未在產品資料庫中註冊
                </div>
            `;
        }

        batchResultDiv.style.color = '#155724';
    } else {
        batchResultDiv.innerHTML = '<div>未找到批次號</div>';
        batchResultDiv.style.color = '#721c24';
    }

    rawTextArea.value = results.rawText;
}

// Search for product by batch number
async function searchProductByBatch(batchNumber) {
    try {
        const response = await fetch(`/api/search_product/${batchNumber}`);
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error searching product:', error);
        return { found: false, batch_number: batchNumber };
    }
}


// Event listeners
startCameraBtn.addEventListener('click', startCamera);
captureBtn.addEventListener('click', captureAndProcess);
stopCameraBtn.addEventListener('click', stopCamera);

// Mode switching event listeners
ocrModeBtn.addEventListener('click', () => switchToMode('ocr'));
qrModeBtn.addEventListener('click', () => switchToMode('qr'));

// QR processing event listeners
processQRBtn.addEventListener('click', processQRUrl);
clearQRBtn.addEventListener('click', clearQRInput);
qrUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        processQRUrl();
    }
});


// Handle page unload to stop camera
window.addEventListener('beforeunload', stopCamera);

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    initTesseract();
    checkLibraries();
});

// Check if required libraries are loaded
function checkLibraries() {
    console.log('Checking libraries...');
    console.log('Tesseract available:', typeof Tesseract !== 'undefined');
}
