class InputManager {
    constructor() {
        this.container = document.getElementById('content-area');

        // Load Defaults from Config or fallback
        const appConfig = window.AppConfig || {};
        const defaults = appConfig.defaults || {};
        const initialOpex = defaults.initialOpex || [];

        // Initialize with defaults to support calculation without rendering
        this.currentInputs = JSON.parse(JSON.stringify(defaults)); // Deep Copy

        // Safety Fallback if config failed
        if (Object.keys(this.currentInputs).length === 0) {
            console.warn("Config not loaded, using hardcoded fallback.");
            this.currentInputs = {
                capacity: 10, projectYears: 25, powerFactor: 0.95, hoursPerDay: 24,
                revenue: { peakRate: 4.5, peakHours: 13, offPeakRate: 2.6, escalation: 0, adderPrice: 0, adderYears: 7 },
                degradation: 0.5,
                capex: { construction: 20, machinery: 50, land: 10, sharePremium: 0, others: 0 },
                finance: { debtRatio: 70, interestRate: 5.0, loanTerm: 10, taxRate: 20, opexInflation: 1.5, taxHoliday: 0 },
                personnel: []
            };
        }

        this.state = {
            opexItems: JSON.parse(JSON.stringify(initialOpex))
        };
        this.lastResults = null;

        // Initialize Strategies
        this.strategies = {
            POWER: new PowerModel(),
            SOLAR: new PowerModel(), // Solar uses same logic as Power for now
            WATER: new WaterModel(),
            WASTE: new WasteModel()
        };
    }

