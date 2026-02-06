class TestRunner {
    constructor() {
        this.results = [];
    }

    async runAll() {
        console.clear();
        console.log("%c🚀 Starting System Verification...", "color: blue; font-weight: bold; font-size: 14px;");
        this.results = [];

        try {
            this.testBaselineLogic();
            this.testLeverageEffect();
            this.testTaxationLogic();
            this.testTaxHolidayLogic();
            this.testAdderLogic();
            this.testDataPersistence();

            this.report();
        } catch (e) {
            console.error("Critical Test Error:", e);
        }
    }

    // --- Helper Assertion ---
    assert(condition, message) {
        const status = condition ? "PASS" : "FAIL";
        const icon = condition ? "✅" : "❌";
        this.results.push({ status, message });
        console.log(`${icon} [${status}] ${message}`);
    }

    // --- Test Cases ---

    testBaselineLogic() {
        console.log("--- Testing Baseline (No Debt) ---");
        // Mock Input: 100% Equity
        const inputs = this.getMockInputs();
        inputs.finance.debtRatio = 0;

        const res = window.inputApps.calculate(inputs, true); // isSimulation = true

        this.assert(Math.abs(res.irr - res.irrEquity) < 0.01, "Project IRR should equal Equity IRR when Debt is 0%");
        this.assert(res.equityCashFlows[0] === res.cashFlows[0], "Equity Investment should equal Total Capex (No Debt)");
    }

    testLeverageEffect() {
        console.log("--- Testing Leverage Effect (High Debt) ---");
        const inputs = this.getMockInputs();
        inputs.finance.debtRatio = 80; // High Debt
        inputs.finance.interestRate = 2; // Low Interest

        const res = window.inputApps.calculate(inputs, true);

        // With low interest and positive NPV, Equity IRR should skyrocket
        this.assert(res.irrEquity > res.irr, `Equity IRR (${res.irrEquity.toFixed(2)}%) should be > Project IRR (${res.irr.toFixed(2)}%) with cheap debt`);

        // Check Loan Balance at end of term
        const loanTerm = inputs.finance.loanTerm;
        const details = res.details;
        // We don't expose loan balance array directly in results yet, but we can infer from Interest??
        // Or check Principal Repayment Sum approx equals Loan Amount?
        const totalPrincipalPaid = details.annualPrincipal.reduce((a, b) => a + b, 0);
        const loanAmount = (inputs.capex.construction + inputs.capex.machinery + inputs.capex.land) * 0.8;

        this.assert(Math.abs(totalPrincipalPaid - loanAmount) < 100, "Total Principal Repaid should match Loan Amount");
    }

    testTaxationLogic() {
        console.log("--- Testing Taxation ---");
        const inputs = this.getMockInputs();
        inputs.finance.taxRate = 20;

        const res = window.inputApps.calculate(inputs, true);

        // Pick a Year (e.g., Year 5)
        const ebit = res.details.annualEbit[5];
        const interest = res.details.annualInterest[5];
        const ebt = ebit - interest;
        const expectedTax = ebt > 0 ? ebt * 0.2 : 0;
        const actualTax = res.details.annualTax[5];

        this.assert(Math.abs(expectedTax - actualTax) < 1, `Tax Calculation Year 5: Expected ${expectedTax.toFixed(0)}, Got ${actualTax.toFixed(0)}`);
    }

    testDataPersistence() {
        console.log("--- Testing Persistence (Mock) ---");
        const originalInputs = window.inputApps.getInputs();
        const testVal = 999;

        // 1. Modify
        const modifiedState = JSON.parse(JSON.stringify(originalInputs));
        modifiedState.capacity = testVal;

        // 2. Save
        StorageManager.saveProject({ inputs: modifiedState });

        // 3. Load
        const loaded = StorageManager.loadLatestProject();
        this.assert(loaded.inputs.capacity === testVal, "StorageManager should return the saved capacity value");

        // Restore original to avoid messing up user session too much
        // (In real app, we might mock StorageManager, but here we just revert)
        StorageManager.saveProject({ inputs: originalInputs });
    }

    report() {
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const total = this.results.length;
        const msg = `System Verification Complete: ${passed}/${total} Passed`;

        alert(msg + "\n(Check Console F12 for details)");
    }

    getMockInputs() {
        // Return a standard safe input set
        return {
            capacity: 10,
            projectYears: 20,
            powerFactor: 0.9,
            hoursPerDay: 24,
            revenue: { peakRate: 4, peakHours: 12, offPeakRate: 2, escalation: 0 },
            capex: { construction: 20000000, machinery: 30000000, land: 10000000 }, // Total 60M
            finance: { debtRatio: 50, interestRate: 5, loanTerm: 10, taxRate: 0, opexInflation: 0 },
            opex: [{ name: 'Fixed', type: 'fixed', value: 500000, frequency: 1 }]
        };
    }
    testAdderLogic() {
        console.log("--- Testing Adder Tariff ---");
        const inputs = this.getMockInputs();
        inputs.revenue.adderPrice = 1.0; // 1 THB Adder
        inputs.revenue.adderYears = 7;   // 7 Years
        inputs.revenue.escalation = 0;   // Simplify check

        const res = window.inputApps.calculate(inputs, true);

        const energyPerYear = (inputs.capacity * 1000) * (inputs.hoursPerDay * inputs.powerFactor) * 365;
        // Approximation logic check

        // Year 1 Revenue should include Adder
        const baseRev = res.details.annualRevenue[1];
        // We know base mock revenue. 
        // Actually, easiest way is to compare with Year 8 (post-adder)

        const revYear7 = res.details.annualRevenue[7];
        const revYear8 = res.details.annualRevenue[8];

        this.assert(revYear7 > revYear8, `Year 7 Revenue (${revYear7.toFixed(0)}) should be > Year 8 (${revYear8.toFixed(0)}) due to Adder`);

        const diff = revYear7 - revYear8;
        const expectedAdderRev = energyPerYear * 1.0;

        this.assert(Math.abs(diff - expectedAdderRev) < 100, `Revenue Drop should approx equal Adder Revenue (Expected ~${expectedAdderRev.toFixed(0)}, Got ~${diff.toFixed(0)})`);
    }

    testTaxHolidayLogic() {
        console.log("--- Testing Tax Holiday (BOI) ---");
        const inputs = this.getMockInputs();
        inputs.finance.taxRate = 20;
        inputs.finance.taxHoliday = 8; // 8 Years Exemption

        const res = window.inputApps.calculate(inputs, true);

        // Year 1-8 Tax should be 0
        let taxDuringHoliday = 0;
        for (let i = 1; i <= 8; i++) {
            taxDuringHoliday += res.details.annualTax[i];
        }
        this.assert(taxDuringHoliday === 0, "Total Tax during 8-year holiday should be 0");

        // Year 9 Tax should be > 0 (assuming profit)
        const year9Tax = res.details.annualTax[9];
        this.assert(year9Tax > 0, `Year 9 Tax should be > 0 (Got: ${year9Tax.toFixed(2)})`);
    }
}
window.TestRunner = new TestRunner();
