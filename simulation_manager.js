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
            this.render();
        }
    }

    runSimulation() {
        if (!window.inputApps) return;

        // 1. Get Base Results
        // Try to use cached results first to match Dashboard exactly
        let baseResult = window.inputApps.lastResults;
        let baseInputs;

        if (baseResult) {
            baseInputs = baseResult.inputs;
        } else {
            console.warn("No cached results found, recalculating base case.");
            baseInputs = window.inputApps.getInputs();
            baseResult = window.inputApps.calculate(baseInputs, true);
        }

        // 2. Run Simulation (use deep copy to prevent reference issues)
        const simInputs = JSON.parse(JSON.stringify(baseInputs));
        const simResult = window.inputApps.calculate(simInputs, true, this.events);

        this.renderResults(baseResult, simResult);
    }

    render() {
        if (!this.container) return;

        let html = `
        <div class="card glass-panel full-width">
            <div class="card-header">
                <h3><i class="fa-solid fa-flask"></i> Simulation Scenarios</h3>
                <button class="btn btn-primary btn-sm" onclick="simulationApp.addEvent()">
                    <i class="fa-solid fa-plus"></i> Add Event
                </button>
            </div>
            
            <p class="hint-text">Add events to simulate changes (e.g., "Capacity drops 20% in Year 10"). These calculated on-the-fly and do not save to the database.</p>

            <table class="data-table" style="width: 100%; margin-top: 10px;">
                <thead>
                    <tr>
                        <th>Parameter</th>
                        <th>Start Year</th>
                        <th>End Year</th>
                        <th>Mode</th>
                        <th>Value</th>
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
                html += `
                    <tr>
                        <td>
                            <select class="form-control compact" onchange="simulationApp.updateEvent(${event.id}, 'type', this.value)">
                                <option value="capacity" ${event.type === 'capacity' ? 'selected' : ''}>Production Capacity</option>
                                <option value="price_peak" ${event.type === 'price_peak' ? 'selected' : ''}>Peak Price</option>
                                <option value="price_offpeak" ${event.type === 'price_offpeak' ? 'selected' : ''}>Off-Peak Price</option>
                                <option value="expense_opex" ${event.type === 'expense_opex' ? 'selected' : ''}>Total OPEX</option>
                            </select>
                        </td>
                        <td><input type="number" class="form-control compact" value="${event.startYear}" onchange="simulationApp.updateEvent(${event.id}, 'startYear', parseFloat(this.value))"></td>
                        <td><input type="number" class="form-control compact" value="${event.endYear}" onchange="simulationApp.updateEvent(${event.id}, 'endYear', parseFloat(this.value))"></td>
                        <td>
                            <select class="form-control compact" onchange="simulationApp.updateEvent(${event.id}, 'mode', this.value)">
                                <option value="percent" ${event.mode === 'percent' ? 'selected' : ''}>% Percent</option>
                                <option value="absolute" ${event.mode === 'absolute' ? 'selected' : ''}>Absolute (Fix)</option>
                                <option value="delta" ${event.mode === 'delta' ? 'selected' : ''}>Delta (+/-)</option>
                            </select>
                        </td>
                        <td><input type="number" class="form-control compact" value="${event.value}" onchange="simulationApp.updateEvent(${event.id}, 'value', parseFloat(this.value))"></td>
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

    renderResults(base, sim) {
        const resDiv = document.getElementById('simulation-results');
        if (!resDiv) return;

        const fmtM = (v) => (v / 1000000).toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' M';
        const fmtP = (v) => v.toLocaleString(undefined, { maximumFractionDigits: 2 }) + '%';

        const diffColor = (v) => {
            if (v > 0) return 'color: #2e7d32;'; // Green
            if (v < 0) return 'color: #c62828;'; // Red
            return 'color: #666;';
        };

        const irrDiff = sim.irrEquity - base.irrEquity;
        const npvDiff = sim.npvEquity - base.npvEquity;

        let html = `
        <div class="card full-width">
            <div class="card-header">
                <h3><i class="fa-solid fa-chart-line"></i> Simulation Results Comparison</h3>
            </div>
            
            <div class="comparison-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 10px;">
                <!-- Metrics Table -->
                <div>
                    <table class="result-table" style="width: 100%;">
                        <thead>
                            <tr>
                                <th>Metric</th>
                                <th style="text-align: center;">Base</th>
                                <th style="text-align: center;">Sim</th>
                                <th style="text-align: center;">Diff</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>Project IRR</strong></td>
                                <td style="text-align: center;">${fmtP(base.irr)}</td>
                                <td style="text-align: center;">${fmtP(sim.irr)}</td>
                                <td style="text-align: center; ${diffColor(sim.irr - base.irr)}">${fmtP(sim.irr - base.irr)}</td>
                            </tr>
                            <tr>
                                <td><strong>Equity IRR</strong></td>
                                <td style="text-align: center;">${fmtP(base.irrEquity)}</td>
                                <td style="text-align: center;"><b>${fmtP(sim.irrEquity)}</b></td>
                                <td style="text-align: center; ${diffColor(irrDiff)}"><b>${fmtP(irrDiff)}</b></td>
                            </tr>
                            <tr>
                                <td><strong>NPV (Equity)</strong></td>
                                <td style="text-align: center;">${fmtM(base.npvEquity)}</td>
                                <td style="text-align: center;">${fmtM(sim.npvEquity)}</td>
                                <td style="text-align: center; ${diffColor(npvDiff)}">${fmtM(npvDiff)}</td>
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
                    <h4 style="margin-bottom: 10px; text-align: center;"><i class="fa-solid fa-money-bill-trend-up"></i> Annual Cash Flow</h4>
                    <div style="height: 300px;">
                        <canvas id="simCashFlowChart"></canvas>
                    </div>
                </div>
                <div>
                    <h4 style="margin-bottom: 10px; text-align: center;"><i class="fa-solid fa-piggy-bank"></i> Cumulative Cash Flow</h4>
                    <div style="height: 300px;">
                        <canvas id="simCumCashFlowChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
        `;

        resDiv.innerHTML = html;

        // --- Render Charts ---
        this.renderComparisonCharts(base, sim);
    }

    renderComparisonCharts(base, sim) {
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
            new Chart(irrCtx, {
                type: 'bar',
                data: {
                    labels: ['Project IRR (%)', 'Equity IRR (%)'],
                    datasets: [
                        {
                            label: 'Base Case',
                            data: [base.irr, base.irrEquity],
                            backgroundColor: 'rgba(54, 162, 235, 0.7)',
                            borderColor: 'rgba(54, 162, 235, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Simulation',
                            data: [sim.irr, sim.irrEquity],
                            backgroundColor: 'rgba(255, 99, 132, 0.7)',
                            borderColor: 'rgba(255, 99, 132, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' },
                        title: { display: true, text: 'IRR Comparison' }
                    },
                    scales: {
                        y: { beginAtZero: true, title: { display: true, text: '%' } }
                    }
                }
            });
        }

        // 2. Annual Cash Flow Line Chart
        const cfCtx = document.getElementById('simCashFlowChart');
        if (cfCtx && base.cashFlows && sim.cashFlows) {
            const years = base.cashFlows.map((_, i) => `Y${i}`);
            const baseCF = base.cashFlows.map(v => v / 1000000);
            const simCF = sim.cashFlows.map(v => v / 1000000);

            new Chart(cfCtx, {
                type: 'line',
                data: {
                    labels: years,
                    datasets: [
                        {
                            label: 'Base Annual',
                            data: baseCF,
                            borderColor: 'rgba(54, 162, 235, 1)',
                            backgroundColor: 'rgba(54, 162, 235, 0.1)',
                            fill: true,
                            tension: 0.3
                        },
                        {
                            label: 'Sim Annual',
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
        if (cumCtx && base.cumulativeCashFlows && sim.cumulativeCashFlows) {
            const years = base.cumulativeCashFlows.map((_, i) => `Y${i}`);
            const baseCumStr = base.cumulativeCashFlows.map(v => v / 1000000);
            const simCumStr = sim.cumulativeCashFlows.map(v => v / 1000000);

            new Chart(cumCtx, {
                type: 'line',
                data: {
                    labels: years,
                    datasets: [
                        {
                            label: 'Base Cumulative',
                            data: baseCumStr,
                            borderColor: 'rgba(54, 162, 235, 1)',
                            borderDash: [5, 5],
                            fill: false,
                            tension: 0.3
                        },
                        {
                            label: 'Sim Cumulative',
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
    }
}
