// Global variables
let productsData = [];
let currentEditingId = null;
let currentDeletingType = null; // 'product' or 'batch'

// DOM elements
const addProductBtn = document.getElementById('addProductBtn');
const addBatchBtn = document.getElementById('addBatchBtn');
const productModal = document.getElementById('productModal');
const batchModal = document.getElementById('batchModal');
const editProductModal = document.getElementById('editProductModal');
const editBatchModal = document.getElementById('editBatchModal');
const deleteModal = document.getElementById('deleteModal');
const productForm = document.getElementById('productForm');
const batchForm = document.getElementById('batchForm');
const editProductForm = document.getElementById('editProductForm');
const editBatchForm = document.getElementById('editBatchForm');
const productsTableBody = document.getElementById('productsTableBody');
const messageDiv = document.getElementById('message');
const deleteModalTitle = document.getElementById('deleteModalTitle');
const deleteModalMessage = document.getElementById('deleteModalMessage');

// Filter elements
const filterProductName = document.getElementById('filterProductName');
const filterProductCode = document.getElementById('filterProductCode');
const filterBatchNumber = document.getElementById('filterBatchNumber');
const filterShowEmpty = document.getElementById('filterShowEmpty');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadProducts();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Add product and batch buttons
    addProductBtn.addEventListener('click', () => {
        console.log('Add product button clicked');
        openProductModal();
    });
    addBatchBtn.addEventListener('click', () => {
        console.log('Add batch button clicked');
        openBatchModal();
    });

    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeProductModal();
            closeBatchModal();
            closeEditProductModal();
            closeEditBatchModal();
            closeDeleteModal();
        });
    });

    // Click outside modal to close
    window.addEventListener('click', (e) => {
        if (e.target === productModal) closeProductModal();
        if (e.target === batchModal) closeBatchModal();
        if (e.target === editProductModal) closeEditProductModal();
        if (e.target === editBatchModal) closeEditBatchModal();
        if (e.target === deleteModal) closeDeleteModal();
    });

    // Form submissions
    productForm.addEventListener('submit', (e) => {
        console.log('Product form submit event triggered');
        handleProductFormSubmit(e);
    });
    batchForm.addEventListener('submit', handleBatchFormSubmit);
    editProductForm.addEventListener('submit', handleEditProductFormSubmit);
    editBatchForm.addEventListener('submit', handleEditBatchFormSubmit);

    // Delete confirmation
    document.getElementById('confirmDelete').addEventListener('click', confirmDelete);

    // Filter event listeners
    filterProductName.addEventListener('input', applyFilters);
    filterProductCode.addEventListener('input', applyFilters);
    filterBatchNumber.addEventListener('input', applyFilters);
    filterShowEmpty.addEventListener('change', applyFilters);
    clearFiltersBtn.addEventListener('click', clearFilters);
}

// Load products from server
async function loadProducts() {
    try {
        console.log('Loading products from API...');
        const response = await fetch('/api/products');

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const products = await response.json();
        console.log(`Loaded ${products.length} product items`);

        productsData = products;
        applyFilters();
        console.log('Products loaded successfully');
    } catch (error) {
        console.error('Error loading products:', error);
        showMessage(`載入產品失敗: ${error.message}`, 'error');
    }
}

// Filter functions
function applyFilters() {
    const filteredProducts = filterProducts(productsData);
    renderProductsTable(filteredProducts);
}

