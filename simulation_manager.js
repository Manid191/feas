class SimulationManager {
    constructor() {
        this.events = [];
        this.container = null; // Will be set on init
    }

    init() {
        // Use the same content-area as other views
        this.container = document.getElementById('content-area');
        this.render();
    }

    addEvent() {
        // Default new event
        this.events.push({
            id: Date.now(),
            type: 'capacity', // capacity, price_peak, price_offpeak, expense_opex, expense_fuel
            mode: 'percent',  // percent, absolute, delta
            startYear: 11,
            endYear: 20,
            value: -10,
            description: 'New Event'
        });
        this.render();
    }

    removeEvent(id) {
        this.events = this.events.filter(e => e.id !== id);
        this.render();
    }

    updateEvent(id, field, value) {
        const event = this.events.find(e => e.id === id);
        if (event) {
            event[field] = value;
            // Defaults for Loan
            if (field === 'type' && value === 'new_loan') {
                if (!event.amount) event.amount = 1000000;
                if (!event.term) event.term = 10;
                if (!event.rate) event.rate = 5;
                event.description = "New Loan";
            }
            this.render();
        }
    }

    runSimulation() {
        if (!window.inputApps) return;

        // 1. Get Base Results
        let baseResult = window.inputApps.lastResults;
        let baseInputs;

        if (baseResult) {
            baseInputs = baseResult.inputs;
        } else {
            console.warn("No cached results found, recalculating base case.");
            baseInputs = window.inputApps.getInputs();
            baseResult = window.inputApps.calculate(baseInputs, true);
        }

        // 2. Prepare Simulation Events
        // Clone existing events
        const activeEvents = JSON.parse(JSON.stringify(this.events));

        // Add Global Overrides from UI
        const simInt = document.getElementById('sim-interest')?.value;
        const simInf = document.getElementById('sim-inflation')?.value;
        const simTax = document.getElementById('sim-tax')?.value;

        if (simInt && !isNaN(parseFloat(simInt))) activeEvents.push({ type: 'global_interest', value: parseFloat(simInt) });
        if (simInf && !isNaN(parseFloat(simInf))) activeEvents.push({ type: 'global_inflation', value: parseFloat(simInf) });
        if (simTax && !isNaN(parseFloat(simTax))) activeEvents.push({ type: 'global_tax', value: parseFloat(simTax) });

        // 3. Run Simulation
        const simInputs = JSON.parse(JSON.stringify(baseInputs));
        const simResult = window.inputApps.calculate(simInputs, true, activeEvents);

        this.renderResults(baseResult, simResult);
    }

    render() {
        if (!this.container) return;

        // Ensure we have last inputs to show current values
        const current = window.inputApps?.lastResults?.inputs?.finance || {};
        const curInt = current.interestRate || 7;
        const curInf = current.opexInflation || 3;
        const curTax = current.taxRate || 20;

        let html = `
        <!-- Global Controls -->
        <div class="card glass-panel full-width" style="margin-bottom: 20px;">
            <h3><i class="fa-solid fa-sliders"></i> Global Simulation Parameters</h3>
            <div class="row">
                <div class="col-md-4">
                    <label>New Interest Rate (%) <span class="text-muted">(Current: ${curInt}%)</span></label>
                    <input type="number" id="sim-interest" class="form-control" placeholder="Leave empty to keep current">
                </div>
                <div class="col-md-4">
                    <label>New OpEx Inflation (%) <span class="text-muted">(Current: ${curInf}%)</span></label>
                    <input type="number" id="sim-inflation" class="form-control" placeholder="Leave empty to keep current">
                </div>
                <div class="col-md-4">
                    <label>New Tax Rate (%) <span class="text-muted">(Current: ${curTax}%)</span></label>
                    <input type="number" id="sim-tax" class="form-control" placeholder="Leave empty to keep current">
                </div>
            </div>
        </div>

        <div class="card glass-panel full-width">
            <div class="card-header">
                <h3><i class="fa-solid fa-flask"></i> Simulation Scenarios</h3>
                <button class="btn btn-primary btn-sm" onclick="simulationApp.addEvent()">
                    <i class="fa-solid fa-plus"></i> Add Event
                </button>
            </div>
            
            <p class="hint-text">Add events to simulate changes (e.g., "Capacity drops 20% in Year 10").</p>

            <table class="data-table" style="width: 100%; margin-top: 10px;">
                <thead>
                    <tr>
                        <th style="width: 20%;">Parameter</th>
                        <th style="width: 10%;">Start Year</th>
                        <th style="width: 10%;">End / Term</th>
                        <th style="width: 15%;">Mode / Rate</th>
                        <th style="width: 15%;">Value / Amount</th>
                        <th>Description</th>
                        <th style="width: 40px;"></th>
                    </tr>
                </thead>
                <tbody>
        `;

        if (this.events.length === 0) {
            html += `<tr><td colspan="7" style="text-align:center; padding: 20px; color: #888;">No events added. Click "Add Event" to start.</td></tr>`;
        } else {
            this.events.forEach(event => {
                const isLoan = event.type === 'new_loan';

                html += `
                    <tr>
                        <td>
                            <select class="form-control compact" onchange="simulationApp.updateEvent(${event.id}, 'type', this.value)">
                                <optgroup label="Operational">
                                    <option value="capacity" ${event.type === 'capacity' ? 'selected' : ''}>Production Capacity</option>
                                    <option value="price_peak" ${event.type === 'price_peak' ? 'selected' : ''}>Peak Price</option>
                                    <option value="price_offpeak" ${event.type === 'price_offpeak' ? 'selected' : ''}>Off-Peak Price</option>
                                    <option value="expense_opex" ${event.type === 'expense_opex' ? 'selected' : ''}>Total OPEX</option>
                                    <option value="extra_revenue" ${event.type === 'extra_revenue' ? 'selected' : ''}>Extra Revenue (Lumpsum)</option>
                                </optgroup>
                                <optgroup label="Financial">
                                    <option value="new_loan" ${event.type === 'new_loan' ? 'selected' : ''}>Additional Loan</option>
                                </optgroup>
                            </select>
                        </td>
                        
                        <!-- Start Year -->
                        <td><input type="number" class="form-control compact" value="${event.startYear}" onchange="simulationApp.updateEvent(${event.id}, 'startYear', parseFloat(this.value))" placeholder="Year"></td>
                        
                        <!-- End Year / Term -->
                        <td>
                            ${isLoan ?
                        `<input type="number" class="form-control compact" value="${event.term || 10}" onchange="simulationApp.updateEvent(${event.id}, 'term', parseFloat(this.value))" placeholder="Term (Yrs)">` :
                        `<input type="number" class="form-control compact" value="${event.endYear}" onchange="simulationApp.updateEvent(${event.id}, 'endYear', parseFloat(this.value))" placeholder="End Year">`
                    }
                        </td>

                        <!-- Mode / Rate -->
                        <td>
                            ${isLoan ?
                        `<input type="number" class="form-control compact" value="${event.rate || 5}" onchange="simulationApp.updateEvent(${event.id}, 'rate', parseFloat(this.value))" placeholder="Rate %">` :
                        `<select class="form-control compact" onchange="simulationApp.updateEvent(${event.id}, 'mode', this.value)">
                                    <option value="percent" ${event.mode === 'percent' ? 'selected' : ''}>% Percent</option>
                                    <option value="absolute" ${event.mode === 'absolute' ? 'selected' : ''}>Absolute</option>
                                    <option value="delta" ${event.mode === 'delta' ? 'selected' : ''}>Delta (+/-)</option>
                                </select>`
                    }
                        </td>

                        <!-- Value / Amount -->
                        <td>
                            ${isLoan ?
                        `<input type="number" class="form-control compact" value="${event.amount || 0}" onchange="simulationApp.updateEvent(${event.id}, 'amount', parseFloat(this.value))" placeholder="Amount (THB)">` :
                        `<input type="number" class="form-control compact" value="${event.value}" onchange="simulationApp.updateEvent(${event.id}, 'value', parseFloat(this.value))">`
                    }
                        </td>

                        <td><input type="text" class="form-control compact" value="${event.description}" onchange="simulationApp.updateEvent(${event.id}, 'description', this.value)"></td>
                        <td>
                            <button class="btn btn-danger btn-sm" onclick="simulationApp.removeEvent(${event.id})"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    </tr>
                `;
            });
        }

        html += `
                </tbody>
            </table>

            <div style="margin-top: 20px; text-align: right;">
                <button class="btn btn-success" onclick="simulationApp.runSimulation()">
                    <i class="fa-solid fa-play"></i> Run Scale Simulation
                </button>
            </div>
        </div>

        <!-- Create a placeholder for results -->
        <div id="simulation-results" style="margin-top: 20px;"></div>
        `;

        this.container.innerHTML = html;
        window.simulationApp = this; // Expose global
    }

    renderResults(base, sim, viewMode = 'equity') {
        this.lastBase = base;
        this.lastSim = sim;
        this.viewMode = viewMode;

        const resDiv = document.getElementById('simulation-results');
        if (!resDiv) return;

        const fmtM = (v) => (v / 1000000).toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' M';
        const fmtP = (v) => v.toLocaleString(undefined, { maximumFractionDigits: 2 }) + '%';

        const diffColor = (v) => {
            if (v > 0) return 'color: #2e7d32;'; // Green
            if (v < 0) return 'color: #c62828;'; // Red
            return 'color: #666;';
        };

        // Metrics based on view mode
        let baseIRR, simIRR, baseNPV, simNPV;
        if (viewMode === 'project') {
            baseIRR = base.irr;
            simIRR = sim.irr;
            baseNPV = base.npv;
            simNPV = sim.npv;
        } else {
            baseIRR = base.irrEquity;
            simIRR = sim.irrEquity;
            baseNPV = base.npvEquity;
            simNPV = sim.npvEquity;
        }

        const irrDiff = simIRR - baseIRR;
        const npvDiff = simNPV - baseNPV;

        let html = `
        <div class="card full-width">
            <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                <h3><i class="fa-solid fa-chart-line"></i> Simulation Results Comparison</h3>
                
                <!-- View Toggle -->
                <div class="view-toggle">
                    <input type="radio" name="simViewMode" id="viewEquity" autocomplete="off" ${viewMode === 'equity' ? 'checked' : ''} onchange="simulationApp.switchView('equity')">
                    <label for="viewEquity"><i class="fa-solid fa-chart-pie"></i> Equity View</label>

                    <input type="radio" name="simViewMode" id="viewProject" autocomplete="off" ${viewMode === 'project' ? 'checked' : ''} onchange="simulationApp.switchView('project')">
                    <label for="viewProject"><i class="fa-solid fa-industry"></i> Project View</label>
                </div>
            </div>
            
            <div class="comparison-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 10px;">
                <!-- Metrics Table -->
                <div>
                    <table class="result-table" style="width: 100%;">
                        <thead>
                            <tr>
                                <th>Metric (${viewMode === 'project' ? 'Project' : 'Equity'})</th>
                                <th style="text-align: center;">Base</th>
                                <th style="text-align: center;">Sim</th>
                                <th style="text-align: center;">Diff</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>IRR (%)</strong></td>
                                <td style="text-align: center;">${fmtP(baseIRR)}</td>
                                <td style="text-align: center;"><b>${fmtP(simIRR)}</b></td>
                                <td style="text-align: center; ${diffColor(irrDiff)}"><b>${irrDiff > 0 ? '+' : ''}${fmtP(irrDiff)}</b></td>
                            </tr>
                            <tr>
                                <td><strong>NPV (THB)</strong></td>
                                <td style="text-align: center;">${fmtM(baseNPV)}</td>
                                <td style="text-align: center;">${fmtM(simNPV)}</td>
                                <td style="text-align: center; ${diffColor(npvDiff)}">${npvDiff > 0 ? '+' : ''}${fmtM(npvDiff)}</td>
                            </tr>
                            <tr>
                                <td><strong>Payback</strong></td>
                                <td style="text-align: center;">${base.payback.toFixed(2)} Yrs</td>
                                <td style="text-align: center;">${sim.payback.toFixed(2)} Yrs</td>
                                <td style="text-align: center;">${(sim.payback - base.payback).toFixed(2)} Yrs</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- IRR Comparison Bar Chart -->
                <div style="max-height: 250px;">
                    <canvas id="simIrrChart"></canvas>
                </div>
            </div>
            
            <!-- Cash Flow Line Charts -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; padding: 10px;">
                <div>
                    <h4 style="margin-bottom: 10px; text-align: center;"><i class="fa-solid fa-money-bill-trend-up"></i> Annual Equity Cash Flow</h4>
                    <div style="height: 300px;">
                        <canvas id="simCashFlowChart"></canvas>
                    </div>
                </div>
                <div>
                    <h4 style="margin-bottom: 10px; text-align: center;"><i class="fa-solid fa-piggy-bank"></i> Cumulative Equity Cash Flow</h4>
                    <div style="height: 300px;">
                        <canvas id="simCumCashFlowChart"></canvas>
                    </div>
                </div>
                </div>
                </div>
            </div>

            <!-- Net Profit Chart (Restored) -->
            <div style="margin-top: 20px; padding: 10px;">
                <h4 style="margin-bottom: 10px; text-align: center;"><i class="fa-solid fa-chart-line"></i> Annual Net Profit (Net Income)</h4>
                <div style="height: 300px;">
                    <canvas id="simNetProfitChart"></canvas>
                </div>
            </div>

            <!-- Detailed Comparison Table (Key Years) -->
            <div class="card glass-panel" style="margin-top: 20px; width: 100%;">
                <div class="card-header">
                    <h4><i class="fa-solid fa-table-columns"></i> Snapshot Comparison (Year 1, 5, 10, 20)</h4>
                </div>
                <table class="result-table" style="width: 100%; font-size: 0.9em;">
                    <thead>
                        <tr>
                            <th>Parameter</th>
                            <th colspan="2" style="text-align: center; border-bottom: 2px solid #ddd;">Year 1</th>
                            <th colspan="2" style="text-align: center; border-bottom: 2px solid #ddd;">Year 5</th>
                            <th colspan="2" style="text-align: center; border-bottom: 2px solid #ddd;">Year 10</th>
                            <th colspan="2" style="text-align: center; border-bottom: 2px solid #ddd;">Year 20</th>
                        </tr>
                        <tr>
                            <th></th>
                            <th>Base</th><th>Sim</th>
                            <th>Base</th><th>Sim</th>
                            <th>Base</th><th>Sim</th>
                            <th>Base</th><th>Sim</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.renderComparisonRow(base, sim, 'Revenue (M)', 'annualRevenue')}
                        ${this.renderComparisonRow(base, sim, 'EBITDA (M)', 'annualEbitda')}
                        ${this.renderComparisonRow(base, sim, 'Net Income (M)', 'annualNetIncome')}
                        ${this.renderComparisonRow(base, sim, 'DSCR (x)', 'annualDSCR', false)}
                        ${this.renderComparisonRow(base, sim, 'Project CF (M)', 'cashFlowGeneric', true)}
                        ${this.renderComparisonRow(base, sim, 'Equity CF (M)', 'equityCashFlows', true)}
                    </tbody>
                </table>
            </div>
        </div>
        `;

        resDiv.innerHTML = html;

        // --- Render Charts ---
        this.renderComparisonCharts(base, sim);
    }

    switchView(mode) {
        if (this.lastBase && this.lastSim) {
            this.renderResults(this.lastBase, this.lastSim, mode);
        }
    }

    renderComparisonCharts(base, sim) {
        const isProject = this.viewMode === 'project';
        const labelSuffix = isProject ? ' (Project)' : ' (Equity)';

        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                axis: 'x',
                intersect: false
            },
            hover: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function (context) {
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(2) + ' M';
                        }
                    }
                }
            },
            scales: {
                y: { title: { display: true, text: 'Million THB' } }
            }
        };

        // 1. IRR Bar Chart
        const irrCtx = document.getElementById('simIrrChart');
        if (irrCtx) {
            const baseIRR = isProject ? base.irr : base.irrEquity;
            const simIRR = isProject ? sim.irr : sim.irrEquity;

            new Chart(irrCtx, {
                type: 'bar',
                data: {
                    labels: ['Base Case' + labelSuffix, 'Simulation' + labelSuffix],
                    datasets: [
                        {
                            label: 'IRR %',
                            data: [baseIRR, simIRR],
                            backgroundColor: ['rgba(54, 162, 235, 0.7)', 'rgba(255, 99, 132, 0.7)'],
                            borderColor: ['rgba(54, 162, 235, 1)', 'rgba(255, 99, 132, 1)'],
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }, // Single dataset, legend redundant
                        title: { display: true, text: 'IRR Comparison' + labelSuffix }
                    },
                    scales: {
                        y: { beginAtZero: true, title: { display: true, text: '%' } }
                    }
                }
            });
        }

        // 2. Annual Cash Flow Line Chart
        const cfCtx = document.getElementById('simCashFlowChart');
        const baseCFSrc = isProject ? base.cashFlows : base.equityCashFlows;
        const simCFSrc = isProject ? sim.cashFlows : sim.equityCashFlows;

        if (cfCtx && baseCFSrc && simCFSrc) {
            const years = baseCFSrc.map((_, i) => `Y${i}`);
            const baseCF = baseCFSrc.map(v => v / 1000000);
            const simCF = simCFSrc.map(v => v / 1000000);

            new Chart(cfCtx, {
                type: 'line',
                data: {
                    labels: years,
                    datasets: [
                        {
                            label: 'Base' + labelSuffix,
                            data: baseCF,
                            borderColor: 'rgba(54, 162, 235, 1)',
                            backgroundColor: 'rgba(54, 162, 235, 0.1)',
                            fill: true,
                            tension: 0.3
                        },
                        {
                            label: 'Sim' + labelSuffix,
                            data: simCF,
                            borderColor: 'rgba(255, 99, 132, 1)',
                            backgroundColor: 'rgba(255, 99, 132, 0.1)',
                            fill: true,
                            tension: 0.3
                        }
                    ]
                },
                options: commonOptions
            });
        }

        // 3. Cumulative Cash Flow Line Chart
        const cumCtx = document.getElementById('simCumCashFlowChart');
        const baseCumSrc = isProject ? base.cumulativeCashFlows : base.cumulativeEquityCashFlows;
        const simCumSrc = isProject ? sim.cumulativeCashFlows : sim.cumulativeEquityCashFlows;

        if (cumCtx && baseCumSrc && simCumSrc) {
            const years = baseCumSrc.map((_, i) => `Y${i}`);
            const baseCumStr = baseCumSrc.map(v => v / 1000000);
            const simCumStr = simCumSrc.map(v => v / 1000000);

            new Chart(cumCtx, {
                type: 'line',
                data: {
                    labels: years,
                    datasets: [
                        {
                            label: 'Base Cumulative' + labelSuffix,
                            data: baseCumStr,
                            borderColor: 'rgba(54, 162, 235, 1)',
                            borderDash: [5, 5],
                            fill: false,
                            tension: 0.3
                        },
                        {
                            label: 'Sim Cumulative' + labelSuffix,
                            data: simCumStr,
                            borderColor: 'rgba(255, 99, 132, 1)',
                            borderDash: [5, 5],
                            fill: false,
                            tension: 0.3
                        }
                    ]
                },
                options: commonOptions
            });
        }

        // 4. Profit Chart (Net Income for Equity, EBITDA for Project)
        const npCtx = document.getElementById('simNetProfitChart');
        if (npCtx && base.details && sim.details) {
            const years = base.cashFlows.map((_, i) => `Y${i}`);
            const labels = years.slice(1);

            // Choose Metric: Net Income (Equity) vs EBITDA (Project)
            const metricName = isProject ? 'EBITDA' : 'Net Income';
            const baseSrc = isProject ? base.details.annualEbitda : base.details.annualNetIncome;
            const simSrc = isProject ? sim.details.annualEbitda : sim.details.annualNetIncome;

            const baseNP = baseSrc.slice(1).map(v => v / 1000000);
            const simNP = simSrc.slice(1).map(v => v / 1000000);

            new Chart(npCtx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: `Base ${metricName}`,
                            data: baseNP,
                            borderColor: 'rgba(75, 192, 192, 1)',
                            backgroundColor: 'rgba(75, 192, 192, 0.1)',
                            fill: true,
                            tension: 0.3
                        },
                        {
                            label: `Sim ${metricName}`,
                            data: simNP,
                            borderColor: 'rgba(153, 102, 255, 1)',
                            backgroundColor: 'rgba(153, 102, 255, 0.1)',
                            fill: true,
                            tension: 0.3
                        }
                    ]
                },
                options: commonOptions
            });
        }
    }

    renderComparisonRow(base, sim, label, field, isRoot = false) {
        const years = [1, 5, 10, 20];
        const fmt = (v) => isRoot ? (v / 1000000).toFixed(1) : (field.includes('DSCR') ? v.toFixed(2) : (v / 1000000).toFixed(1));

        let html = `<tr><td>${label}</td>`;
        years.forEach(y => {
            let bVal = 0;
            let sVal = 0;
            if (isRoot) {
                // If it's a root property like cashFlows array
                // Map 'cashFlowGeneric' to 'cashFlows'
                bVal = base.cashFlows[y] || 0;
                sVal = sim.cashFlows[y] || 0;
            } else {
                bVal = base.details[field][y] || 0;
                sVal = sim.details[field][y] || 0;
            }

            const diff = sVal - bVal;
            const color = diff > 0.01 ? 'color:green' : (diff < -0.01 ? 'color:red' : '#666');
            const icon = diff > 0.01 ? '▲' : (diff < -0.01 ? '▼' : '-');

            html += `<td style="background:#f9f9f9">${fmt(bVal)}</td>
                     <td style="font-weight:bold; ${color}">${fmt(sVal)} <span style="font-size:0.8em">${icon}</span></td>`;
        });
        html += `</tr>`;
        return html;
    }

    renderFullDetailTable(base, sim) {
        const years = Array.from({ length: base.inputs.projectYears }, (_, i) => i + 1);

        let headerHtml = '<th>Item</th>';
        years.forEach(y => headerHtml += `<th>Y${y}</th>`);

        const getRow = (label, field, isRoot = false) => {
            let html = `<tr><td style="font-weight:bold; position:sticky; left:0; background:white; border-right:1px solid #ddd;">${label}</td>`;
            years.forEach(y => {
                let val = 0;
                if (isRoot) val = sim.cashFlows[y] || 0;
                else val = sim.details[field][y] || 0;

                // Show Base vs Sim? Or just Sim? User asked "Remaining annual profit" -> Sim Result.
                // Comparison might be too crowded. Let's show Sim Result primarily, maybe delta in tooltip?
                // Request: "See detailed figures... how each year is"
                // Let's just show the SIMULATED result values.

                let displayVal = 0;
                if (field.includes('DSCR')) displayVal = val.toFixed(2);
                else displayVal = (val / 1000000).toFixed(1);

                html += `<td>${displayVal}</td>`;
            });
            html += '</tr>';
            return html;
        };

        return `
            <div style="margin-top:20px; text-align:right;">
                <small style="color:#666;">*Values in Million THB (except DSCR)</small>
            </div>
            <div style="overflow-x:auto; margin-top:5px; border:1px solid #ddd;">
                <table class="data-table small-text" style="width:100%; min-width:1500px;">
                    <thead>
                        <tr>${headerHtml}</tr>
                    </thead>
                    <tbody>
                        ${getRow('Revenue', 'annualRevenue')}
                        ${getRow('OpEx', 'annualOpex')}
                        ${getRow('EBITDA', 'annualEbitda')}
                        ${getRow('Net Income', 'annualNetIncome')}
                        ${getRow('Cash Flow', 'cashFlowGeneric', true)}
                        ${getRow('DSCR', 'annualDSCR')}
                    </tbody>
                </table>
            </div>
        `;
    }
}
