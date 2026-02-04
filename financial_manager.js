class FinancialManager {
    constructor() {
        this.container = document.getElementById('content-area');
    }

    render(results) {
        if (!results || !results.details) {
            this.container.innerHTML = `
                <div class="placeholder-state">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <h2>No Calculation Data</h2>
                    <p>Please go to Parameters and click Calculate first.</p>
                </div>
            `;
            return;
        }

        // Ensure we have data
        const d = results.details;
        const years = results.inputs.projectYears || 25;

        // Header Row
        let headerHtml = '<th>Item</th>';
        for (let i = 1; i <= years; i++) {
            headerHtml += `<th class="text-center">Year ${i}</th>`;
        }

        // Helper to generate row
        const row = (label, dataArray, isBold = false, isNegative = false) => {
            let html = `<td class="${isBold ? 'fw-bold' : ''}" style="white-space: nowrap;">${label}</td>`;
            for (let i = 1; i <= years; i++) {
                const val = dataArray[i] || 0;
                let displayVal = this.formatNumber(val);
                if (isNegative && val > 0) displayVal = `(${displayVal})`;
                html += `<td class="text-end ${val < 0 ? 'text-danger' : ''}">${displayVal}</td>`;
            }
            return `<tr>${html}</tr>`;
        };

        const tableHtml = `
            <div class="dashboard-container">
                <div class="action-bar-top">
                    <!-- Navigation handled by sidebar, but we can add export here specifically for this table later -->
                    <h2 class="result-title">Detailed Financial Statement</h2>
                    <button class="btn btn-secondary" onclick="window.print()">
                        <i class="fa-solid fa-print"></i> Print
                    </button>
                </div>

                <div class="card full-width" style="overflow-x: auto;">
                    <table class="report-table" style="min-width: 1200px; font-size: 0.9rem;">
                        <thead>
                            <tr class="table-header">
                                ${headerHtml}
                            </tr>
                        </thead>
                        <tbody>
                            ${row('Revenue', d.annualRevenue, true)}
                            ${row('(-) OPEX', d.annualOpex, false, true)}
                            ${this.generateItemizedOpexRows(d, years, row)}
                            <tr class="table-header" style="background:#f0f0f0;">
                                <td class="fw-bold">EBITDA</td>
                                ${this.generateRowCells(d.annualEbitda)}
                            </tr>
                            ${row('(-) Depreciation', d.annualDepreciation, false, true)}
                            <tr class="table-header" style="background:#f0f0f0;">
                                <td class="fw-bold">EBIT</td>
                                ${this.generateRowCells(d.annualEbit)}
                            </tr>
                            ${row('(-) Interest Expense', d.annualInterest, false, true)}
                            <tr style="border-top: 1px solid #ddd;">
                                <td class="fw-bold">EBT</td>
                                ${this.generateRowCells(d.annualEbit.map((v, i) => v - (d.annualInterest[i] || 0)))} <!-- Recalc for safety or use computed array if added -->
                            </tr>
                            ${row('(-) Corporate Tax', d.annualTax, false, true)}
                            <tr class="table-header" style="background:#e6fffa; color: #000;">
                                <td class="fw-bold">Net Income</td>
                                ${this.generateRowCells(d.annualNetIncome)}
                            </tr>
                            <tr><td colspan="${years + 1}" style="height:20px;"></td></tr>
                            
                             <tr class="table-header" style="background:#f0f0f0;">
                                <td class="fw-bold">Cash Flow Adjustment</td>
                                <td colspan="${years}"></td>
                            </tr>
                            ${row('(+) Depreciation', d.annualDepreciation)}
                            ${row('(-) Principal Repayment', d.annualPrincipal, false, true)}
                            
                            <tr class="table-header" style="background:#e6fffa; border-top: 2px solid #107c41;">
                                <td class="fw-bold" style="color:#107c41;">Equity Cash Flow</td>
                                ${this.generateRowCells(results.equityCashFlows)}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        this.container.innerHTML = tableHtml;
    }

    generateRowCells(dataArray) {
        // Assumes dataArray is 0-indexed where index 0 is year 0 (which we compare or skip depending on requirements)
        // Here we render index 1 to End
        let html = '';
        for (let i = 1; i < dataArray.length; i++) {
            html += `<td class="text-end fw-bold">${this.formatNumber(dataArray[i])}</td>`;
        }
        return html;
    }

    generateItemizedOpexRows(details, years, rowHelper) {
        if (!details.annualItemizedOpex) return '';

        // 1. Get all unique item names
        const itemNames = new Set();
        details.annualItemizedOpex.forEach(yearObj => {
            if (yearObj) {
                Object.keys(yearObj).forEach(k => itemNames.add(k));
            }
        });

        // 2. Generate rows
        let html = '';
        itemNames.forEach(name => {
            // Build data array for this item
            const dataArray = new Array(years + 1).fill(0);
            for (let i = 1; i <= years; i++) {
                if (details.annualItemizedOpex[i] && details.annualItemizedOpex[i][name]) {
                    dataArray[i] = details.annualItemizedOpex[i][name];
                }
            }
            // Use rowHelper to format. Indent name.
            // Pass isNegative=true to show (val)
            html += rowHelper(`&nbsp;&nbsp;&nbsp;- ${name}`, dataArray, false, true);
        });
        return html;
    }

    formatNumber(val) {
        // ALWAYS display in Millions with 2 decimal places
        return (val / 1000000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
}

window.financialApp = new FinancialManager();