    renderInputs() {
        const fmt = (v) => (Number(v) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

        // 1. Determine Model Config
        const modelType = this.currentInputs.modelType || 'POWER';
        const modelConfig = window.AppConfig.models[modelType] || window.AppConfig.models.POWER;
        const labels = modelConfig.labels;
        const units = modelConfig.units;

        this.container.innerHTML = `
            <div class="three-column-layout">
                
                <!-- 1. Technical & Revenue -->
                <div class="card glass-panel col-item">
                    <h3><i class="fa-solid ${modelConfig.icon}"></i> ${modelConfig.name} Parameters</h3>
                    
                    <div class="row">
                        <div class="form-group">
                            <label>${labels.capacity}</label>
                            <input type="text" id="capacity" value="${fmt(this.currentInputs.capacity)}" onchange="inputApps.evaluateMathInput(this)">
                        </div>
                        <div class="form-group">
                            <label>Efficiency / Loss (%)</label>
                             <input type="text" id="degradation" value="${fmt(this.currentInputs.degradation || this.currentInputs.revenue.lossRate || 0)}" onchange="inputApps.evaluateMathInput(this)">
                        </div>
                    </div>

                    <div class="row">
                         <div class="form-group">
                            <label>Duration (Yrs)</label>
                            <input type="text" id="projectYears" value="${fmt(this.currentInputs.projectYears)}" onchange="inputApps.evaluateMathInput(this)">
                        </div>
                        <div class="form-group">
                            <label>Days/Yr</label>
                            <input type="text" id="daysPerYear" value="${fmt(this.currentInputs.daysPerYear || 365)}" onchange="inputApps.evaluateMathInput(this)">
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="form-group">
                            <label>Power Factor</label>
                            <input type="text" id="powerFactor" value="${fmt(this.currentInputs.powerFactor || 0.90)}" step="0.01" onchange="inputApps.evaluateMathInput(this)">
                        </div>
                        <div class="form-group">
                            <label>Rev Escalation %</label>
                            <input type="text" id="revenueEscalation" value="${fmt(this.currentInputs.revenue.escalation || 0)}" step="0.1" onchange="inputApps.evaluateMathInput(this)">
                        </div>
                    </div>
                    
                    ${this.renderRevenueInputs(modelType, fmt)}
                </div>

                <!-- 2. CAPEX (Investment) -->
                <div class="card glass-panel col-item">
                    <h3><i class="fa-solid fa-coins"></i> CAPEX</h3>
                    
                    <div class="form-group">
                        <label>Construction (M)</label>
                        <input type="text" id="costConstruction" value="${fmt(this.currentInputs.capex.construction)}" onchange="inputApps.evaluateMathInput(this)">
                    </div>

                    <div class="form-group">
                        <label>Machinery (M)</label>
                        <input type="text" id="costMachinery" value="${fmt(this.currentInputs.capex.machinery)}" onchange="inputApps.evaluateMathInput(this)">
                    </div>

                    <div class="form-group">
                        <label>Land (M)</label>
                        <input type="text" id="costLand" value="${fmt(this.currentInputs.capex.land)}" onchange="inputApps.evaluateMathInput(this)">
                    </div>

                    <div class="form-group">
                        <label>Share Premium (M)</label>
                        <input type="text" id="costSharePremium" value="${fmt(this.currentInputs.capex.sharePremium || 0)}" onchange="inputApps.evaluateMathInput(this)">
                    </div>

                    <div class="form-group">
                        <label>Others (M)</label>
                        <input type="text" id="costOthers" value="${fmt(this.currentInputs.capex.others || 0)}" onchange="inputApps.evaluateMathInput(this)">
                    </div>

                    <div class="total-display compact">
                        <span>Total:</span>
                        <span id="totalCapex" class="highlight">0 M</span>
                    </div>

                     <!-- Additional Revenue Streams (Small Section) -->
                    <div class="divider"></div>
                    <div class="card-header" style="margin-bottom: 5px;">
                        <h4 style="margin:0;"><i class="fa-solid fa-hand-holding-dollar"></i> Other Revenue</h4>
                        <button class="btn btn-primary btn-sm" onclick="inputApps.addOtherRevenueItem()">
                            <i class="fa-solid fa-plus"></i> Add
                        </button>
                    </div>
                    <div id="other-revenue-list" class="opex-container" style="max-height: 150px; overflow-y: auto;">
                        <!-- Items injected here -->
                    </div>

                </div>

                <!-- 3. Financial Structure -->
                <div class="card glass-panel col-item">
                    <h3><i class="fa-solid fa-building-columns"></i> Financial Structure</h3>

                    <div class="form-group">
                        <label>Debt Ratio (%)</label>
                        <input type="text" id="debtRatio" value="${fmt(this.currentInputs.finance.debtRatio)}" max="100" onchange="inputApps.evaluateMathInput(this)">
                    </div>

                    <div class="row">
                        <div class="form-group">
                            <label>Interest %</label>
                            <input type="text" id="interestRate" value="${fmt(this.currentInputs.finance.interestRate)}" step="0.1" onchange="inputApps.evaluateMathInput(this)">
                        </div>
                        <div class="form-group">
                            <label>Loan Term</label>
                            <input type="text" id="loanTerm" value="${fmt(this.currentInputs.finance.loanTerm)}" onchange="inputApps.evaluateMathInput(this)">
                        </div>
                    </div>

                    <div class="row">
                        <div class="form-group">
                            <label>Corp Tax %</label>
                            <input type="text" id="taxRate" value="${fmt(this.currentInputs.finance.taxRate)}" onchange="inputApps.evaluateMathInput(this)">
                        </div>
                        <div class="form-group">
                            <label>Cost Inf %</label>
                            <input type="text" id="opexInflation" value="${fmt(this.currentInputs.finance.opexInflation)}" step="0.1" onchange="inputApps.evaluateMathInput(this)">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Tax Holiday (Yrs)</label>
                        <input type="text" id="taxHoliday" value="${fmt(this.currentInputs.finance.taxHoliday || 0)}" onchange="inputApps.evaluateMathInput(this)">
                    </div>

                    <div class="action-spacer" style="margin-top: auto; padding-top: 20px;">
                        <button class="btn btn-primary full-width-btn" onclick="inputApps.userTriggerCalculate()">
                            <i class="fa-solid fa-calculator"></i> Calculate
                        </button>
                    </div>
                </div>

            </div>

            <!-- OPEX Section (Full row below) -->
            <div class="card glass-panel full-width" style="margin-top: 16px;">
                <div class="card-header">
                    <h3><i class="fa-solid fa-screwdriver-wrench"></i> Operation Cost (Fixed)</h3>
                    <button class="btn btn-primary btn-sm" onclick="inputApps.addOpexItem()">
                        <i class="fa-solid fa-plus"></i> Add Item
                    </button>
                </div>

                <div class="opex-header compact-row" style="padding: 0 0 5px 0; font-weight: bold; color: #666; font-size: 0.9em; border-bottom: 2px solid #eee; margin-bottom: 8px;">
                    <span class="grow-2">Description</span>
                    <span class="grow-1">Type</span>
                    <span style="width: 80px;">Qty</span>
                    <span class="grow-1">Unit Price</span>
                    <span class="grow-1">Frequency</span>
                    <span style="width: 32px;"></span> <!-- Spacer for delete button -->
                </div>

                <div id="opex-list" class="opex-container">
                    <!-- Items injected here -->
                </div>
            </div>
        `;

        this.updateCapexTotal();
        this.renderOpexList();
        this.renderOtherRevenueList();
        this.attachListeners();
    }

    renderRevenueInputs(modelType, fmt) {
        let html = '<div class="divider"></div>';

        if (modelType === 'POWER' || modelType === 'SOLAR') {
            html += `
                <div class="row">
                    <div class="form-group">
                        <label>Peak Rate (THB)</label>
                        <input type="text" id="pricePeak" value="${fmt(this.currentInputs.revenue.peakRate)}" onchange="inputApps.evaluateMathInput(this)">
                    </div>
                    <div class="form-group">
                        <label>Peak Hrs/Day</label>
                        <input type="text" id="hoursPeak" value="${fmt(this.currentInputs.revenue.peakHours)}" onchange="inputApps.evaluateMathInput(this)">
                    </div>
                </div>
                <div class="row">
                    <div class="form-group">
                        <label>Off-Peak Rate</label>
                        <input type="text" id="priceOffPeak" value="${fmt(this.currentInputs.revenue.offPeakRate)}" onchange="inputApps.evaluateMathInput(this)">
                    </div>
                    <div class="form-group">
                        <label>Hrs/Day</label>
                        <input type="text" id="hoursPerDay" value="${fmt(this.currentInputs.hoursPerDay)}" onchange="inputApps.evaluateMathInput(this)">
                    </div>
                </div>
                 <div class="row">
                    <div class="form-group">
                        <label>Adder (THB)</label>
                        <input type="text" id="adderPrice" value="${fmt(this.currentInputs.revenue.adderPrice || 0)}" onchange="inputApps.evaluateMathInput(this)">
                    </div>
                    <div class="form-group">
                        <label>Adder Yrs</label>
                        <input type="text" id="adderYears" value="${fmt(this.currentInputs.revenue.adderYears || 0)}" onchange="inputApps.evaluateMathInput(this)">
                    </div>
                </div>
            `;
        } else if (modelType === 'WATER') {
            html += `
                 <div class="form-group">
                    <label>Unit Price (THB/m³)</label>
                    <input type="text" id="unitPrice" value="${fmt(this.currentInputs.revenue.unitPrice)}" onchange="inputApps.evaluateMathInput(this)">
                </div>
            `;
        } else if (modelType === 'WASTE') {
            html += `
                 <div class="form-group">
                    <label>Tipping Fee (THB/Ton)</label>
                    <input type="text" id="tippingFee" value="${fmt(this.currentInputs.revenue.tippingFee)}" onchange="inputApps.evaluateMathInput(this)">
                </div>
            `;
        }

        // Common Escalation
        html += `
            <div class="form-group">
                <label>Price Escalation %</label>
                <input type="text" id="revenueEscalation" value="${fmt(this.currentInputs.revenue.escalation)}" onchange="inputApps.evaluateMathInput(this)">
            </div>
        `;

        return html;
    }

    resetToDefaults() {
        if (confirm("Are you sure you want to reset all inputs to defaults? This will clear your saved data.")) {
            if (window.StorageManager && typeof window.StorageManager.deleteAllSaves === 'function') {
                window.StorageManager.deleteAllSaves();
            } else {
                console.warn("StorageManager.deleteAllSaves not found");
                // Attempt manual cleanup based on prefix
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('feasibility_project_')) {
                        localStorage.removeItem(key);
                    }
                }
            }
            window.location.reload();
        }
    }

    renderOpexList() {
        const list = document.getElementById('opex-list');
        if (!list) return;
        list.innerHTML = '';

        this.state.opexItems.forEach((item, index) => {
            const freqType = item.freqType || 'yearly';

            let extraInputs = '';
            if (freqType === 'every_n') {
                extraInputs = `<input type="number" class="input-compact" style="width: 60px;" placeholder="Years" 
                    value="${item.customN || 5}" onchange="inputApps.updateOpex(${index}, 'customN', this.value)" title="Every N Years">`;
            } else if (freqType === 'period') {
                extraInputs = `
                    <input type="number" class="input-compact" style="width: 50px;" placeholder="Start" 
                        value="${item.startYear || 1}" onchange="inputApps.updateOpex(${index}, 'startYear', this.value)" title="Start Year">
                    <span style="font-size:12px; color:#666;">-</span>
                    <input type="number" class="input-compact" style="width: 50px;" placeholder="End" 
                        value="${item.endYear || 25}" onchange="inputApps.updateOpex(${index}, 'endYear', this.value)" title="End Year">
                `;
            }

            const html = `
                <div class="opex-item compact-row">
                    <input type="text" class="input-compact grow-2" placeholder="Item Name" 
                           value="${item.name}" onchange="inputApps.updateOpex(${index}, 'name', this.value)" title="Expense Name">
                    
                    <select class="input-compact grow-1" onchange="inputApps.updateOpex(${index}, 'type', this.value)" title="Cost Type">
                        <option value="fixed" ${item.type === 'fixed' ? 'selected' : ''}>Fixed (THB)</option>
                        <option value="per_mw_prod" ${(item.type === 'per_mw_prod' || item.type === 'per_mw') ? 'selected' : ''}>THB / MW (Prod)</option>
                        <option value="per_mw_sales" ${item.type === 'per_mw_sales' ? 'selected' : ''}>THB / MW (Sales)</option>
                        <option value="percent_capex" ${item.type === 'percent_capex' ? 'selected' : ''}>% CAPEX</option>
                    </select>

                    <input type="text" class="input-compact" style="width: 80px;" placeholder="Qty" 
                           value="${(parseFloat(item.quantity) || 1).toLocaleString('en-US')}" onchange="inputApps.evaluateMathInput(this); inputApps.updateOpex(${index}, 'quantity', this.value)" title="Quantity">

                    <input type="text" class="input-compact grow-1" placeholder="Value (e.g. 50*12)" 
                           value="${(parseFloat(item.value) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}" onchange="inputApps.handleOpexValueChange(${index}, this)" title="Unit Price">

                    <div class="grow-1" style="display:flex; gap:4px; align-items:center;">
                        <select class="input-compact" style="flex:1; min-width:80px;" onchange="inputApps.updateOpex(${index}, 'freqType', this.value)" title="Frequency">
                            <option value="daily" ${freqType === 'daily' ? 'selected' : ''}>Per Day (Op. Days)</option>
                            <option value="monthly" ${freqType === 'monthly' ? 'selected' : ''}>Per Month</option>
                            <option value="yearly" ${freqType === 'yearly' ? 'selected' : ''}>Per Year</option>
                            <option value="every_n" ${freqType === 'every_n' ? 'selected' : ''}>Every N Years</option>
                            <option value="period" ${freqType === 'period' ? 'selected' : ''}>Custom Period</option>
                        </select>
                        ${extraInputs}
                    </div>

                    <button class="btn btn-danger btn-icon btn-sm" onclick="inputApps.removeOpex(${index})" title="Remove">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
            `;
            list.insertAdjacentHTML('beforeend', html);
        });
    }

    handleOpexValueChange(index, inputElement) {
        let valueStr = inputElement.value;
        // Remove existing commas for calculation
        valueStr = valueStr.replace(/,/g, '');

        // Allow numbers, math operators, decimals, and spaces
        if (/^[0-9+\-*/().\s]+$/.test(valueStr)) {
            try {
                // Safe evaluation
                const result = Function('"use strict";return (' + valueStr + ')')();
                if (isFinite(result)) {
                    // Update UI with comma formatting
                    inputElement.value = result.toLocaleString('en-US', { maximumFractionDigits: 2 });
                    this.updateOpex(index, 'value', result); // Ensure state is updated with Number
                    return;
                }
            } catch (e) {
                console.warn("Invalid math expression", e);
            }
        }

        // Fallback parsing
        const num = parseFloat(valueStr);
        if (!isNaN(num)) {
            this.updateOpex(index, 'value', num);
        } else {
            this.updateOpex(index, 'value', valueStr);
        }
    }

    evaluateMathInput(inputElement) {
        let valueStr = inputElement.value;
        // Remove existing commas for calculation
        valueStr = valueStr.replace(/,/g, '');

        // Allow numbers, math operators, decimals, and spaces
        if (/^[0-9+\-*/().\s]+$/.test(valueStr)) {
            try {
                // Safe evaluation
                const result = Function('"use strict";return (' + valueStr + ')')();
                if (isFinite(result)) {
                    // Format with commas and optional decimals
                    inputElement.value = result.toLocaleString('en-US', { maximumFractionDigits: 2 });
                }
            } catch (e) {
                // Ignore invalid
            }
        }
    }

    addOpexItem() {
        this.state.opexItems.push({
            id: Date.now(),
            name: '',
            type: 'fixed',
            value: 0,
            quantity: 1,
            freqType: 'yearly',
            customN: 5,
            startYear: 1,
            endYear: 25
        });
        this.renderOpexList();
    }

    removeOpex(index) {
        this.state.opexItems.splice(index, 1);
        this.renderOpexList();
    }

    updateOpex(index, field, value) {
        this.state.opexItems[index][field] = value;
        this.renderOpexList();
    }

    attachListeners() {
        // Auto-calculate CAPEX total
        const capexInputs = ['costConstruction', 'costMachinery', 'costLand', 'costSharePremium', 'costOthers'];
        capexInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => this.updateCapexTotal());
        });
    }

    updateCapexTotal() {
        if (!document.getElementById('costConstruction')) return;
        const getVal = (id) => parseFloat(document.getElementById(id)?.value?.replace(/,/g, '') || 0);

        const construction = getVal('costConstruction');
        const machinery = getVal('costMachinery');
        const land = getVal('costLand');
        const sharePremium = getVal('costSharePremium');
        const others = getVal('costOthers');

        const total = construction + machinery + land + sharePremium + others;

        const totalEl = document.getElementById('totalCapex');
        if (totalEl) totalEl.textContent = total.toLocaleString() + ' M THB';
        return total;
    }

    getInputs() {
        // If inputs are in DOM, update state. If not, return state.
        const capEl = document.getElementById('capacity');
        if (capEl) {
            // Helper to safe parse with comma support
            const getValue = (id) => {
                const el = document.getElementById(id);
                if (!el) return 0;
                // Remove commas and parse
                const clean = el.value.replace(/,/g, '');
                return parseFloat(clean) || 0;
            };

            // DOM is present, scrape it
            const cachedPersonnel = this.currentInputs.personnel || [];
            const cachedDetailedOpex = this.currentInputs.detailedOpex || [];
            this.currentInputs = {
                modelType: this.currentInputs.modelType || 'POWER', // PRESERVE MODEL TYPE
                productionCapacity: getValue('productionCapacity') || getValue('capacity'),
                capacity: getValue('capacity'),
                projectYears: getValue('projectYears') || 25, // default if 0
                powerFactor: getValue('powerFactor'),
                hoursPerDay: getValue('hoursPerDay'),
                daysPerYear: getValue('daysPerYear') || 365,
                degradation: getValue('degradation'),

                revenue: {
                    peakRate: getValue('pricePeak'),
                    peakHours: getValue('hoursPeak'),
                    offPeakRate: getValue('priceOffPeak'),
                    escalation: getValue('revenueEscalation'),
                    adderPrice: getValue('adderPrice'),
                    adderYears: getValue('adderYears'),

                    // Generic
                    unitPrice: getValue('unitPrice'),
                    tippingFee: getValue('tippingFee'),
                    lossRate: getValue('degradation') // reused input id
                },

                capex: {
                    construction: getValue('costConstruction'),
                    machinery: getValue('costMachinery'),
                    land: getValue('costLand'),
                    sharePremium: getValue('costSharePremium'),
                    others: getValue('costOthers')
                },

                finance: {
                    debtRatio: getValue('debtRatio'),
                    interestRate: getValue('interestRate'),
                    loanTerm: getValue('loanTerm'),
                    taxRate: getValue('taxRate'),
                    opexInflation: getValue('opexInflation'),
                    taxHoliday: getValue('taxHoliday')
                },

                personnel: cachedPersonnel,
                personnelWelfarePercent: getValue('personnelWelfarePercent') || 0,
                detailedOpex: cachedDetailedOpex
            };
        }

        // Return full object state with applied multipliers for calculation
        return {
            ...this.currentInputs,
            capex: {
                construction: (this.currentInputs.capex.construction || 0) * 1000000,
                machinery: (this.currentInputs.capex.machinery || 0) * 1000000,
                land: (this.currentInputs.capex.land || 0) * 1000000,
                sharePremium: (this.currentInputs.capex.sharePremium || 0) * 1000000,
                others: (this.currentInputs.capex.others || 0) * 1000000
            },
            opex: this.state.opexItems,
            otherRevenue: this.currentInputs.otherRevenue || []
        };
    }

    // --- Other Revenue Management ---
    renderOtherRevenueList() {
        const list = document.getElementById('other-revenue-list');
        if (!list) return;
        list.innerHTML = '';

        const items = this.currentInputs.otherRevenue || [];
        items.forEach((item, index) => {
            const html = `
                <div class="opex-item compact-row">
                    <input type="text" class="input-compact grow-2" placeholder="Description (e.g. Carbon Credit)" 
                           value="${item.name}" onchange="inputApps.updateOtherRevenue(${index}, 'name', this.value)">
                    
                    <select class="input-compact grow-1" onchange="inputApps.updateOtherRevenue(${index}, 'freqType', this.value)">
                        <option value="yearly" ${item.freqType === 'yearly' ? 'selected' : ''}>Yearly (Fixed)</option>
                        <option value="monthly" ${item.freqType === 'monthly' ? 'selected' : ''}>Monthly</option>
                        <option value="per_unit" ${item.freqType === 'per_unit' ? 'selected' : ''}>Per Output Unit</option>
                    </select>

                    <input type="text" class="input-compact grow-1" placeholder="Amount" 
                           value="${(parseFloat(item.amount) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}" 
                           onchange="inputApps.updateOtherRevenue(${index}, 'amount', this.value)">

                    <input type="number" class="input-compact" style="width: 60px;" placeholder="Esc%" 
                           value="${item.escalation || 0}" onchange="inputApps.updateOtherRevenue(${index}, 'escalation', this.value)" title="Escalation %">

                    <button class="btn btn-danger btn-icon btn-sm" onclick="inputApps.removeOtherRevenue(${index})">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
            `;
            list.insertAdjacentHTML('beforeend', html);
        });
    }

    addOtherRevenueItem() {
        if (!this.currentInputs.otherRevenue) this.currentInputs.otherRevenue = [];
        this.currentInputs.otherRevenue.push({
            id: Date.now(),
            name: '',
            freqType: 'yearly',
            amount: 0,
            escalation: 0
        });
        this.renderOtherRevenueList();
    }

    removeOtherRevenue(index) {
        this.currentInputs.otherRevenue.splice(index, 1);
        this.renderOtherRevenueList();
    }

    updateOtherRevenue(index, field, value) {
        if (field === 'amount') {
            // Handle comma inputs
            value = parseFloat(value.replace(/,/g, '')) || 0;
        }
        this.currentInputs.otherRevenue[index][field] = value;
        this.renderOtherRevenueList();
    }

    setState(data) {
        if (!data || !data.inputs) {
            console.warn("Invalid data for setState");
            return;
        }

        const inputs = data.inputs;

        // Sync Memory
        this.currentInputs = {
            ...this.currentInputs,
            ...inputs,
            revenue: { ...this.currentInputs.revenue, ...(inputs.revenue || {}) },
            capex: { ...this.currentInputs.capex, ...(inputs.capex || {}) },
            finance: { ...this.currentInputs.finance, ...(inputs.finance || {}) },

            personnel: inputs.personnel || this.currentInputs.personnel || [],
            personnel: inputs.personnel || this.currentInputs.personnel || [],
            personnelWelfarePercent: (inputs.personnelWelfarePercent !== undefined) ? inputs.personnelWelfarePercent : 0,
            detailedOpex: inputs.detailedOpex || this.currentInputs.detailedOpex || []
        };

        // Sync OPEX
        if (inputs.opex && Array.isArray(inputs.opex)) {
            this.state.opexItems = inputs.opex;
        }

        // Sync DOM if exists
        const capEl = document.getElementById('capacity');
        if (capEl) {
            // Helper to safely set value
            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el && val !== undefined && val !== null) el.value = val;
            };

            setVal('productionCapacity', inputs.productionCapacity);
            setVal('capacity', inputs.capacity);
            setVal('projectYears', inputs.projectYears);
            setVal('powerFactor', inputs.powerFactor);
            setVal('hoursPerDay', inputs.hoursPerDay);
            setVal('daysPerYear', inputs.daysPerYear);
            setVal('degradation', inputs.degradation);

            if (inputs.revenue) {
                setVal('pricePeak', inputs.revenue.peakRate);
                setVal('hoursPeak', inputs.revenue.peakHours);
                setVal('priceOffPeak', inputs.revenue.offPeakRate);
                setVal('revenueEscalation', inputs.revenue.escalation);
                setVal('adderPrice', inputs.revenue.adderPrice);
                setVal('adderYears', inputs.revenue.adderYears);
                setVal('unitPrice', inputs.revenue.unitPrice);
                setVal('tippingFee', inputs.revenue.tippingFee);
            }

            // CAPEX (Convert back to Millions for display)
            if (inputs.capex) {
                setVal('costConstruction', inputs.capex.construction / 1000000);
                setVal('costMachinery', inputs.capex.machinery / 1000000);
                setVal('costLand', inputs.capex.land / 1000000);
                setVal('costSharePremium', inputs.capex.sharePremium ? inputs.capex.sharePremium / 1000000 : 0);
                setVal('costOthers', inputs.capex.others ? inputs.capex.others / 1000000 : 0);
            }

            // Financial
            if (inputs.finance) {
                setVal('debtRatio', inputs.finance.debtRatio);
                setVal('interestRate', inputs.finance.interestRate);
                setVal('loanTerm', inputs.finance.loanTerm);
                setVal('taxRate', inputs.finance.taxRate);
                setVal('opexInflation', inputs.finance.opexInflation);
                setVal('taxHoliday', inputs.finance.taxHoliday);
            }

            this.renderOpexList();
            this.updateCapexTotal();
        }
    }

    calculate(customInputs = null, isSimulation = false, simulationEvents = []) {
        const inputs = customInputs || this.getInputs();

        // --- 1. Generate Parameters ---
        const projectYears = inputs.projectYears || window.AppConfig?.constants?.defaultProjectYears || 20;
        const discountRate = window.AppConfig?.constants?.discountRate || 0.07;

        // Finance Params
        const totalCapex = inputs.capex.construction + inputs.capex.machinery + inputs.capex.land + (inputs.capex.sharePremium || 0) + (inputs.capex.others || 0);
        const debtRatio = (inputs.finance.debtRatio || 0) / 100;
        const loanAmount = totalCapex * debtRatio;
        const equityAmount = totalCapex - loanAmount;

        // Simulation Overrides
        let simInterestRate = (inputs.finance.interestRate || 0) / 100;
        let simOpexInflation = (inputs.finance.opexInflation || 0) / 100;
        let simTaxRate = (inputs.finance.taxRate || 0) / 100;

        // Check for Global Simulation Overrides
        if (simulationEvents && simulationEvents.length > 0) {
            simulationEvents.forEach(e => {
                if (e.type === 'global_interest') simInterestRate = parseFloat(e.value) / 100;
                if (e.type === 'global_inflation') simOpexInflation = parseFloat(e.value) / 100;
                if (e.type === 'global_tax') simTaxRate = parseFloat(e.value) / 100;
            });
        }

        const loanTerm = inputs.finance.loanTerm || 10;
        const annualDebtService = FinancialCalculator.pmt(simInterestRate, loanTerm, loanAmount);

        const revenueEscalation = (inputs.revenue.escalation || 0) / 100;
        const taxHoliday = inputs.finance.taxHoliday || 0;
        const degradationRate = (inputs.degradation || 0) / 100;

        // Adder Params
        const adderPrice = inputs.revenue.adderPrice || 0;
        const adderYears = inputs.revenue.adderYears || 0;

        // Depreciation (Straight Line)
        const depreciableAsset = inputs.capex.construction + inputs.capex.machinery + (inputs.capex.others || 0);
        const annualDepreciation = depreciableAsset / projectYears;

        // --- 2. Base Constants for Revenue ---
        // We will recalculate actual revenue inside the loop to support dynamic changes
        const baseCapacityKW = inputs.capacity * 1000;
        const days = inputs.daysPerYear || 365;

        // --- 4. Generate Cash Flow Array ---
        let projectCashFlows = new Array(projectYears + 1).fill(0);
        let equityCashFlows = new Array(projectYears + 1).fill(0);
        let costsArray = new Array(projectYears + 1).fill(0);
        let energyArray = new Array(projectYears + 1).fill(0);

        // Detailed Arrays
        let annualRevenue = new Array(projectYears + 1).fill(0);
        let annualOpex = new Array(projectYears + 1).fill(0);
        let annualEbitda = new Array(projectYears + 1).fill(0);
        let annualDepreciationArr = new Array(projectYears + 1).fill(0);
        let annualEbit = new Array(projectYears + 1).fill(0);
        let annualInterest = new Array(projectYears + 1).fill(0);
        let annualTax = new Array(projectYears + 1).fill(0);
        let annualNetIncome = new Array(projectYears + 1).fill(0);
        let annualPrincipal = new Array(projectYears + 1).fill(0);
        let annualFixedCost = new Array(projectYears + 1).fill(0);
        let annualVariableCost = new Array(projectYears + 1).fill(0);
        let annualFinanceCost = new Array(projectYears + 1).fill(0);

        // Itemized OPEX tracking: Array of objects { "Item Name": cost, ... }
        let annualItemizedOpex = new Array(projectYears + 1).fill(null);

        // Year 0
        projectCashFlows[0] = -totalCapex;
        costsArray[0] = totalCapex;
        equityCashFlows[0] = -equityAmount;
        annualItemizedOpex[0] = {}; // No OPEX in year 0 usually

        // Debt Service Arrays
        let annualLoanBalance = new Array(projectYears + 1).fill(0);
        let annualDSCR = new Array(projectYears + 1).fill(0);

        // Loop
        let currentLoanBalance = loanAmount;

        // Additional Loans Array (supports multiple loans)
        let additionalLoans = [];

        // Initialize Admin Costs
        let adminCosts = [];
        if (window.adminApp && typeof window.adminApp.getAnnualCosts === 'function') {
            adminCosts = window.adminApp.getAnnualCosts();
        }

        for (let year = 1; year <= projectYears; year++) {

            // --- Simulation Logic ---
            let simPricePeak = inputs.revenue.peakRate;
            let simPriceOffPeak = inputs.revenue.offPeakRate;
            let simCapacity = inputs.capacity;
            let simOpexPct = 0; // Cumulative % change
            let simOpexAbs = 0; // Cumulative Absolute change
            let yearLoanProceeds = 0; // Track loan inflows separately

            if (simulationEvents && simulationEvents.length > 0) {
                simulationEvents.forEach(e => {
                    const isActive = year >= e.startYear && year <= (e.endYear || projectYears);

                    // Activate Additional Loan at specific year
                    if (e.type === 'new_loan' && year === parseInt(e.startYear)) {
                        const amt = parseFloat(e.amount) || 0;
                        const term = parseInt(e.term) || parseInt(e.endYear) || 10;
                        const rate = (parseFloat(e.rate) || 0) / 100;

                        if (amt > 0) {
                            additionalLoans.push({
                                balance: amt,
                                rate: rate,
                                termEnd: year + term - 1,
                                payment: FinancialCalculator.pmt(rate, term, amt)
                            });

                            // Cash Inflow from borrowing
                            yearLoanProceeds += amt;
                        }
                    }

                    if (isActive) {
                        const val = parseFloat(e.value) || 0;

                        if (e.type === 'capacity') {
                            if (e.mode === 'absolute') simCapacity = val;
                            else if (e.mode === 'delta') simCapacity += val;
                            else if (e.mode === 'percent') simCapacity *= (1 + (val / 100));
                        }
                        else if (e.type === 'price_peak') {
                            if (e.mode === 'absolute') simPricePeak = val;
                            else if (e.mode === 'delta') simPricePeak += val;
                            else if (e.mode === 'percent') simPricePeak *= (1 + (val / 100));
                        }
                        else if (e.type === 'price_offpeak') {
                            if (e.mode === 'absolute') simPriceOffPeak = val;
                            else if (e.mode === 'delta') simPriceOffPeak += val;
                            else if (e.mode === 'percent') simPriceOffPeak *= (1 + (val / 100));
                        }
                        else if (e.type === 'expense_opex') {
                            if (e.mode === 'absolute') simOpexAbs += val;
                            else if (e.mode === 'percent') simOpexPct += val;
                        }
                    }
                });
            }

            // --- Recalculate Revenue with Simulation Params ---
            const escalationFactor = Math.pow(1 + revenueEscalation, year - 1);
            const inflationFactor = Math.pow(1 + simOpexInflation, year - 1);

            // Degradation applies to Output/Efficiency
            const degradationFactor = Math.pow(1 - degradationRate, year - 1);
            const personnelMultiplier = 1 + ((inputs.personnelWelfarePercent || 0) / 100);

            // Determine Model Logic
            const modelType = inputs.modelType || 'POWER';

            // Strategy Execution
            const strategy = this.strategies[modelType] || this.strategies['POWER'];
            const revParams = {
                degradationFactor,
                escalationFactor,
                days,
                simCapacity,
                simPricePeak,
                simPriceOffPeak
            };

            const { revenue: yearBaseRevenue, totalEnergy: yearTotalEnergy } = strategy.calculateRevenue(inputs, year, revParams);

            // --- Additional Revenue Streams ---
            let yearOtherRevenue = 0;
            if (inputs.otherRevenue && Array.isArray(inputs.otherRevenue)) {
                inputs.otherRevenue.forEach(item => {
                    const fType = item.freqType || 'yearly';
                    let multiplier = 0;

                    // Frequency Check
                    if (fType === 'yearly') multiplier = 1;
                    else if (fType === 'monthly') multiplier = 12;
                    else if (fType === 'daily') multiplier = inputs.daysPerYear || 365;
                    else if (fType === 'per_unit') multiplier = yearTotalEnergy; // e.g. Carbon Credit per unit

                    if (multiplier > 0) {
                        const price = parseFloat(item.amount) || 0;
                        const esc = (parseFloat(item.escalation) || 0) / 100;
                        const itemEscalation = Math.pow(1 + esc, year - 1);

                        yearOtherRevenue += (price * multiplier * itemEscalation);
                    }
                });
            }

            // --- Simulation: Extra Revenue ---
            if (simulationEvents && simulationEvents.length > 0) {
                simulationEvents.forEach(e => {
                    if (e.type === 'extra_revenue' && year >= e.startYear && year <= (e.endYear || e.startYear)) {
                        const val = parseFloat(e.value) || 0;
                        // Mode check? Usually absolute for lumpsum
                        if (e.mode === 'percent') {
                            yearOtherRevenue += (yearBaseRevenue * (val / 100));
                        } else {
                            yearOtherRevenue += val;
                        }
                    }
                });
            }

            const yearRevenue = yearBaseRevenue + yearOtherRevenue;

            annualRevenue[year] = yearRevenue;

            let yearOpex = 0;
            let yearFixed = 0;
            let yearVariable = 0;
            let yearItemized = {};

            inputs.opex.forEach(item => {
                let multiplier = 0;
                const fType = item.freqType || 'yearly';

                if (fType === 'daily') multiplier = inputs.daysPerYear || 365;
                else if (fType === 'monthly') multiplier = 12;
                else if (fType === 'yearly') multiplier = 1;
                else if (fType === 'every_n') {
                    const n = parseInt(item.customN) || 5;
                    if (year % n === 0) multiplier = 1;
                } else if (fType === 'period') {
                    const s = parseInt(item.startYear) || 1;
                    const e = parseInt(item.endYear) || projectYears;
                    if (year >= s && year <= e) multiplier = 1;
                } else {
                    const oldFreq = item.frequency || 1;
                    if (oldFreq === 1 || year % oldFreq === 0) multiplier = 1;
                }

                let cost = 0;
                if (multiplier > 0) {
                    const qty = parseFloat(item.quantity) || 1;
                    let baseCost = 0;
                    if (item.type === 'fixed') baseCost = item.value;
                    else if (item.type === 'per_mw_prod' || item.type === 'per_mw') baseCost = item.value * (inputs.productionCapacity || inputs.capacity);
                    else if (item.type === 'per_mw_sales') baseCost = item.value * inputs.capacity;
                    else if (item.type === 'percent_capex') baseCost = (item.value / 100) * totalCapex;
                    else if (item.type === 'percent_machinery') baseCost = (item.value / 100) * (inputs.capex.machinery || 0);
                    else if (item.type === 'percent_const_mach') baseCost = (item.value / 100) * ((inputs.capex.construction || 0) + (inputs.capex.machinery || 0));

                    baseCost *= qty;
                    cost = baseCost * multiplier * inflationFactor;
                }

                yearOpex += cost;
                yearFixed += cost;
                yearItemized[item.name] = (yearItemized[item.name] || 0) + cost;
            });

            // --- Personnel Costs ---
            if (inputs.personnel && Array.isArray(inputs.personnel)) {
                let totalPersonnel = 0;
                inputs.personnel.forEach(job => {
                    const count = parseFloat(job.count) || 0;
                    if (count > 0) {
                        const salary = parseFloat(job.salary) || 0;
                        const bonus = parseFloat(job.bonus) || 0;
                        const increase = parseFloat(job.increase) || 0;

                        const annualPerHead = (salary * 12) + (salary * bonus);
                        const growthFactor = Math.pow(1 + (increase / 100), year - 1);
                        const totalJobCost = annualPerHead * count * growthFactor * personnelMultiplier;

                        totalPersonnel += totalJobCost;
                        yearOpex += totalJobCost;
                        yearFixed += totalJobCost;
                    }
                });
                if (totalPersonnel > 0) yearItemized['Personnel Expenses'] = totalPersonnel;
            }

            // --- Detailed Variable OPEX ---
            if (inputs.detailedOpex && Array.isArray(inputs.detailedOpex)) {
                const getDetQty = (item, depth = 0) => {
                    if (depth > 5) return 0;
                    if (item.mode === 'linked' && item.linkedSourceId) {
                        const source = inputs.detailedOpex.find(i => i.id === item.linkedSourceId);
                        if (source) return getDetQty(source, depth + 1) * (parseFloat(item.multiplier) || 0) / 100;
                    }
                    return parseFloat(item.quantity) || 0;
                };

                inputs.detailedOpex.forEach(item => {
                    const price = parseFloat(item.price) || 0;
                    const qty = getDetQty(item);

                    let fType = item.freqType;
                    if (item.mode === 'linked' && item.linkedSourceId) {
                        const source = inputs.detailedOpex.find(i => i.id === item.linkedSourceId);
                        if (source) fType = source.freqType;
                    }

                    let freqMultiplier = 1;
                    if (fType === 'daily') freqMultiplier = days;
                    else if (fType === 'monthly') freqMultiplier = 12;

                    const annualCost = qty * price * freqMultiplier * inflationFactor;

                    if (annualCost > 0) {
                        const catName = item.category || 'Variable Expenses';
                        yearItemized[catName] = (yearItemized[catName] || 0) + annualCost;
                        yearOpex += annualCost;
                        yearVariable += annualCost;
                    }
                });
            }

            // --- Admin Costs (Fixed) ---
            const adminCost = adminCosts[year] || 0;
            if (adminCost > 0) {
                yearItemized['Admin Expenses'] = (yearItemized['Admin Expenses'] || 0) + adminCost;
                yearOpex += adminCost;
                yearFixed += adminCost;
            }

            // --- Apply Simulation OPEX Modifiers ---
            if (simOpexPct !== 0 || simOpexAbs !== 0) {
                const opexAdjustment = (yearOpex * (simOpexPct / 100)) + simOpexAbs;
                yearOpex += opexAdjustment;
                yearVariable += opexAdjustment;
                yearItemized['Simulation Adjustment'] = opexAdjustment;
            }

            annualOpex[year] = yearOpex;
            annualFixedCost[year] = yearFixed;
            annualVariableCost[year] = yearVariable;
            annualItemizedOpex[year] = yearItemized;

            // Financials
            const ebitda = yearRevenue - yearOpex;
            annualEbitda[year] = ebitda;

            const ebit = ebitda - annualDepreciation;
            annualDepreciationArr[year] = annualDepreciation;
            annualEbit[year] = ebit;

            // Interest & Principal
            let interestExp = 0;
            let principalRepay = 0;

            if (year <= loanTerm && currentLoanBalance > 0) {
                // Beginning Balance for this year
                annualLoanBalance[year] = currentLoanBalance;

                interestExp = currentLoanBalance * simInterestRate;
                const payment = annualDebtService;
                principalRepay = payment - interestExp;
                if (principalRepay > currentLoanBalance) principalRepay = currentLoanBalance;
            }

            // Additional Loans (loop through all active loans)
            additionalLoans.forEach(loan => {
                if (loan.balance > 0 && year <= loan.termEnd) {
                    const secInterest = loan.balance * loan.rate;
                    let secPrincipal = loan.payment - secInterest;
                    if (secPrincipal > loan.balance) secPrincipal = loan.balance;

                    interestExp += secInterest;
                    principalRepay += secPrincipal;
                    loan.balance -= secPrincipal;
                }
            });

            // Total Finance Cost
            annualInterest[year] = interestExp;
            annualPrincipal[year] = principalRepay;
            annualFinanceCost[year] = interestExp + principalRepay;

            // Tax
            const taxableIncome = ebit - interestExp;
            let tax = 0;
            if (year > taxHoliday && taxableIncome > 0) {
                tax = taxableIncome * simTaxRate;
            }
            annualTax[year] = tax;

            const netIncome = taxableIncome - tax;
            annualNetIncome[year] = netIncome;

            // Cash Flows
            // Project CF = EBITDA - Tax
            const projectCF = ebitda - annualTax[year];
            projectCashFlows[year] = projectCF;

            const equityCF = netIncome + annualDepreciation - principalRepay;
            equityCashFlows[year] = equityCF + yearLoanProceeds;

            costsArray[year] = yearOpex + annualDepreciation + interestExp;
            energyArray[year] = yearTotalEnergy;

            // Update Loan Balance
            if (year <= loanTerm) {
                // Actual loan balance update should track precise principal
                const pmt = annualDebtService;
                const int = currentLoanBalance * simInterestRate;
                const princ = pmt - int;
                currentLoanBalance -= princ;
                if (currentLoanBalance < 0) currentLoanBalance = 0;
            }

            // Calculate total secondary loan stats for metrics
            let totalSecondaryBalance = 0;
            let totalSecondaryPayment = 0;
            additionalLoans.forEach(l => {
                totalSecondaryBalance += l.balance;
                if (l.balance > 0) totalSecondaryPayment += l.payment;
            });

            annualLoanBalance[year] = currentLoanBalance + totalSecondaryBalance;

            // DSCR
            // annualFinanceCost already includes Primary + Secondary (Interest + Principal)
            const totalDebtService = annualFinanceCost[year];

            if (totalDebtService > 0) {
                // CFADS = EBITDA - Tax
                const cfads = ebitda - annualTax[year];
                annualDSCR[year] = cfads / totalDebtService;
            } else {
                annualDSCR[year] = 0;
            }
        }

        // --- 5. Metrics ---
        const npv = FinancialCalculator.npv(discountRate, projectCashFlows);
        let irr = FinancialCalculator.irr(projectCashFlows);
        if (isNaN(irr)) irr = 0;
        irr *= 100;

        let irrEquity = FinancialCalculator.irr(equityCashFlows);
        if (isNaN(irrEquity)) irrEquity = 0;
        irrEquity *= 100;

        const npvEquity = FinancialCalculator.npv(0.10, equityCashFlows);
        const lcoe = FinancialCalculator.lcoe(discountRate, costsArray, energyArray);
        const payback = FinancialCalculator.paybackPeriod(projectCashFlows);

        let cumulative = 0;
        const cumulativeCashFlows = projectCashFlows.map(cf => {
            cumulative += cf;
            return cumulative;
        });

        let cumulativeEquity = 0;
        const cumulativeEquityCashFlows = equityCashFlows.map(cf => {
            cumulativeEquity += cf;
            return cumulativeEquity;
        });

        const results = {
            npv, irr, npvEquity, irrEquity, lcoe, payback,
            cashFlows: projectCashFlows,
            equityCashFlows,
            cumulativeCashFlows,
            cumulativeEquityCashFlows,
            inputs,
            details: {
                annualRevenue, annualOpex, annualItemizedOpex,
                annualEbitda, annualDepreciation: annualDepreciationArr,
                annualEbit, annualInterest, annualPrincipal, annualTax, annualNetIncome,
                annualLoanBalance, annualDSCR,
                annualFixedCost, annualVariableCost, annualFinanceCost
            }
        };

        if (!isSimulation) {
            this.lastResults = results; // Cache for simulation comparison
            if (window.dashboardApp) {
                window.dashboardApp.render(results);
            } else {
                console.warn("Dashboard App not initialized yet");
            }
        }

        return results;
    }

    userTriggerCalculate() {
        // Mark that a calculation has been done
        window.hasCalculated = true;

        // Force save state
        const state = {
            view: 'inputs',
            lastModified: new Date().toISOString(),
            inputs: this.getInputs()
        };
        if (window.StorageManager) {
            window.StorageManager.saveProject(state);
        }

        // Do the calculation
        this.calculate();

        // Navigate to Dashboard (simulate click)
        const dashNav = document.querySelector('.nav-item[data-view="dashboard"]');
        if (dashNav) {
            dashNav.click();
        }
    }

    runSensitivityAnalysis() {
        const baseInputs = this.getInputs();
        const variations = [-0.2, -0.1, 0, 0.1, 0.2];
        const results = {};

        results.priceSensitivity = variations.map(v => {
            const simInputs = JSON.parse(JSON.stringify(baseInputs));
            simInputs.revenue.peakRate = baseInputs.revenue.peakRate * (1 + v);
            simInputs.revenue.offPeakRate = baseInputs.revenue.offPeakRate * (1 + v);
            const res = this.calculate(simInputs, true);
            return { variation: v, irr: res.irrEquity };
        });

        results.capexSensitivity = variations.map(v => {
            const simInputs = JSON.parse(JSON.stringify(baseInputs));
            simInputs.capex.construction = baseInputs.capex.construction * (1 + v);
            simInputs.capex.machinery = baseInputs.capex.machinery * (1 + v);
            simInputs.capex.land = baseInputs.capex.land * (1 + v);
            const res = this.calculate(simInputs, true);
            return { variation: v, irr: res.irrEquity };
        });

        return results;
    }

    exportScenario() {
        const data = {
            inputs: this.getInputs(),
            timestamp: new Date().toISOString(),
            version: '1.0'
        };
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `scenario_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importScenario(inputElement) {
        const file = inputElement.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data && data.inputs) {
                    // Legacy Support: Default to POWER if modelType is missing
                    if (!data.inputs.modelType) {
                        data.inputs.modelType = 'POWER';
                    }

                    // 1. Update State
                    this.setState({ inputs: data.inputs });

                    // 2. Re-render generic inputs to match model (Critical for switching Power <-> Water)
                    this.renderInputs();

                    // 3. Populate values into the new DOM
                    this.setState({ inputs: data.inputs });

                    alert('Scenario imported successfully!');

                    // 4. Calculate
                    this.userTriggerCalculate();
                } else {
                    alert('Invalid scenario file format.');
                }
            } catch (err) {
                console.error(err);
                alert('Error reading file.');
            }
            // Reset input so same file can be selected again if needed
            inputElement.value = '';
        };
        reader.readAsText(file);
    }
}

// Global instance
window.inputApps = new InputManager();
