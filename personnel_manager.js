class PersonnelManager {
    constructor() {
        this.container = document.getElementById('content-area');
        this.state = window.inputApps ? window.inputApps.currentInputs.personnel || [] : [];
    }

    render() {
        // Ensure state is synced
        this.state = window.inputApps && window.inputApps.currentInputs.personnel ? window.inputApps.currentInputs.personnel : [];
        if (!window.inputApps.currentInputs.personnel) {
            window.inputApps.currentInputs.personnel = this.state;
        }

        // Calculate Summary
        const totalHeadcount = this.state.reduce((sum, item) => sum + (parseFloat(item.count) || 0), 0);
        const welfarePercent = parseFloat(window.inputApps.currentInputs.personnelWelfarePercent) || 0;
        const totalCostYear1 = this.calculateYear1Total(); // Now includes welfare %

        // Group by Category
        const groups = {};
        const categoriesOrder = ['Management', 'Technical', 'HR', 'Finance', 'Others']; // Force order
        // Initialize groups
        categoriesOrder.forEach(c => groups[c] = []);

        this.state.forEach((item, index) => {
            const cat = item.category || 'Others';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push({ item, index });
        });

        let gridHtml = '';

        Object.keys(groups).forEach(cat => {
            if (groups[cat].length === 0) return;

            // Mini Header for clarity
            const headerHtml = `
                <div style="display:flex; gap:5px; padding:5px 0 5px 0; border-bottom:1px solid #e0e0e0; font-size:10px; font-weight:700; color:#666; letter-spacing:0.5px; text-transform:uppercase;">
                    <span style="flex:3; padding-left:4px;">Position</span>
                    <span style="width:45px; text-align:center;">Cnt</span>
                    <span style="flex:1.5;">Salary</span>
                    <span style="width:40px; text-align:center;">Bns</span>
                    <span style="width:24px;"></span>
                </div>`;

            const itemsHtml = groups[cat].map(({ item, index }) => `
                <div class="opex-item compact-row" style="background:transparent; border-bottom:1px solid #f5f5f5; padding:6px 0; display:flex; align-items:center; gap:5px; margin:0;">
                    
                    <input type="text" class="input-compact" style="flex:3; min-width:0; border:1px solid transparent; background:transparent; font-weight:600; font-size:12px; padding-left:4px;" 
                           value="${item.position}" placeholder="Position"
                           onfocus="this.style.background='white'; this.style.border='1px solid #ddd';"
                           onblur="this.style.background='transparent'; this.style.border='1px solid transparent';"
                           onchange="personnelApp.update(${index}, 'position', this.value)">

                    <input type="number" class="input-compact" style="width:45px; text-align:center; padding:2px;" placeholder="0" 
                           value="${item.count}" onchange="personnelApp.update(${index}, 'count', this.value)">

                    <input type="text" class="input-compact" style="flex:1.5; min-width:0; text-align:right; padding:2px 5px;" placeholder="Salary" 
                           value="${(parseFloat(item.salary) || 0).toLocaleString('en-US')}" 
                           onchange="inputApps.evaluateMathInput(this); personnelApp.update(${index}, 'salary', this.value)">

                    <input type="number" class="input-compact" style="width:40px; text-align:center; padding:2px;" placeholder="1" 
                           value="${item.bonus || 1}" onchange="personnelApp.update(${index}, 'bonus', this.value)">

                    <button class="btn btn-danger btn-icon btn-sm" style="width:24px; height:24px; min-height:0;" onclick="personnelApp.remove(${index})">
                        <i class="fa-solid fa-times" style="font-size:12px;"></i>
                    </button>
                </div>
            `).join('');

            gridHtml += `
                <div class="category-block" style="break-inside: avoid; background: #fff; border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.03); overflow:hidden;">
                    <div class="sub-header" style="background: #f8f9fa; padding: 6px 12px; font-weight: 700; font-size:13px; color: #107c41; border-bottom: 1px solid #eee;">
                        ${cat}
                    </div>
                    <div style="padding: 0 10px 5px 10px;">
                        ${headerHtml}
                        ${itemsHtml}
                    </div>
                </div>
            `;
        });

        this.container.innerHTML = `
            <div class="dashboard-container">
                <div class="action-bar-top" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; background:white; padding:15px; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <div>
                             <span style="font-size:13px; color:#666; margin-right:10px;">Total Headcount:</span>
                             <strong style="color:#333; font-size:14px;">${totalHeadcount}</strong>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                             <span style="font-size:13px; color:#666;">Annual Cost (Y1):</span>
                             <strong style="color:#d13438; font-size:18px;" id="personnel-total-y1">${totalCostYear1.toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong>
                             <span style="font-size:12px; color:#888;">THB</span>
                        </div>
                    </div>

                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:5px;">
                         <div style="display:flex; align-items:center; gap:5px;">
                            <label style="font-size:12px; color:#666;">Welfare/Overhead (%):</label>
                            <input type="number" class="input-compact" style="width:60px; text-align:center; font-weight:bold;" 
                                   value="${welfarePercent}" step="1" onchange="personnelApp.updateWelfarePercent(this.value)">
                            <span style="font-size:12px; color:#666;">%</span>
                         </div>
                         <div style="display:flex; gap:10px; margin-top:5px;">
                            <button class="btn btn-primary" onclick="personnelApp.add()">
                                <i class="fa-solid fa-plus"></i> Add
                            </button>
                            <button class="btn btn-secondary" onclick="inputApps.userTriggerCalculate(); app.navigateTo('financials')">
                                <i class="fa-solid fa-calculator"></i> Calculate
                            </button>
                        </div>
                    </div>
                </div>

                 <!-- Masonry / Column Layout -->
                <div id="personnel-list" style="column-count: 2; column-gap: 20px;">
                    ${gridHtml}
                </div>
            </div>
            
            <div style="height: 100px;"></div>
        `;
    }

    add() {
        this.state.push({ category: 'Others', position: '', count: 1, salary: 15000, bonus: 1, increase: 3 });
        window.inputApps.currentInputs.personnel = this.state;
        this.render();
    }

    remove(index) {
        this.state.splice(index, 1);
        window.inputApps.currentInputs.personnel = this.state;
        this.render();
    }

    update(index, field, value) {
        // Strip commas for numbers
        if (field === 'salary' && typeof value === 'string') {
            value = parseFloat(value.replace(/,/g, '')) || 0;
        }
        this.state[index][field] = value;
        window.inputApps.currentInputs.personnel = this.state;
        this.updateSummary();
    }

    updateWelfarePercent(value) {
        window.inputApps.currentInputs.personnelWelfarePercent = parseFloat(value) || 0;
        this.render(); // Re-render to update total
    }

    updateSummary() {
        const total = this.calculateYear1Total();
        const el = document.getElementById('personnel-total-y1');
        if (el) el.textContent = total.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }

    calculateYear1Total() {
        const percent = parseFloat(window.inputApps.currentInputs.personnelWelfarePercent) || 0;
        const multiplier = 1 + (percent / 100);

        const totalBase = this.state.reduce((sum, item) => {
            const count = parseFloat(item.count) || 0;
            const salary = parseFloat(item.salary) || 0;
            const bonus = parseFloat(item.bonus) || 0;
            const annualPerHead = (salary * 12) + (salary * bonus);
            return sum + (annualPerHead * count);
        }, 0);
        return totalBase * multiplier;
    }
}

window.personnelApp = new PersonnelManager();
