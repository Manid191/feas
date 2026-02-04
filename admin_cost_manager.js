/**
 * Admin Cost Manager - Fixed Administrative Expenses
 * Matches the format of Operation Cost (Fixed) in input_manager.js
 */
class AdminCostManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.adminItems = [];
    }

    init() {
        // Load from existing state or defaults
        if (!window.inputApps.currentInputs.adminItems || window.inputApps.currentInputs.adminItems.length === 0) {
            this.loadDefaults();
        } else {
            this.adminItems = window.inputApps.currentInputs.adminItems;
        }
    }

    loadDefaults() {
        // Convert adminExpensePresets to row-based format
        const presets = window.AppConfig?.defaults?.adminExpensePresets || [];
        this.adminItems = presets.map((p, i) => {
            // Calculate average value from year array
            const avgValue = p.values.reduce((a, b) => a + b, 0) / p.values.length;
            return {
                id: `admin_${i}_${Date.now()}`,
                name: p.name,
                type: 'fixed', // All admin costs are fixed THB
                quantity: 1,
                value: avgValue * 1000000, // Convert from Million to THB
                freqType: 'yearly'
            };
        });
        window.inputApps.currentInputs.adminItems = this.adminItems;
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Force Clear Container
        container.innerHTML = '';

        let html = `
        <div class="card glass-panel full-width">
            <div class="card-header">
                <h3><i class="fa-solid fa-briefcase"></i> Admin Cost (Fixed)</h3>
                <div>
                    <button class="btn btn-secondary btn-sm" onclick="adminApp.resetToDefaults()" style="margin-right: 8px;">
                        <i class="fa-solid fa-rotate-left"></i> Reset
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="adminApp.addItem()">
                        <i class="fa-solid fa-plus"></i> Add Item
                    </button>
                </div>
            </div>

            <!-- Summary Section -->
            <div id="admin-summary" class="card" style="margin-bottom: 20px; padding: 16px; background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border-radius: 8px;">
                <!-- Summary injected here -->
            </div>

            <div class="opex-header compact-row" style="padding: 0 0 5px 0; font-weight: bold; color: #666; font-size: 0.9em; border-bottom: 2px solid #eee; margin-bottom: 8px;">
                <span class="grow-2">Description</span>
                <span class="grow-1">Type</span>
                <span style="width: 80px;">Qty</span>
                <span class="grow-1">Unit Price (THB)</span>
                <span class="grow-1">Frequency</span>
                <span style="width: 32px;"></span>
            </div>

            <div id="admin-list" class="opex-container">
                <!-- Items injected here -->
            </div>
        </div>
        `;

        container.innerHTML = html;
        this.renderList();
        this.renderSummary();

        // Notify InputManager to recalculate (silently - don't render dashboard!)
        if (window.inputApps && window.inputApps.calculate) {
            window.inputApps.calculate(null, true);
        }
    }

    renderSummary() {
        const summary = document.getElementById('admin-summary');
        if (!summary) return;

        // Calculate totals
        let totalAnnual = 0;
        this.adminItems.forEach(item => {
            const qty = parseFloat(item.quantity) || 1;
            const val = parseFloat(item.value) || 0;
            const freqType = item.freqType || 'yearly';

            if (freqType === 'monthly') {
                totalAnnual += qty * val * 12;
            } else if (freqType === 'yearly') {
                totalAnnual += qty * val;
            } else if (freqType === 'every_n') {
                // Average per year
                const n = parseInt(item.customN) || 5;
                totalAnnual += (qty * val) / n;
            } else if (freqType === 'period') {
                // Assume full period contribution
                totalAnnual += qty * val;
            }
        });

        const totalMillion = totalAnnual / 1000000;

        summary.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                <div>
                    <h4 style="margin: 0; color: #1565c0;"><i class="fa-solid fa-calculator"></i> ${window.AppConfig?.ui?.adminSummaryTitle || 'Summary'}</h4>
                    <p style="margin: 4px 0 0 0; font-size: 0.9em; color: #666;">${window.AppConfig?.ui?.adminSummarySub || ''}</p>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 1.8em; font-weight: bold; color: #1565c0;">
                        ${totalAnnual.toLocaleString('en-US', { maximumFractionDigits: 0 })} THB
                    </div>
                    <div style="font-size: 0.9em; color: #666;">
                        (${totalMillion.toFixed(2)} Million THB / Year)
                    </div>
                </div>
            </div>
        `;
    }

    renderList() {
        const list = document.getElementById('admin-list');
        if (!list) return;
        list.innerHTML = '';

        this.adminItems.forEach((item, index) => {
            const freqType = item.freqType || 'yearly';

            let extraInputs = '';
            if (freqType === 'every_n') {
                extraInputs = `<input type="number" class="input-compact" style="width: 60px;" placeholder="Years" 
                    value="${item.customN || 5}" onchange="adminApp.updateItem(${index}, 'customN', this.value)" title="Every N Years">`;
            } else if (freqType === 'period') {
                extraInputs = `
                    <input type="number" class="input-compact" style="width: 50px;" placeholder="Start" 
                        value="${item.startYear || 1}" onchange="adminApp.updateItem(${index}, 'startYear', this.value)" title="Start Year">
                    <span style="font-size:12px; color:#666;">-</span>
                    <input type="number" class="input-compact" style="width: 50px;" placeholder="End" 
                        value="${item.endYear || 20}" onchange="adminApp.updateItem(${index}, 'endYear', this.value)" title="End Year">
                `;
            }

            const rowHtml = `
                <div class="opex-item compact-row">
                    <input type="text" class="input-compact grow-2" placeholder="Item Name" 
                           value="${item.name}" onchange="adminApp.updateItem(${index}, 'name', this.value)" title="Expense Name">
                    
                    <select class="input-compact grow-1" onchange="adminApp.updateItem(${index}, 'type', this.value)" title="Cost Type">
                        <option value="fixed" ${item.type === 'fixed' ? 'selected' : ''}>Fixed (THB)</option>
                        <option value="percent_capex" ${item.type === 'percent_capex' ? 'selected' : ''}>% CAPEX</option>
                    </select>

                    <input type="text" class="input-compact" style="width: 80px;" placeholder="Qty" 
                           value="${(parseFloat(item.quantity) || 1).toLocaleString('en-US')}" onchange="adminApp.updateItem(${index}, 'quantity', this.value)" title="Quantity">

                    <input type="text" class="input-compact grow-1" placeholder="Value (THB)" 
                           value="${(parseFloat(item.value) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}" onchange="adminApp.handleValueChange(${index}, this)" title="Unit Price">

                    <div class="grow-1" style="display:flex; gap:4px; align-items:center;">
                        <select class="input-compact" style="flex:1; min-width:80px;" onchange="adminApp.updateItem(${index}, 'freqType', this.value)" title="Frequency">
                            <option value="monthly" ${freqType === 'monthly' ? 'selected' : ''}>Per Month</option>
                            <option value="yearly" ${freqType === 'yearly' ? 'selected' : ''}>Per Year</option>
                            <option value="every_n" ${freqType === 'every_n' ? 'selected' : ''}>Every N Years</option>
                            <option value="period" ${freqType === 'period' ? 'selected' : ''}>Custom Period</option>
                        </select>
                        ${extraInputs}
                    </div>

                    <button class="btn btn-danger btn-icon btn-sm" onclick="adminApp.removeItem(${index})" title="Remove">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
            `;
            list.insertAdjacentHTML('beforeend', rowHtml);
        });
    }

    handleValueChange(index, inputElement) {
        let valueStr = inputElement.value.replace(/,/g, '');

        // Try math expression
        if (/^[0-9+\-*/().\s]+$/.test(valueStr)) {
            try {
                const result = Function('"use strict";return (' + valueStr + ')')();
                if (isFinite(result)) {
                    inputElement.value = result.toLocaleString('en-US', { maximumFractionDigits: 0 });
                    this.updateItem(index, 'value', result);
                    return;
                }
            } catch (e) { /* ignore */ }
        }

        const num = parseFloat(valueStr);
        if (!isNaN(num)) {
            inputElement.value = num.toLocaleString('en-US', { maximumFractionDigits: 0 });
            this.updateItem(index, 'value', num);
        }
    }

    updateItem(index, field, value) {
        if (field === 'quantity' || field === 'value' || field === 'customN' || field === 'startYear' || field === 'endYear') {
            value = parseFloat(String(value).replace(/,/g, '')) || 0;
        }
        this.adminItems[index][field] = value;
        window.inputApps.currentInputs.adminItems = this.adminItems;

        // Re-render only on frequency change to show/hide extra inputs
        if (field === 'freqType') {
            this.renderList();
        }

        // Always update summary
        this.renderSummary();

        // Recalculate silently
        if (window.inputApps && window.inputApps.calculate) {
            window.inputApps.calculate(null, true);
        }
    }

    addItem() {
        this.adminItems.push({
            id: `admin_new_${Date.now()}`,
            name: window.AppConfig?.ui?.adminNewItemName || 'New Item',
            type: 'fixed',
            quantity: 1,
            value: 0,
            freqType: 'yearly'
        });
        window.inputApps.currentInputs.adminItems = this.adminItems;
        this.renderList();
        this.renderSummary();
    }

    removeItem(index) {
        this.adminItems.splice(index, 1);
        window.inputApps.currentInputs.adminItems = this.adminItems;
        this.renderList();
        this.renderSummary();

        if (window.inputApps && window.inputApps.calculate) {
            window.inputApps.calculate(null, true);
        }
    }

    resetToDefaults() {
        if (confirm('Reset Admin Costs to defaults?')) {
            this.loadDefaults();
            this.renderList();
            this.renderSummary();

            if (window.inputApps && window.inputApps.calculate) {
                window.inputApps.calculate(null, true);
            }
        }
    }

    // Helper for InputManager to get annual cost
    getAnnualCosts() {
        const projectYears = window.AppConfig?.defaults?.projectYears || 20;
        const days = window.inputApps?.currentInputs?.daysPerYear || 334;
        const annualTotals = new Array(projectYears + 1).fill(0);

        this.adminItems.forEach(item => {
            const qty = parseFloat(item.quantity) || 1;
            const val = parseFloat(item.value) || 0;
            const freqType = item.freqType || 'yearly';

            let annualCost = 0;
            if (freqType === 'monthly') {
                annualCost = qty * val * 12;
            } else if (freqType === 'yearly') {
                annualCost = qty * val;
            }

            for (let year = 1; year <= projectYears; year++) {
                let applyCost = false;

                if (freqType === 'every_n') {
                    const n = parseInt(item.customN) || 5;
                    applyCost = (year % n === 0);
                    if (applyCost) annualTotals[year] += qty * val;
                } else if (freqType === 'period') {
                    const start = parseInt(item.startYear) || 1;
                    const end = parseInt(item.endYear) || projectYears;
                    applyCost = (year >= start && year <= end);
                    if (applyCost) annualTotals[year] += annualCost;
                } else {
                    annualTotals[year] += annualCost;
                }
            }
        });

        return annualTotals;
    }
}

// Attach to window and instantiate
window.adminApp = new AdminCostManager('content-area');
window.adminApp.init();