function filterProducts(products) {
    const nameFilter = filterProductName.value.trim().toLowerCase();
    const codeFilter = filterProductCode.value.trim().toLowerCase();
    const batchFilter = filterBatchNumber.value.trim().toLowerCase();
    const showEmptyFilter = filterShowEmpty.value;

    // Group products by product_id first
    const productGroups = {};
    products.forEach(item => {
        if (!productGroups[item.id]) {
            productGroups[item.id] = {
                id: item.id,
                name: item.name,
                code: item.code,
                batches: []
            };
        }
        if (item.batch_id) {
            productGroups[item.id].batches.push({
                id: item.batch_id,
                batch_number: item.batch_number,
                quantity: item.quantity
            });
        }
    });

    // Apply filters
    const filteredGroups = Object.values(productGroups).filter(product => {
        // Filter by product name
        if (nameFilter && !product.name.toLowerCase().includes(nameFilter)) {
            return false;
        }

        // Filter by product code
        if (codeFilter && !product.code.toLowerCase().includes(codeFilter)) {
            return false;
        }

        // Filter by batch number (check if any batch matches)
        if (batchFilter) {
            // Filter batches that match the batch number filter
            product.batches = product.batches.filter(batch =>
                batch.batch_number.toLowerCase().includes(batchFilter)
            );
            // If no batches match, exclude the product
            if (product.batches.length === 0) {
                return false;
            }
        }

        // Filter by show empty option
        if (showEmptyFilter === 'with_batches' && product.batches.length === 0) {
            return false;
        }
        if (showEmptyFilter === 'without_batches' && product.batches.length > 0) {
            return false;
        }

        return true;
    });

    // Convert back to flat array format for rendering
    const filteredProducts = [];
    filteredGroups.forEach(product => {
        // Add product entry
        filteredProducts.push({
            id: product.id,
            name: product.name,
            code: product.code
        });

        // Add batch entries
        product.batches.forEach(batch => {
            filteredProducts.push({
                id: product.id,
                name: product.name,
                code: product.code,
                batch_id: batch.id,
                batch_number: batch.batch_number,
                quantity: batch.quantity
            });
        });
    });

    return filteredProducts;
}

function clearFilters() {
    filterProductName.value = '';
    filterProductCode.value = '';
    filterBatchNumber.value = '';
    filterShowEmpty.value = 'all';
    applyFilters();
}

// Render products table
function renderProductsTable(products) {
    if (products.length === 0) {
        productsTableBody.innerHTML = '<tr><td colspan="5" class="loading">目前沒有產品資料</td></tr>';
        return;
    }

    // Group products by product_id to show hierarchy
    const productGroups = {};
    products.forEach(item => {
        if (!productGroups[item.id]) {
            productGroups[item.id] = {
                id: item.id,
                name: item.name,
                code: item.code,
                batches: [],
                totalQuantity: 0
            };
        }
        if (item.batch_id) {
            const quantity = item.quantity || 1;
            productGroups[item.id].batches.push({
                id: item.batch_id,
                batch_number: item.batch_number,
                quantity: quantity
            });
            productGroups[item.id].totalQuantity += quantity;
        }
    });

    const rows = [];
    Object.values(productGroups).forEach(product => {
        // Product header row
        rows.push(`
            <tr class="product-header">
                <td><strong>${escapeHtml(product.name)}</strong></td>
                <td style="text-align: center; font-weight: bold;">${escapeHtml(product.code)}</td>
                <td></td>
                <td style="text-align: center; font-weight: bold; color: #28a745;">${product.totalQuantity}</td>
                <td style="text-align: center;">
                    <button class="btn btn-small" onclick="editProduct(${product.id}, '${escapeHtml(product.name)}')" style="padding: 2px 6px; font-size: 11px;">編輯</button>
                    <button class="btn btn-danger btn-small" onclick="deleteProduct(${product.id}, '${escapeHtml(product.name)}')" style="padding: 2px 6px; font-size: 11px;">刪除</button>
                </td>
            </tr>
        `);

        // Batch rows
        product.batches.forEach((batch) => {
            rows.push(`
                <tr class="batch-row">
                    <td style="padding-left: 30px; color: #666;">└─ ${escapeHtml(product.name)}</td>
                    <td style="text-align: center;">${escapeHtml(product.code)}</td>
                    <td>${escapeHtml(batch.batch_number)}</td>
                    <td style="text-align: center; color: #007bff; font-weight: bold;">${batch.quantity}</td>
                    <td style="text-align: center;">
                        <button class="btn btn-small" onclick="editBatch(${batch.id}, '${escapeHtml(batch.batch_number)}')" style="padding: 1px 4px; font-size: 10px;">編輯</button>
                        <button class="btn btn-danger btn-small" onclick="deleteBatch(${batch.id}, '${escapeHtml(batch.batch_number)}')" style="padding: 1px 4px; font-size: 10px;">刪除</button>
                    </td>
                </tr>
            `);
        });

        // If no batches, show a row indicating no batches
        if (product.batches.length === 0) {
            rows.push(`
                <tr class="batch-row">
                    <td style="padding-left: 30px; color: #999;">└─ 尚未添加批次</td>
                    <td style="text-align: center;">${escapeHtml(product.code)}</td>
                    <td>-</td>
                    <td style="text-align: center; color: #6c757d;">0</td>
                    <td></td>
                </tr>
            `);
        }
    });

    productsTableBody.innerHTML = rows.join('');
}

