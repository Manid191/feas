class DashboardManager {
    constructor() {
        this.container = document.getElementById('content-area');
        this.chartInstance = null;
    }

    render(results) {
        this.container.innerHTML = `
            <div class="dashboard-container">
                <div class="action-bar-top">
                    <button class="btn btn-secondary" onclick="window.inputApps.renderInputs()">
                        <i class="fa-solid fa-arrow-left"></i> Back to Inputs
                    </button>
                    <h2 class="result-title">Feasibility Results</h2>
                </div>

                <!-- KPI Cards -->
                <div class="kpi-grid">
                    <div class="kpi-card">
                        <div class="kpi-icon icon-npv"><i class="fa-solid fa-sack-dollar"></i></div>
                        <div class="kpi-content">
                            <span>Net Present Value (NPV)</span>
                            <h3 class="${results.npv >= 0 ? 'text-success' : 'text-danger'}">
                                ${this.formatCurrency(results.npv)}
                            </h3>
                        </div>
                    </div>
                    
                    <div class="kpi-card">
                        <div class="kpi-icon icon-irr"><i class="fa-solid fa-percent"></i></div>
                        <div class="kpi-content">
                            <span>Project IRR</span>
                            <h3 class="${results.irr >= 0.1 ? 'text-success' : 'text-warning'}">
                                ${results.irr.toFixed(2)} %
                            </h3>
                        </div>
                    </div>

                    <div class="kpi-card">
                        <div class="kpi-icon icon-irr"><i class="fa-solid fa-chart-line"></i></div>
                        <div class="kpi-content">
                            <span>Equity IRR (ROE)</span>
                            <h3 class="${results.irrEquity >= 0.1 ? 'text-success' : 'text-warning'}">
                                ${results.irrEquity.toFixed(2)} %
                            </h3>
                        </div>
                    </div>

                    <div class="kpi-card">
                        <div class="kpi-icon icon-lcoe"><i class="fa-solid fa-bolt"></i></div>
                        <div class="kpi-content">
                            <span>LCOE / Unit</span>
                            <h3>${results.lcoe.toFixed(2)} THB</h3>
                        </div>
                    </div>

                    <div class="kpi-card">
                        <div class="kpi-icon icon-payback"><i class="fa-solid fa-hourglass-half"></i></div>
                        <div class="kpi-content">
                            <span>Payback Period</span>
                            <h3>${results.payback.toFixed(2)} Years</h3>
                        </div>
                    </div>
                </div>

                <!-- Chart Section -->
                <div class="card glass-panel chart-panel">
                    <h3><i class="fa-solid fa-chart-bar"></i> Cash Flow Analysis</h3>
                    <div class="chart-container">
                        <canvas id="cashFlowChart"></canvas>
                    </div>
                </div>
            </div>
        `;

        // Wait for DOM then render chart
        requestAnimationFrame(() => this.renderCharts(results));
    }

    renderCharts(results) {
        const ctx = document.getElementById('cashFlowChart').getContext('2d');
        const labels = results.cashFlows.map((_, i) => `Year ${i}`);

        // Prepare Data
        // Year 0 is usually investment (-ve), Year 1+ is operation
        // For better visualization, we might split Capex and Operating Cash Flow

        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Project Cash Flow (Unlevered)',
                        data: results.cashFlows,
                        borderColor: 'rgb(54, 162, 235)', // Blue
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        borderWidth: 2,
                        tension: 0.1,
                        fill: false,
                        type: 'line',
                        order: 1
                    },
                    {
                        label: 'Fixed Cost',
                        data: results.details.annualFixedCost,
                        backgroundColor: 'rgba(255, 159, 64, 0.6)', // Orange
                        borderColor: 'rgba(255, 159, 64, 1)',
                        borderWidth: 1,
                        type: 'bar',
                        stack: 'costs',
                        order: 2
                    },
                    {
                        label: 'Variable Cost',
                        data: results.details.annualVariableCost,
                        backgroundColor: 'rgba(153, 102, 255, 0.6)', // Purple
                        borderColor: 'rgba(153, 102, 255, 1)',
                        borderWidth: 1,
                        type: 'bar',
                        stack: 'costs',
                        order: 2
                    },
                    {
                        label: 'Finance Cost',
                        data: results.details.annualFinanceCost,
                        backgroundColor: 'rgba(201, 203, 207, 0.6)', // Grey
                        borderColor: 'rgba(201, 203, 207, 1)',
                        borderWidth: 1,
                        type: 'bar',
                        stack: 'costs',
                        order: 2
                    },
                    {
                        label: 'Cumulative Cash Flow',
                        data: results.cumulativeCashFlows,
                        borderColor: 'rgb(255, 99, 132)', // Red
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        tension: 0.1,
                        fill: false, // Changed to false to avoid overwhelming
                        type: 'line',
                        order: 0 // On Top
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#333'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += this.formatCurrency(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: false, // Allow negatives for CF
                        grid: {
                            color: '#e0e0e0'
                        },
                        ticks: {
                            color: '#333',
                            callback: (value) => {
                                if (Math.abs(value) >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                                return value;
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#333'
                        }
                    }
                }
            }
        });
    }

    formatCurrency(value) {
        if (Math.abs(value) >= 1000000) {
            return (value / 1000000).toLocaleString('th-TH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }) + ' M THB';
        }
        return new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB',
            maximumFractionDigits: 0
        }).format(value);
    }
}

window.dashboardApp = new DashboardManager();
