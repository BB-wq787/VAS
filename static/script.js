// Global variables
let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let stream = null;
let isProcessing = false;

// DOM elements
const startCameraBtn = document.getElementById('startCamera');
const captureBtn = document.getElementById('capture');
const stopCameraBtn = document.getElementById('stopCamera');
const statusDiv = document.getElementById('status');
const batchResultDiv = document.getElementById('batchResult');
const rawTextArea = document.getElementById('rawText');

// Debug DOM elements on page load
console.log('DOM Elements loaded:');
console.log('statusDiv:', statusDiv);
console.log('batchResultDiv:', batchResultDiv);
console.log('rawTextArea:', rawTextArea);

// Initialize Tesseract worker
let worker = null;

function stopScanning() {
    // Stop any ongoing processing
    isProcessing = false;
    captureBtn.disabled = !stream;
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

        statusDiv.textContent = '攝像頭已啟動，請將貨物對準畫面並點擊拍攝按鈕';
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
                    <strong>數量：</strong>${productInfo.quantity}
                </div>
                <div style="color: #6c757d; margin-bottom: 15px;">
                    <strong>產品代碼：</strong>${productInfo.product_code}
                </div>
                <button id="stockInBtn" class="btn btn-success" style="width: 100%; margin-bottom: 8px;">入庫 +1</button>
                <div id="stockInStatus" style="font-size: 12px; color: #6c757d;"></div>
            `;

            // Add event listener for stock in button
            setTimeout(() => {
                const stockInBtn = document.getElementById('stockInBtn');
                const statusDiv = document.getElementById('stockInStatus');
                if (stockInBtn) {
                    stockInBtn.addEventListener('click', async () => {
                        try {
                            stockInBtn.disabled = true;
                            stockInBtn.textContent = '處理中...';

                            const response = await fetch(`/api/batches/${productInfo.batch_id}`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    batch_number: results.batch,
                                    quantity: productInfo.quantity + 1
                                })
                            });

                            if (response.ok) {
                                statusDiv.textContent = '入庫成功！數量已增加。';
                                statusDiv.style.color = '#28a745';
                                productInfo.quantity += 1;

                                // Update displayed quantity
                                const quantityDiv = stockInBtn.parentElement.querySelector('div:nth-child(3)');
                                if (quantityDiv) {
                                    quantityDiv.innerHTML = `<strong>數量：</strong>${productInfo.quantity}`;
                                }

                                setTimeout(() => {
                                    statusDiv.textContent = '';
                                }, 3000);
                            } else {
                                const error = await response.json();
                                statusDiv.textContent = '入庫失敗：' + (error.error || '未知錯誤');
                                statusDiv.style.color = '#dc3545';
                            }
                        } catch (error) {
                            statusDiv.textContent = '網路錯誤，請重試';
                            statusDiv.style.color = '#dc3545';
                        } finally {
                            stockInBtn.disabled = false;
                            stockInBtn.textContent = '入庫 +1';
                        }
                    });
                }
            }, 100);
        } else {
            batchResultDiv.innerHTML = `
                <div style="background: #d4edda; padding: 10px; border-radius: 5px; border: 2px solid #c3e6cb; margin-bottom: 8px;">
                    <strong style="color: #155724;">批次號：</strong><span style="color: #155724;">${results.batch}</span>
                </div>
                <div style="background: #cce5ff; padding: 10px; border-radius: 5px; border: 2px solid #99d6ff; margin-bottom: 8px;">
                    <strong style="color: #007bff;">批次類型：</strong><span style="color: #007bff;">5開頭10位標準批次號</span>
                </div>
                <div style="background: #fff3cd; padding: 10px; border-radius: 5px; border: 2px solid #ffeaa7;">
                    <strong style="color: #856404;">提示：</strong><span style="color: #856404;">此批次號有效但未在產品資料庫中註冊</span>
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

// Debug function - call this in browser console to check page state
function debugPageState() {
    console.log('=== PAGE STATE DEBUG ===');
    console.log('Is processing:', isProcessing);

    console.log('\nDOM Elements:');
    console.log('- statusDiv:', statusDiv);
    console.log('- batchResultDiv:', batchResultDiv);
    console.log('- rawTextArea:', rawTextArea);

    console.log('\nFresh element lookup:');
    const freshStatus = document.getElementById('status');
    const freshBatch = document.getElementById('batchResult');
    const freshText = document.getElementById('rawText');
    console.log('- #status:', freshStatus);
    console.log('- #batchResult:', freshBatch);
    console.log('- #rawText:', freshText);

    console.log('\nElement content:');
    if (freshStatus) console.log('- status text:', freshStatus.textContent);
    if (freshBatch) console.log('- batch result HTML:', freshBatch.innerHTML);
    if (freshText) console.log('- raw text value:', freshText.value);

    console.log('\nAll elements with class batch-result:');
    document.querySelectorAll('.batch-result').forEach((el, i) => {
        console.log(`  ${i}:`, el, 'HTML:', el.innerHTML);
    });

    return {
        processing: isProcessing,
        elements: {
            status: freshStatus,
            batchResult: freshBatch,
            rawText: freshText
        }
    };
}

// Make debug function available globally
window.debugPageState = debugPageState;