// Modal functions
function openProductModal() {
    productForm.reset();
    productModal.style.display = 'block';
}

function closeProductModal() {
    productModal.style.display = 'none';
    productForm.reset();
}

function openBatchModal() {
    // Load available products for the dropdown
    loadProductsForDropdown();
    batchForm.reset();
    batchModal.style.display = 'block';
}

function closeBatchModal() {
    batchModal.style.display = 'none';
    batchForm.reset();
}

function openEditProductModal(productId, productName) {
    document.getElementById('editProductName').value = productName;
    currentEditingId = productId;
    editProductModal.style.display = 'block';
}

function closeEditProductModal() {
    editProductModal.style.display = 'none';
    currentEditingId = null;
    editProductForm.reset();
}

function openEditBatchModal(batchId, batchNumber, batchQuantity) {
    document.getElementById('editBatchNumber').value = batchNumber;
    document.getElementById('editBatchQuantity').value = batchQuantity;
    currentEditingId = batchId;
    editBatchModal.style.display = 'block';
}

function closeEditBatchModal() {
    editBatchModal.style.display = 'none';
    currentEditingId = null;
    editBatchForm.reset();
}

function closeDeleteModal() {
    deleteModal.style.display = 'none';
    currentDeletingType = null;
}

// Load products for dropdown
async function loadProductsForDropdown() {
    try {
        const response = await fetch('/api/products');
        const data = await response.json();

        // Extract unique products
        const products = [...new Map(data.map(item => [item.id, { id: item.id, name: item.name, code: item.code }])).values()];

        const select = document.getElementById('batchProductId');
        select.innerHTML = '<option value="">請選擇產品...</option>';

        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} (${product.code})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading products for dropdown:', error);
    }
}

// Form handling
async function handleProductFormSubmit(e) {
    e.preventDefault();

    const formData = new FormData(productForm);
    const productData = {
        name: formData.get('productName').trim(),
        batch_number: formData.get('productBatchNumber').trim(),
        quantity: parseInt(formData.get('productQuantity')) || 1
    };

    if (!productData.name) {
        showMessage('請輸入產品名稱', 'error');
        return;
    }

    if (!productData.batch_number) {
        showMessage('請輸入批次號', 'error');
        return;
    }

    // Validate batch number format
    if (!/^5[A-Z0-9]{9}$/.test(productData.batch_number)) {
        showMessage('批次號必須是以5開頭的10個字符', 'error');
        return;
    }

    try {
        const response = await fetch('/api/products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(productData)
        });

        if (response.ok) {
            showMessage('產品新增成功', 'success');
            closeProductModal();
            loadProducts();
        } else {
            const error = await response.json();
            showMessage(error.error || '新增產品失敗', 'error');
        }
    } catch (error) {
        console.error('Error adding product:', error);
        showMessage('新增產品失敗，請重試', 'error');
    }
}

async function handleBatchFormSubmit(e) {
    e.preventDefault();

    const formData = new FormData(batchForm);
    const batchData = {
        product_id: parseInt(formData.get('batchProductId')),
        batch_number: formData.get('batchNumber').trim(),
        quantity: parseInt(formData.get('batchQuantity')) || 1
    };

    if (!batchData.product_id || !batchData.batch_number) {
        showMessage('請選擇產品並輸入批次號', 'error');
        return;
    }

    // Validate batch number format
    if (!/^5[A-Z0-9]{9}$/.test(batchData.batch_number)) {
        showMessage('批次號必須是以5開頭的10個字符', 'error');
        return;
    }

    try {
        const response = await fetch('/api/batches', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(batchData)
        });

        if (response.ok) {
            showMessage('批次新增成功', 'success');
            closeBatchModal();
            loadProducts();
        } else {
            const error = await response.json();
            showMessage(error.error || '新增批次失敗', 'error');
        }
    } catch (error) {
        console.error('Error adding batch:', error);
        showMessage('新增批次失敗，請重試', 'error');
    }
}

async function handleEditProductFormSubmit(e) {
    e.preventDefault();

    const formData = new FormData(editProductForm);
    const productData = {
        name: formData.get('editProductName').trim()
    };

    if (!productData.name) {
        showMessage('請輸入產品名稱', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/products/${currentEditingId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(productData)
        });

        if (response.ok) {
            showMessage('產品更新成功', 'success');
            closeEditProductModal();
            loadProducts();
        } else {
            const error = await response.json();
            showMessage(error.error || '更新產品失敗', 'error');
        }
    } catch (error) {
        console.error('Error updating product:', error);
        showMessage('更新產品失敗，請重試', 'error');
    }
}

async function handleEditBatchFormSubmit(e) {
    e.preventDefault();

    const formData = new FormData(editBatchForm);
    const batchData = {
        batch_number: formData.get('editBatchNumber').trim(),
        quantity: parseInt(formData.get('editBatchQuantity')) || 1
    };

    if (!batchData.batch_number) {
        showMessage('請輸入批次號', 'error');
        return;
    }

    // Validate batch number format
    if (!/^5[A-Z0-9]{9}$/.test(batchData.batch_number)) {
        showMessage('批次號必須是以5開頭的10個字符', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/batches/${currentEditingId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(batchData)
        });

        if (response.ok) {
            showMessage('批次更新成功', 'success');
            closeEditBatchModal();
            loadProducts();
        } else {
            const error = await response.json();
            showMessage(error.error || '更新批次失敗', 'error');
        }
    } catch (error) {
        console.error('Error updating batch:', error);
        showMessage('更新批次失敗，請重試', 'error');
    }
}

// Edit product
function editProduct(productId, productName) {
    openEditProductModal(productId, productName);
}

// Edit batch
function editBatch(batchId, batchNumber) {
    // Convert batchId to number to ensure type matching
    const numericBatchId = parseInt(batchId, 10);

    // Find the batch quantity from productsData
    let batchQuantity = 1; // default
    for (const item of productsData) {
        if (parseInt(item.batch_id, 10) === numericBatchId) {
            batchQuantity = item.quantity || 1;
            break;
        }
    }
    openEditBatchModal(numericBatchId, batchNumber, batchQuantity);
}

// Delete product
function deleteProduct(productId, productName) {
    deleteModalTitle.textContent = '確認刪除產品';
    deleteModalMessage.innerHTML = `確定要刪除產品 "<strong>${productName}</strong>" 嗎？<br><small style="color: #dc3545;">注意：此操作將同時刪除該產品的所有批次！</small>`;
    deleteModal.style.display = 'block';
    currentDeletingType = 'product';
    deleteModal.dataset.itemId = productId;
}

// Delete batch
function deleteBatch(batchId, batchNumber) {
    deleteModalTitle.textContent = '確認刪除批次';
    deleteModalMessage.innerHTML = `確定要刪除批次號 "<strong>${batchNumber}</strong>" 嗎？`;
    deleteModal.style.display = 'block';
    currentDeletingType = 'batch';
    deleteModal.dataset.itemId = batchId;
}

async function confirmDelete() {
    const itemId = deleteModal.dataset.itemId;
    const endpoint = currentDeletingType === 'product'
        ? `/api/products/${itemId}`
        : `/api/batches/${itemId}`;

    try {
        const response = await fetch(endpoint, {
            method: 'DELETE'
        });

        if (response.ok) {
            const itemType = currentDeletingType === 'product' ? '產品' : '批次';
            showMessage(`${itemType}刪除成功`, 'success');
            closeDeleteModal();
            loadProducts();
        } else {
            const error = await response.json();
            showMessage(error.error || '刪除失敗', 'error');
        }
    } catch (error) {
        console.error('Error deleting item:', error);
        showMessage('刪除失敗，請重試', 'error');
    }
}

// Utility functions
function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';

    // Hide message after 5 seconds
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
